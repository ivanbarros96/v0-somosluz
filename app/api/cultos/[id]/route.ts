import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ministerioDeRol } from '@/lib/roles';

// Un rol de ministerio solo puede tocar cultos de su propio tipo
async function cultoFueraDeAlcance(role: string, cultoId: string): Promise<boolean> {
  const ministerio = ministerioDeRol(role);
  if (!ministerio) return false;
  const { data } = await getSupabaseAdmin().from('cultos').select('tipo').eq('id', cultoId).single();
  return !data || data.tipo !== ministerio;
}

// PATCH /api/cultos/[id] — actualizar culto (ej. cerrar: activo=false)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (await cultoFueraDeAlcance(session.role, id)) {
    return NextResponse.json({ error: 'Este culto no pertenece a tu ministerio' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Solo permitimos alternar 'activo' por ahora.
  const patch: Record<string, unknown> = {};
  if ('activo' in body) patch.activo = !!body.activo;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('cultos').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/cultos/[id] — eliminar culto (y sus asistencias en cascada si RLS lo permite).
// Operativo debe enviar clave del pastor.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (await cultoFueraDeAlcance(session.role, id)) {
    return NextResponse.json({ error: 'Este culto no pertenece a tu ministerio' }, { status: 403 });
  }

  if (session.role !== 'pastor') {
    const { password } = await req.json().catch(() => ({ password: '' }));
    if (!password || password !== process.env.PASTOR_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña del pastor incorrecta.' }, { status: 403 });
    }
  }

  const db = getSupabaseAdmin();
  // Eliminar asistencias del culto primero (FK)
  await db.from('asistencias').delete().eq('culto_id', id);
  const { error } = await db.from('cultos').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
