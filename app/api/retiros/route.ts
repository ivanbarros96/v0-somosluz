import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// POST /api/retiros — registrar retiro de una persona
export async function POST(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { persona_id, nombre, motivo, observaciones } = await req.json().catch(() => ({}));
  if (!persona_id || !nombre || !motivo) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('retiros').insert({
    persona_id,
    nombre,
    motivo,
    observaciones: observaciones || null,
    fecha_retiro: new Date().toISOString().split('T')[0],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
