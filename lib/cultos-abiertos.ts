// Cultos que quedaron abiertos y ya llevan demasiado tiempo así.
//
// Un culto abierto no es un error: mientras la reunión ocurre, se marca la
// asistencia con el culto abierto. El problema es cuando NADIE lo cierra: la
// asistencia queda a medias y todas las cifras que dependen de ella mienten en
// silencio. Pasó de verdad — el culto de Youth del 29/08/2026 siguió abierto y
// el panel del Pastor mostraba "0 asistentes", lo que se leía como
// "100% bajo lo normal" (ver components/intranet/pastor/pulso-asistencia-card).

import type { CultoTipo } from './cultos-tipos';

export interface CultoAbierto {
  id: number;
  fecha: string;
  tipo: string;
  activo?: boolean;
  descripcion?: string;
}

export interface CultoSinCerrar {
  id: number;
  fecha: string;
  tipo: CultoTipo;
  /** Horas enteras que lleva abierto desde el mediodía de su día. */
  horas: number;
}

/** Plazo antes de avisar. Decisión de Iván (03/09/2026). */
export const HORAS_LIMITE = 48;

/**
 * Momento desde el que se cuentan las horas: el MEDIODÍA local del día del
 * culto. Se usa el mediodía y no la medianoche porque las fechas se guardan a
 * medianoche UTC y en Chile (UTC-4) eso cae en el día anterior; partiendo del
 * mediodía, el día es el correcto sin importar la zona. La fecha se parte como
 * texto, nunca con `new Date(iso)`, que es el error clásico de este proyecto.
 */
export function inicioDelDia(fecha: string): number {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return NaN;
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0).getTime();
}

/**
 * Cultos abiertos que ya pasaron el plazo, del más viejo al más reciente.
 *
 * @param cultos    Todos los cultos conocidos.
 * @param tipoPropio Si el rol está limitado a un ministerio, su tipo. Un líder
 *                   de Amadas no debe recibir avisos del culto dominical: no
 *                   puede cerrarlo y sería ruido puro.
 */
export function cultosSinCerrar(
  cultos: CultoAbierto[],
  tipoPropio: CultoTipo | null,
  ahora: number = Date.now(),
  horasLimite: number = HORAS_LIMITE,
): CultoSinCerrar[] {
  const limiteMs = horasLimite * 3_600_000;

  // Fechas con el dominical TAMBIÉN abierto: el culto de Kids se cierra solo
  // junto al general (ver PATCH /api/cultos/[id]), así que avisar de los dos
  // sería el mismo problema contado dos veces. Se avisa del general, que es el
  // que alguien puede cerrar. Si el general ya se cerró y el de Kids quedó
  // colgado, ahí sí aparece: ese caso está realmente atascado.
  const generalAbiertoEn = new Set(
    cultos.filter((c) => c.tipo === 'general' && c.activo).map((c) => c.fecha.slice(0, 10)),
  );

  const fuera: CultoSinCerrar[] = [];
  for (const c of cultos) {
    if (!c.activo) continue;
    if (tipoPropio && c.tipo !== tipoPropio) continue;
    if (c.tipo === 'kids' && generalAbiertoEn.has(c.fecha.slice(0, 10))) continue;

    const desde = inicioDelDia(c.fecha);
    if (Number.isNaN(desde)) continue;

    const transcurrido = ahora - desde;
    if (transcurrido <= limiteMs) continue;

    fuera.push({
      id: Number(c.id),
      fecha: c.fecha,
      tipo: c.tipo as CultoTipo,
      horas: Math.floor(transcurrido / 3_600_000),
    });
  }

  // Del más viejo primero: es el que más daño lleva haciendo a las cifras.
  return fuera.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** "4 días" / "3 días" / "50 horas" — para el texto del aviso. */
export function tiempoAbierto(horas: number): string {
  const dias = Math.floor(horas / 24);
  if (dias >= 2) return `${dias} días`;
  return `${horas} horas`;
}
