import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// PATCH /api/personas/[id] — actualizar persona
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const row = await req.json().catch(() => null);
  if (!row || typeof row !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('personas').update(row).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/personas/[id] — eliminar persona.
// El perfil operativo (somosluz) debe enviar la clave del pastor en el body.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  if (session.role !== 'pastor') {
    const { password } = await req.json().catch(() => ({ password: '' }));
    if (!password || password !== process.env.PASTOR_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña del pastor incorrecta.' }, { status: 403 });
    }
  }

  const { error } = await getSupabaseAdmin().from('personas').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
