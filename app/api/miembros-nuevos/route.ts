import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esRolKids } from '@/lib/roles';

// GET /api/miembros-nuevos — lectura de visitantes. Requiere sesión.
// Sustituye la lectura directa con anon key (ver GET /api/personas).
//   ?nombreExacto=X → { existe: boolean }
//   (sin parámetros) → { miembrosNuevos: [{id, nombre, telefono}] }
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

    let query = db.from('miembros_nuevos').select('id').ilike('nombre', termino);
    // Al convertir un visitante en miembro hay que excluirlo a sí mismo, o se
    // detectaría como su propio duplicado.
    const excluirId = searchParams.get('excluirId');
    if (excluirId) query = query.neq('id', excluirId);

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ existe: !!data });
  }

  // ?conVisitas=1 agrega cuántas veces vino cada visitante y su última fecha.
  // Sirve para decidir a quién conviene convertir en miembro: alguien con 5
  // visitas ya no es "una visita".
  if (searchParams.get('conVisitas')) {
    const [{ data: visitantes, error: errV }, { data: asistencias, error: errA }] = await Promise.all([
      db.from('miembros_nuevos').select('id, nombre, telefono, email, fecha_registro').order('nombre'),
      db.from('asistencias').select('miembro_nuevo_id, cultos(fecha)').not('miembro_nuevo_id', 'is', null),
    ]);
    if (errV) return NextResponse.json({ error: errV.message }, { status: 500 });
    if (errA) return NextResponse.json({ error: errA.message }, { status: 500 });

    const porVisitante = new Map<number, { visitas: number; ultima: string | null }>();
    for (const a of asistencias ?? []) {
      // El join de Supabase puede llegar como objeto o como arreglo de un
      // elemento según cómo infiera la relación; se normalizan ambos.
      const fila = a as unknown as {
        miembro_nuevo_id: number;
        cultos?: { fecha: string } | { fecha: string }[] | null;
      };
      const id = Number(fila.miembro_nuevo_id);
      const rel = Array.isArray(fila.cultos) ? fila.cultos[0] : fila.cultos;
      const fecha = rel?.fecha ?? null;
      const acc = porVisitante.get(id) ?? { visitas: 0, ultima: null };
      acc.visitas += 1;
      if (fecha && (!acc.ultima || fecha > acc.ultima)) acc.ultima = fecha;
      porVisitante.set(id, acc);
    }

    return NextResponse.json({
      miembrosNuevos: (visitantes ?? []).map((v) => ({
        ...v,
        visitas: porVisitante.get(Number(v.id))?.visitas ?? 0,
        ultimaVisita: porVisitante.get(Number(v.id))?.ultima ?? null,
      })),
    });
  }

  const { data, error } = await db
    .from('miembros_nuevos')
    .select('id, nombre, telefono, email')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ miembrosNuevos: data ?? [] });
}

// POST /api/miembros-nuevos — registro de visitante/miembro nuevo. Puede
// llegar una visita a cualquier reunión (no solo al culto general), así que
// cualquier rol operativo puede registrar — salvo Pastor, que no hace
// registro (ver components/intranet/member-form.tsx).
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (session.role === 'pastor') {
    return NextResponse.json({ error: 'Tu perfil no puede registrar visitantes.' }, { status: 403 });
  }
  // Kids solo toma asistencia; el registro lo hace Somos Luz.
  if (esRolKids(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no puede registrar visitantes.' }, { status: 403 });
  }

  const { nombre, telefono, email } = await req.json().catch(() => ({}));
  if (!nombre) {
    return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('miembros_nuevos').insert({
    nombre,
    telefono: telefono || null,
    email: email || null,
    fecha_registro: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
