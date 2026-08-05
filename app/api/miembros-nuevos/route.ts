import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

// POST /api/miembros-nuevos — registro de visitante/miembro nuevo
export async function POST(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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
