import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ministerioDeRol, esRolKids, registraSinAprobacion } from '@/lib/roles';

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

  // Los dados de baja se excluyen ACÁ y no en cada pantalla. Antes solo la
  // lista de Miembros los filtraba, así que un retirado seguía apareciendo
  // cada domingo para marcar asistencia y seguía sumando en los KPIs y
  // gráficos del Pastor — "no desaparecía del mapa". Filtrando en el origen
  // ninguna pantalla puede olvidarse de hacerlo.
  const { data: retiros, error: errRetiros } = await db.from('retiros').select('persona_id');
  if (errRetiros) return NextResponse.json({ error: errRetiros.message }, { status: 500 });
  const retirados = new Set((retiros ?? []).map((r) => Number(r.persona_id)));

  // ?incluirRetirados=1 los trae igual, marcados con `retirado: true`. Lo usa
  // la pantalla de Retiros, que justamente necesita verlos.
  if (searchParams.get('incluirRetirados')) {
    return NextResponse.json({
      personas: (data ?? []).map((p) => ({ ...p, retirado: retirados.has(Number(p.id)) })),
    });
  }

  // ?soloPendientes=1 devuelve únicamente lo que llegó por el formulario
  // público y espera aprobación. Lo usa la pestaña Pendientes de Miembros.
  if (searchParams.get('soloPendientes')) {
    return NextResponse.json({
      personas: (data ?? []).filter((p) => p.pendiente_revision),
    });
  }

  // Por defecto salen los ACTIVOS: ni dados de baja ni pendientes de aprobar.
  // Filtrar acá y no en cada pantalla es lo que garantiza que un auto-registro
  // sin revisar no se cuele en la asistencia del domingo ni en los KPIs.
  return NextResponse.json({
    personas: (data ?? []).filter(
      (p) => !retirados.has(Number(p.id)) && !p.pendiente_revision,
    ),
  });
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

  // Toda ficha nueva nace PENDIENTE de autorización, salvo las que registra
  // Secretaría (que es justamente quien autoriza — no se aprueba a sí misma).
  //
  // Antes solo el formulario público quedaba pendiente y lo que registraban
  // los ministerios entraba directo al padrón. Ese era el hueco por donde se
  // colaban los duplicados: la misma persona podía entrar por dos caminos sin
  // que nadie los cruzara. Ahora hay un solo punto de control.
  //
  // Las VISITAS no pasan por acá: viven en `miembros_nuevos` y su autorización
  // ocurre recién al convertirlas en miembro.
  const fila = registraSinAprobacion(session.role)
    ? row
    : { ...row, pendiente_revision: true, origen: 'intranet' };

  const { error } = await getSupabaseAdmin().from('personas').insert(fila);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Se avisa a la pantalla si quedó esperando, para que el mensaje de éxito
  // no diga "registrado" cuando en realidad todavía no aparece en el padrón.
  return NextResponse.json({
    ok: true,
    pendiente: !registraSinAprobacion(session.role),
  });
}
