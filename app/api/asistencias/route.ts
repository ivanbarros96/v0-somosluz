import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

interface Body {
  cultoId?: number | string;
  personaId?: number | string;
  miembroNuevoId?: number | string;
}

// POST /api/asistencias — marcar presente
export async function POST(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { cultoId, personaId, miembroNuevoId }: Body = await req.json().catch(() => ({}));
  if (!cultoId || (!personaId && !miembroNuevoId)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
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
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { cultoId, personaId, miembroNuevoId }: Body = await req.json().catch(() => ({}));
  if (!cultoId || (!personaId && !miembroNuevoId)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
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
