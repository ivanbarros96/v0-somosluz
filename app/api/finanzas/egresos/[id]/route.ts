import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esCategoriaEgreso } from '@/lib/finanzas';

// PATCH /api/finanzas/egresos/[id] — editar un egreso (solo pastor).
// No permite reemplazar la foto del comprobante en esta versión — solo
// campos de texto/monto. Para cambiar la foto, eliminar y volver a crear.
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
  if ('detalle' in body) {
    if (typeof body.detalle !== 'string' || !body.detalle.trim()) {
      return NextResponse.json({ error: 'Detalle inválido' }, { status: 400 });
    }
    patch.detalle = body.detalle.trim();
  }
  if ('monto' in body) {
    if (!(Number(body.monto) > 0)) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }
    patch.monto = Number(body.monto);
  }
  if ('categoria' in body) {
    const c = body.categoria;
    if (c && !esCategoriaEgreso(c)) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    }
    patch.categoria = c || null;
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

  const { error } = await getSupabaseAdmin().from('finanzas_egresos').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/finanzas/egresos/[id] — elimina el registro y su comprobante en Storage
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: egreso } = await db
    .from('finanzas_egresos')
    .select('comprobante_path')
    .eq('id', id)
    .single();

  const { error } = await db.from('finanzas_egresos').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (egreso?.comprobante_path) {
    await db.storage.from('comprobantes').remove([egreso.comprobante_path]);
  }

  return NextResponse.json({ ok: true });
}
