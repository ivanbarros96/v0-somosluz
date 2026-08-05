import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reservasConSaldo, saldoGeneralHistorico, totalReservado } from '@/lib/finanzas-reservas';

// GET /api/finanzas/reservas/[id]/movimientos — historial de depósitos y
// retiros de una reserva puntual.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('finanzas_reservas_movimientos')
    .select('id, fecha, tipo, monto, notas, created_at')
    .eq('reserva_id', id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimientos: data ?? [] });
}

// POST /api/finanzas/reservas/[id]/movimientos — depositar o retirar.
// Un depósito nunca puede superar lo que hay disponible fuera de toda
// reserva (saldo general histórico - lo ya reservado en cualquier reserva).
// Un retiro nunca puede superar el saldo de ESA reserva puntual.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const idNum = Number(id);
  const { tipo, monto: montoRaw, fecha, notas } = await req.json().catch(() => ({}));

  if (tipo !== 'deposito' && tipo !== 'retiro') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }
  const monto = Number(montoRaw);
  if (!(monto > 0)) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }
  const fechaFinal = typeof fecha === 'string' && fecha ? fecha : new Date().toISOString().slice(0, 10);

  const reservas = await reservasConSaldo();
  const reserva = reservas.find((r) => r.id === idNum);
  if (!reserva) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  if (tipo === 'deposito') {
    if (reserva.archivada) {
      return NextResponse.json(
        { error: 'Esta reserva está archivada. Desarchívala antes de depositar.' },
        { status: 400 },
      );
    }
    const saldoGeneral = await saldoGeneralHistorico();
    const disponible = saldoGeneral - totalReservado(reservas);
    if (monto > disponible) {
      return NextResponse.json(
        { error: `Solo hay ${disponible.toLocaleString('es-CL')} disponible para reservar.` },
        { status: 400 },
      );
    }
  } else {
    if (monto > reserva.saldo) {
      return NextResponse.json(
        { error: `Esta reserva solo tiene ${reserva.saldo.toLocaleString('es-CL')} guardado.` },
        { status: 400 },
      );
    }
  }

  const { data, error } = await getSupabaseAdmin()
    .from('finanzas_reservas_movimientos')
    .insert({
      reserva_id: idNum,
      tipo,
      monto,
      fecha: fechaFinal,
      notas: typeof notas === 'string' && notas.trim() ? notas.trim() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movimiento: data });
}
