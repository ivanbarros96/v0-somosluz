// ⚠️ SOLO servidor. Usa getSupabaseAdmin() (service role) — nunca importar
// este archivo desde un componente 'use client'. Lógica compartida entre
// /api/finanzas/movimientos y /api/finanzas/exportar para no duplicar el
// cálculo del saldo corrido.

import { getSupabaseAdmin } from './supabase-admin';
import { rangoMes, LABEL_TIPO_INGRESO, type TipoIngreso, type CategoriaEgreso } from './finanzas';

export interface MovimientoCalculado {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  detalle: string;
  categoria?: CategoriaEgreso | null;
  personaNombre?: string | null;
  monto: number;
  saldo: number;
  comprobante_path?: string | null;
}

interface MovBase {
  id: string;
  fecha: string;
  created_at: string;
  tipo: 'ingreso' | 'egreso';
  detalle: string;
  categoria?: CategoriaEgreso | null;
  personaNombre?: string | null;
  monto: number;
  comprobante_path?: string | null;
}

// Calcula el historial combinado (ingresos + egresos) con saldo corrido
// histórico — el saldo SIEMPRE se calcula sobre el historial completo; el
// filtro de mes solo acota qué filas se devuelven, nunca reinicia el cálculo.
// Devuelve en orden cronológico ascendente (el llamador decide si invertir).
export async function calcularMovimientos(mesParam: string | null): Promise<MovimientoCalculado[]> {
  const db = getSupabaseAdmin();

  const [{ data: ingresos, error: errIng }, { data: egresos, error: errEgr }] = await Promise.all([
    db
      .from('finanzas_ingresos')
      .select('id, fecha, tipo, monto, notas, persona_nombre, created_at')
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true }),
    db
      .from('finanzas_egresos')
      .select('id, fecha, detalle, monto, categoria, persona_nombre, comprobante_path, created_at')
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (errIng) throw new Error(errIng.message);
  if (errEgr) throw new Error(errEgr.message);

  const combinado: MovBase[] = [
    ...(ingresos ?? []).map((i) => ({
      id: `ingreso-${i.id}`,
      fecha: i.fecha,
      created_at: i.created_at,
      tipo: 'ingreso' as const,
      detalle: i.notas
        ? `${LABEL_TIPO_INGRESO[i.tipo as TipoIngreso]} — ${i.notas}`
        : LABEL_TIPO_INGRESO[i.tipo as TipoIngreso],
      personaNombre: i.persona_nombre ?? null,
      monto: Number(i.monto),
    })),
    ...(egresos ?? []).map((e) => ({
      id: `egreso-${e.id}`,
      fecha: e.fecha,
      created_at: e.created_at,
      tipo: 'egreso' as const,
      detalle: e.detalle,
      categoria: (e.categoria ?? null) as CategoriaEgreso | null,
      personaNombre: e.persona_nombre ?? null,
      monto: Number(e.monto),
      comprobante_path: e.comprobante_path,
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at));

  let saldo = 0;
  const conSaldo: MovimientoCalculado[] = combinado.map((m) => {
    saldo += m.tipo === 'ingreso' ? m.monto : -m.monto;
    return {
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      detalle: m.detalle,
      categoria: m.categoria ?? null,
      personaNombre: m.personaNombre ?? null,
      monto: m.monto,
      saldo,
      comprobante_path: m.comprobante_path ?? null,
    };
  });

  if (mesParam === 'general') return conSaldo;

  const { desde, hasta } = rangoMes(mesParam);
  return conSaldo.filter((m) => m.fecha >= desde && m.fecha < hasta);
}
