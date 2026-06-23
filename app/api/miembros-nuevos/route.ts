import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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
