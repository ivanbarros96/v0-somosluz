import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ministerioDeRol, esRolKids } from '@/lib/roles';

// GET /api/personas — lectura de personas. Requiere sesión.
//
// Antes el cliente leía esta tabla directamente con la anon key, que viaja al
// navegador: cualquiera podía extraer la ficha completa de la congregación
// (teléfonos, direcciones, datos de apoderados de menores). Ahora la lectura
// pasa por aquí, con service_role y sesión validada.
//
// Modos:
//   ?nombreExacto=X[&excluirId=N] → { existe: boolean }  (chequeo de duplicados)
//   ?buscar=X[&tipo=adulto]       → { personas: [{id, nombre, telefono}] }  (autocompletar)
//   (sin parámetros)              → { personas: [fila completa, ...] }
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const db = getSupabaseAdmin();

  const nombreExacto = searchParams.get('nombreExacto');
  if (nombreExacto !== null) {
    const termino = nombreExacto.trim();
    if (!termino) return NextResponse.json({ existe: false });

    let query = db.from('personas').select('id').ilike('nombre', termino);
    const excluirId = searchParams.get('excluirId');
    if (excluirId) query = query.neq('id', excluirId);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ existe: !!data });
  }

  const buscar = searchParams.get('buscar');
  if (buscar !== null) {
    const termino = buscar.trim();
    if (!termino) return NextResponse.json({ personas: [] });

    let query = db.from('personas').select('id, nombre, telefono').ilike('nombre', `%${termino}%`);
    const tipo = searchParams.get('tipo');
    if (tipo) query = query.eq('source_tipo', tipo);

    const { data, error } = await query.order('nombre').limit(8);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ personas: data ?? [] });
  }

  // Se lee de la VISTA, no de la tabla: personas.edad es un entero fijado al
  // registrar y estaba desactualizado en 24 de 71 filas (hasta 2 años). La
  // vista calcula `edad` al vuelo desde fecha_nac. Los INSERT/UPDATE siguen
  // yendo a la tabla `personas` (una vista no es escribible aquí).
  const { data, error } = await db
    .from('personas_con_edad')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ personas: data ?? [] });
}

// POST /api/personas — crear persona (adulto/niño/joven)
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // El Pastor no registra miembros — solo ve/edita desde Miembros.
  if (session.role === 'pastor') {
    return NextResponse.json({ error: 'El perfil Pastor no registra miembros.' }, { status: 403 });
  }
  // Kids solo toma asistencia; el registro lo hace Somos Luz.
  if (esRolKids(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no registra miembros.' }, { status: 403 });
  }

  const row = await req.json().catch(() => null);
  if (!row || typeof row !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Espejo de las pestañas permitidas en components/intranet/member-form.tsx:
  // Youth solo registra Youth; Amadas/Hombría/Discipulado solo adulto/niño.
  const ministerio = ministerioDeRol(session.role);
  const sourceTipo = (row as { source_tipo?: unknown }).source_tipo;
  if (ministerio === 'youth' && sourceTipo !== 'joven') {
    return NextResponse.json({ error: 'Tu perfil solo puede registrar Youth' }, { status: 403 });
  }
  if (
    (ministerio === 'mujeres' || ministerio === 'hombres' || ministerio === 'discipulado') &&
    sourceTipo !== 'adulto' && sourceTipo !== 'nino'
  ) {
    return NextResponse.json({ error: 'Tu perfil solo puede registrar Adulto o Niño' }, { status: 403 });
  }

  const { error } = await getSupabaseAdmin().from('personas').insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
