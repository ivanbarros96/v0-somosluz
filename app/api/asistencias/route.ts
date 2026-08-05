import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ministerioDeRol } from '@/lib/roles';

interface Body {
  cultoId?: number | string;
  personaId?: number | string;
  miembroNuevoId?: number | string;
}

// Un rol de ministerio solo puede marcar asistencia en cultos de su tipo
async function cultoFueraDeAlcance(role: string, cultoId: number | string): Promise<boolean> {
  const ministerio = ministerioDeRol(role);
  if (!ministerio) return false;
  const { data } = await getSupabaseAdmin().from('cultos').select('tipo').eq('id', cultoId).single();
  return !data || data.tipo !== ministerio;
}

// GET /api/asistencias — lectura de asistencias. Requiere sesión.
// Sustituye la lectura directa con anon key (ver GET /api/personas).
//   ?cultoId=N       → { asistencias: [{persona_id, miembro_nuevo_id}] } de ese culto
//   ?conFechaCulto=1 → { asistencias: [{persona_id, cultos: {fecha}}] } (solo personas)
//   (sin parámetros) → { asistencias: [{culto_id, persona_id, miembro_nuevo_id}] }
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const db = getSupabaseAdmin();

  const cultoId = searchParams.get('cultoId');
  if (cultoId) {
    const { data, error } = await db
      .from('asistencias')
      .select('persona_id, miembro_nuevo_id')
      .eq('culto_id', cultoId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ asistencias: data ?? [] });
  }

  if (searchParams.get('conFechaCulto')) {
    const { data, error } = await db
      .from('asistencias')
      .select('persona_id, cultos(fecha)')
      .not('persona_id', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ asistencias: data ?? [] });
  }

  const { data, error } = await db
    .from('asistencias')
    .select('culto_id, persona_id, miembro_nuevo_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asistencias: data ?? [] });
}

// POST /api/asistencias — marcar presente
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { cultoId, personaId, miembroNuevoId }: Body = await req.json().catch(() => ({}));
  if (!cultoId || (!personaId && !miembroNuevoId)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  if (await cultoFueraDeAlcance(session.role, cultoId)) {
    return NextResponse.json({ error: 'Este culto no pertenece a tu ministerio' }, { status: 403 });
  }

  const row: Record<string, unknown> = { culto_id: cultoId, fecha_registro: new Date().toISOString() };
  if (miembroNuevoId) row.miembro_nuevo_id = miembroNuevoId;
  else row.persona_id = personaId;

  const { error } = await getSupabaseAdmin().from('asistencias').insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/asistencias — desmarcar presente
export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { cultoId, personaId, miembroNuevoId }: Body = await req.json().catch(() => ({}));
  if (!cultoId || (!personaId && !miembroNuevoId)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  if (await cultoFueraDeAlcance(session.role, cultoId)) {
    return NextResponse.json({ error: 'Este culto no pertenece a tu ministerio' }, { status: 403 });
  }

  let query = getSupabaseAdmin().from('asistencias').delete().eq('culto_id', cultoId);
  query = miembroNuevoId
    ? query.eq('miembro_nuevo_id', miembroNuevoId)
    : query.eq('persona_id', personaId!);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
