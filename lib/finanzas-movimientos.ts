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
  categoriaPersonalizada?: string | null;
  personaNombre?: string | null;
  monto: number;
  saldo: number;
  comprobantesPaths?: string[];
}

interface MovBase {
  id: string;
  fecha: string;
  created_at: string;
  tipo: 'ingreso' | 'egreso';
  detalle: string;
  categoria?: CategoriaEgreso | null;
  categoriaPersonalizada?: string | null;
  personaNombre?: string | null;
  monto: number;
  comprobantesPaths?: string[];
}

// Calcula el historial combinado (ingresos + egresos) con saldo corrido
// histórico — el saldo SIEMPRE se calcula sobre el historial completo; el
// filtro de mes solo acota qué filas se devuelven, nunca reinicia el cálculo.
// Devuelve en orden cronológico ascendente (el llamador decide si invertir).
export async function calcularMovimientos(mesParam: string | null): Promise<MovimientoCalculado[]> {
  const db = getSupabaseAdmin();

  const [{ data: ingresos, error: errIng }, { data: egresos, error: errEgr }, { data: comprobantes, error: errComp }] =
    await Promise.all([
      db
        .from('finanzas_ingresos')
        .select('id, fecha, tipo, monto, notas, persona_nombre, created_at')
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true }),
      db
        .from('finanzas_egresos')
        .select('id, fecha, detalle, monto, categoria, categoria_personalizada, persona_nombre, created_at')
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true }),
      db.from('finanzas_egresos_comprobantes').select('egreso_id, storage_path'),
    ]);

  if (errIng) throw new Error(errIng.message);
  if (errEgr) throw new Error(errEgr.message);
  if (errComp) throw new Error(errComp.message);

  const pathsPorEgreso = new Map<number, string[]>();
  for (const c of comprobantes ?? []) {
    const arr = pathsPorEgreso.get(c.egreso_id) ?? [];
    arr.push(c.storage_path);
    pathsPorEgreso.set(c.egreso_id, arr);
  }

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
      categoriaPersonalizada: e.categoria_personalizada ?? null,
      personaNombre: e.persona_nombre ?? null,
      monto: Number(e.monto),
      comprobantesPaths: pathsPorEgreso.get(e.id) ?? [],
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
      categoriaPersonalizada: m.categoriaPersonalizada ?? null,
      personaNombre: m.personaNombre ?? null,
      monto: m.monto,
      saldo,
      comprobantesPaths: m.comprobantesPaths ?? [],
    };
  });

  if (mesParam === 'general') return conSaldo;

  const { desde, hasta } = rangoMes(mesParam);
  return conSaldo.filter((m) => m.fecha >= desde && m.fecha < hasta);
}
