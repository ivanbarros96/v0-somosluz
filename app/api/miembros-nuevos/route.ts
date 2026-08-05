import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ministerioDeRol } from '@/lib/roles';

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

    const { data, error } = await db
      .from('miembros_nuevos')
      .select('id')
      .ilike('nombre', termino)
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ existe: !!data });
  }

  const { data, error } = await db
    .from('miembros_nuevos')
    .select('id, nombre, telefono')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ miembrosNuevos: data ?? [] });
}

// POST /api/miembros-nuevos — registro de visitante/miembro nuevo. Reservado
// a Somos Luz: es quien toma la asistencia dominical general, único culto
// donde entran visitantes. Pastor no registra; los ministerios (Amadas,
// Hombría, Discipulado, Youth) solo registran su propia audiencia ya
// existente, sin pestaña "Nuevo" — ver components/intranet/member-form.tsx.
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (session.role === 'pastor' || ministerioDeRol(session.role) !== null) {
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
