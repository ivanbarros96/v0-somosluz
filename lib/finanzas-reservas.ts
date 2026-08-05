// ⚠️ SOLO servidor. Usa getSupabaseAdmin() (service role).
//
// Reservas: plata "apartada" del saldo general sin salir de la cuenta real
// de la iglesia — como "Reservado" en Mercado Libre. No modifica
// finanzas_ingresos/finanzas_egresos; es una capa aparte encima del saldo
// que ya existe. Solo se puede depositar hasta lo que quede disponible
// (saldo general histórico menos lo que ya está reservado en cualquier otra
// reserva, archivada o no).

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabase-admin';
import { calcularMovimientos } from './finanzas-movimientos';

export interface ReservaConSaldo {
  id: number;
  nombre: string;
  archivada: boolean;
  created_at: string;
  saldo: number;
}

// Saldo general histórico (ingresos - egresos de siempre) — la misma cifra
// que ya se muestra en Finanzas con el filtro "General (todo el historial)".
export async function saldoGeneralHistorico(): Promise<number> {
  const movimientos = await calcularMovimientos('general');
  if (movimientos.length === 0) return 0;
  return movimientos[movimientos.length - 1].saldo;
}

export async function reservasConSaldo(db: SupabaseClient = getSupabaseAdmin()): Promise<ReservaConSaldo[]> {
  const [{ data: reservas, error: errR }, { data: movs, error: errM }] = await Promise.all([
    db
      .from('finanzas_reservas')
      .select('id, nombre, archivada, created_at')
      .order('created_at', { ascending: true }),
    db.from('finanzas_reservas_movimientos').select('reserva_id, tipo, monto'),
  ]);
  if (errR) throw new Error(errR.message);
  if (errM) throw new Error(errM.message);

  const saldoPorReserva = new Map<number, number>();
  for (const m of movs ?? []) {
    const actual = saldoPorReserva.get(m.reserva_id) ?? 0;
    const delta = m.tipo === 'deposito' ? Number(m.monto) : -Number(m.monto);
    saldoPorReserva.set(m.reserva_id, actual + delta);
  }

  return (reservas ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    archivada: r.archivada,
    created_at: r.created_at,
    saldo: saldoPorReserva.get(r.id) ?? 0,
  }));
}

// Suma de lo que hay guardado en TODAS las reservas (incluidas las
// archivadas: archivar es solo ocultarla de la lista activa, la plata sigue
// apartada hasta que se retire).
export function totalReservado(reservas: ReservaConSaldo[]): number {
  return reservas.reduce((s, r) => s + r.saldo, 0);
}
