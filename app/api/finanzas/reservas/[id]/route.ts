import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reservasConSaldo } from '@/lib/finanzas-reservas';

// PATCH /api/finanzas/reservas/[id] — renombrar y/o archivar/desarchivar
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ('nombre' in body) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
      return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
    }
    patch.nombre = body.nombre.trim();
  }
  if ('archivada' in body) {
    patch.archivada = !!body.archivada;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('finanzas_reservas').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/finanzas/reservas/[id] — solo si su saldo es 0 (si tiene plata
// hay que retirarla primero; borrar no debe hacer "desaparecer" dinero).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const idNum = Number(id);

  const reservas = await reservasConSaldo();
  const reserva = reservas.find((r) => r.id === idNum);
  if (!reserva) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  if (reserva.saldo !== 0) {
    return NextResponse.json(
      { error: 'Esta reserva tiene saldo. Retira el dinero antes de eliminarla.' },
      { status: 400 },
    );
  }

  const { error } = await getSupabaseAdmin().from('finanzas_reservas').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
