import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// POST /api/cultos — crear culto. Devuelve la fila creada (el cliente la necesita).
export async function POST(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { fecha, descripcion } = await req.json().catch(() => ({}));
  if (!fecha) {
    return NextResponse.json({ error: 'Falta la fecha' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('cultos')
    .insert({ fecha, descripcion, activo: true })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ culto: data });
}
