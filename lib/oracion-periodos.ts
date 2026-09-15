// Períodos del informe de oración. Los usan el panel (descarga y envío) y el
// servidor (POST /api/oracion/enviar-informe), así que el rango se calcula en un
// solo lugar: si no, "Última semana" podría significar cosas distintas en la
// pantalla y en lo que recibe el pastor.
//
// Sin 'use client' a propósito: lo importa también una ruta del servidor.

export type PeriodoInforme = 'todas' | 'semana' | 'mes' | 'mes_pasado';

export const PERIODOS_INFORME: { valor: PeriodoInforme; label: string; ayuda: string }[] = [
  { valor: 'semana', label: 'Última semana', ayuda: 'Peticiones llegadas en los últimos 7 días' },
  { valor: 'mes', label: 'Este mes', ayuda: 'Peticiones llegadas este mes' },
  { valor: 'mes_pasado', label: 'Mes pasado', ayuda: 'Peticiones llegadas el mes anterior' },
  { valor: 'todas', label: 'Todas', ayuda: 'Todas las peticiones activas, sin importar la fecha' },
];

export function esPeriodoInforme(v: unknown): v is PeriodoInforme {
  return typeof v === 'string' && PERIODOS_INFORME.some((p) => p.valor === v);
}

/** Fecha de hoy en Chile como 'YYYY-MM-DD' ('en-CA' da justo ese formato). */
function hoyEnChile(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

/** Rango 'YYYY-MM-DD' del período, calculado en la fecha de Chile. */
export function rangoDePeriodo(p: PeriodoInforme): { desde?: string; hasta?: string } {
  const hoy = hoyEnChile();
  const [a, m, d] = hoy.split('-').map(Number);
  const iso = (aa: number, mm: number, dd: number) =>
    `${aa}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

  if (p === 'todas') return {};
  if (p === 'mes') return { desde: iso(a, m, 1), hasta: hoy };
  if (p === 'mes_pasado') {
    const aPrev = m === 1 ? a - 1 : a;
    const mPrev = m === 1 ? 12 : m - 1;
    // Día 0 del mes actual = último día del anterior. Se usa UTC para que el
    // cálculo no dependa de la zona del navegador ni del servidor.
    const ultimo = new Date(Date.UTC(a, m - 1, 0)).getUTCDate();
    return { desde: iso(aPrev, mPrev, 1), hasta: iso(aPrev, mPrev, ultimo) };
  }
  // Última semana: 7 días hacia atrás contando hoy.
  const ini = new Date(Date.UTC(a, m - 1, d - 6));
  return {
    desde: iso(ini.getUTCFullYear(), ini.getUTCMonth() + 1, ini.getUTCDate()),
    hasta: hoy,
  };
}
