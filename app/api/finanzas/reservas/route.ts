import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reservasConSaldo, saldoGeneralHistorico, totalReservado } from '@/lib/finanzas-reservas';

// GET /api/finanzas/reservas — lista de reservas con su saldo, más el
// panorama general (saldo total, reservado, disponible para reservar).
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const reservas = await reservasConSaldo();
    const saldoGeneral = await saldoGeneralHistorico();
    const reservado = totalReservado(reservas);
    return NextResponse.json({
      reservas,
      saldoGeneral,
      totalReservado: reservado,
      disponible: saldoGeneral - reservado,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/finanzas/reservas — crear una reserva nueva {nombre}
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { nombre } = await req.json().catch(() => ({}));
  if (typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'Falta el nombre de la reserva' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: existente } = await db
    .from('finanzas_reservas')
    .select('id')
    .ilike('nombre', nombre.trim())
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ error: 'Ya existe una reserva con ese nombre' }, { status: 400 });
  }

  const { data, error } = await db
    .from('finanzas_reservas')
    .insert({ nombre: nombre.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reserva: { ...data, saldo: 0 } });
}
