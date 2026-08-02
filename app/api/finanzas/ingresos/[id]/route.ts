import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esTipoIngreso } from '@/lib/finanzas';

// PATCH /api/finanzas/ingresos/[id] — editar un ingreso (solo pastor)
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

  if ('fecha' in body) {
    if (!body.fecha) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    patch.fecha = body.fecha;
  }
  if ('tipo' in body) {
    if (!esTipoIngreso(body.tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    patch.tipo = body.tipo;
  }
  if ('monto' in body) {
    if (!(Number(body.monto) > 0)) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }
    patch.monto = Number(body.monto);
  }
  if ('notas' in body) {
    patch.notas = typeof body.notas === 'string' && body.notas.trim() ? body.notas.trim() : null;
  }
  if ('personaNombre' in body) {
    const nombre =
      typeof body.personaNombre === 'string' && body.personaNombre.trim()
        ? body.personaNombre.trim()
        : null;
    patch.persona_nombre = nombre;
    patch.persona_id = nombre && body.personaId ? Number(body.personaId) : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('finanzas_ingresos').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/finanzas/ingresos/[id] — eliminar un ingreso (solo pastor)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from('finanzas_ingresos').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
