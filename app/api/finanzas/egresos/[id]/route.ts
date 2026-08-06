import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esCategoriaEgreso } from '@/lib/finanzas';
import { subirComprobante, MAX_COMPROBANTES_POR_EGRESO } from '@/lib/finanzas-comprobantes';

// PATCH /api/finanzas/egresos/[id] — editar un egreso (solo pastor).
// FormData (no JSON) porque puede venir acompañado de fotos nuevas:
//   fecha, detalle, monto, categoria, categoriaPersonalizada, personaNombre,
//   personaId  → solo se actualiza el campo si viene presente en el form.
//   comprobantesNuevos  → 0 o más File a agregar.
//   eliminarComprobantes → 0 o más ids (de finanzas_egresos_comprobantes) a borrar.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (form.has('fecha')) {
    const fecha = form.get('fecha');
    if (typeof fecha !== 'string' || !fecha) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }
    patch.fecha = fecha;
  }
  if (form.has('detalle')) {
    const detalle = form.get('detalle');
    if (typeof detalle !== 'string' || !detalle.trim()) {
      return NextResponse.json({ error: 'Detalle inválido' }, { status: 400 });
    }
    patch.detalle = detalle.trim();
  }
  if (form.has('monto')) {
    const monto = form.get('monto');
    if (!(Number(monto) > 0)) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }
    patch.monto = Number(monto);
  }
  if (form.has('categoria')) {
    const c = form.get('categoria');
    if (c && typeof c === 'string' && c.trim()) {
      if (!esCategoriaEgreso(c)) {
        return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
      }
      patch.categoria = c;
      if (c === 'otros') {
        const texto = form.get('categoriaPersonalizada');
        if (typeof texto !== 'string' || !texto.trim()) {
          return NextResponse.json({ error: 'Escribe el nombre de la categoría' }, { status: 400 });
        }
        patch.categoria_personalizada = texto.trim();
      } else {
        patch.categoria_personalizada = null;
      }
    } else {
      patch.categoria = null;
      patch.categoria_personalizada = null;
    }
  }
  if (form.has('personaNombre')) {
    const nombreRaw = form.get('personaNombre');
    const nombre = typeof nombreRaw === 'string' && nombreRaw.trim() ? nombreRaw.trim() : null;
    patch.persona_nombre = nombre;
    const personaId = form.get('personaId');
    patch.persona_id = nombre && personaId ? Number(personaId) : null;
  }

  const eliminarIds = form.getAll('eliminarComprobantes').map(String).filter(Boolean);
  const nuevosArchivos = form.getAll('comprobantesNuevos');

  if (Object.keys(patch).length === 0 && eliminarIds.length === 0 && nuevosArchivos.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: existente, error: errExistente } = await db
    .from('finanzas_egresos')
    .select('fecha')
    .eq('id', id)
    .single();
  if (errExistente || !existente) {
    return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 });
  }

  if (nuevosArchivos.length) {
    const { count } = await db
      .from('finanzas_egresos_comprobantes')
      .select('id', { count: 'exact', head: true })
      .eq('egreso_id', id);
    const actuales = count ?? 0;
    const sobrevivientes = actuales - eliminarIds.length;
    if (sobrevivientes + nuevosArchivos.length > MAX_COMPROBANTES_POR_EGRESO) {
      return NextResponse.json(
        { error: `Máximo ${MAX_COMPROBANTES_POR_EGRESO} archivos por egreso` },
        { status: 400 },
      );
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await db.from('finanzas_egresos').update(patch).eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Quitar comprobantes pedidos: primero del storage, después la fila.
  if (eliminarIds.length) {
    const { data: aBorrar } = await db
      .from('finanzas_egresos_comprobantes')
      .select('id, storage_path')
      .eq('egreso_id', id)
      .in('id', eliminarIds);

    if (aBorrar?.length) {
      await db.storage.from('comprobantes').remove(aBorrar.map((c) => c.storage_path));
      await db
        .from('finanzas_egresos_comprobantes')
        .delete()
        .in('id', aBorrar.map((c) => c.id));
    }
  }

  // Agregar fotos nuevas (mismo comportamiento sea "reemplazar" — borrar la
  // vieja y subir otra — o simplemente sumar más fotos al mismo egreso).
  if (nuevosArchivos.length) {
    const fechaPath = (patch.fecha as string | undefined) ?? existente.fecha;
    let paths: (string | null)[];
    try {
      paths = await Promise.all(nuevosArchivos.map((f) => subirComprobante(db, f, fechaPath)));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    const pathsValidos = paths.filter((p): p is string => !!p);
    if (pathsValidos.length) {
      const { error: errComp } = await db
        .from('finanzas_egresos_comprobantes')
        .insert(pathsValidos.map((storage_path) => ({ egreso_id: Number(id), storage_path })));
      if (errComp) {
        return NextResponse.json({ error: errComp.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/finanzas/egresos/[id] — elimina el registro y sus comprobantes en Storage
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: comprobantes } = await db
    .from('finanzas_egresos_comprobantes')
    .select('storage_path')
    .eq('egreso_id', id);

  const { error } = await db.from('finanzas_egresos').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // La fila de finanzas_egresos_comprobantes se borra sola (ON DELETE CASCADE),
  // pero el objeto en Storage no — hay que borrarlo explícitamente.
  if (comprobantes?.length) {
    await db.storage.from('comprobantes').remove(comprobantes.map((c) => c.storage_path));
  }

  return NextResponse.json({ ok: true });
}
