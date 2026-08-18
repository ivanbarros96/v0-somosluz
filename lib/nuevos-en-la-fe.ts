// Quiénes necesitan la formación básica: los que recién conocen el evangelio.
// El Co-pastor arma su acompañamiento con esta lista.
//
// Hay DOS señales, a propósito separadas y nunca mezcladas en una sola:
//
//  1. Declaró que es su primera vez en una iglesia cristiana (primera_iglesia).
//     Es el dato directo, pero solo existe desde agosto 2026: las fichas
//     anteriores lo tienen en null porque nadie preguntó.
//
//  2. Lleva poco tiempo en el evangelio (tiempo_conversion). Es una señal
//     SECUNDARIA que rescata a los miembros antiguos que sí se convirtieron
//     hace poco. Sin esto, la lista habría arrancado vacía y el Co-pastor no
//     habría tenido a nadie que acompañar el primer día.
//
// No son lo mismo y por eso cada persona muestra por cuál de las dos entró:
// alguien puede conocer el evangelio hace 10 años por su familia y nunca haber
// pisado una iglesia, y al revés.

export type MotivoNuevo = 'declaro' | 'tiempo';

export interface PersonaNueva {
  id: number;
  nombre: string;
  tipo: string;
  telefono: string | null;
  whatsapp: string | null;
  motivo: MotivoNuevo;
  /** Texto del tiempo en el evangelio, cuando ese fue el motivo. */
  tiempoConversion: string | null;
  bautizado: boolean;
  fechaRegistro: string | null;
}

// Hasta cuántos meses en el evangelio se considera "recién llegado a la fe".
export const MESES_RECIENTE = 24;

/**
 * Convierte "8 Meses" / "2 Años" a meses. Devuelve null si no calza con el
 * formato que guarda el formulario.
 */
export function mesesEnElEvangelio(texto: string | null): number | null {
  if (!texto) return null;
  const m = texto.trim().match(/^(\d{1,2})\s+(Meses|Años)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2].toLowerCase().startsWith('a') ? n * 12 : n;
}

interface FilaPersona {
  id: number | string;
  nombre: string;
  source_tipo: string;
  telefono: string | null;
  whatsapp?: string | null;
  bautizado: string | null;
  tiempo_conversion: string | null;
  primera_iglesia?: boolean | null;
  fecha_registro?: string | null;
  created_at?: string | null;
}

export function nuevosEnLaFe(personas: FilaPersona[]): PersonaNueva[] {
  const out: PersonaNueva[] = [];

  for (const p of personas) {
    // A los niños no se les pregunta y su formación va por Kids.
    if (p.source_tipo === 'nino') continue;

    const declaro = p.primera_iglesia === true;
    const meses = mesesEnElEvangelio(p.tiempo_conversion);
    // Si declaró que NO es su primera iglesia, igual puede llevar poco tiempo.
    const reciente = meses != null && meses <= MESES_RECIENTE;

    if (!declaro && !reciente) continue;

    out.push({
      id: Number(p.id),
      nombre: p.nombre,
      tipo: p.source_tipo,
      telefono: p.telefono,
      whatsapp: p.whatsapp ?? null,
      // "Declaró" manda sobre la señal indirecta cuando ambas aplican.
      motivo: declaro ? 'declaro' : 'tiempo',
      tiempoConversion: declaro ? null : p.tiempo_conversion,
      bautizado: p.bautizado === 'si',
      fechaRegistro: p.fecha_registro ?? p.created_at ?? null,
    });
  }

  // Los que declararon primero (dato directo), y dentro de cada grupo, quien
  // lleva menos tiempo en la iglesia — que es a quien hay que atender antes.
  return out.sort((a, b) => {
    if (a.motivo !== b.motivo) return a.motivo === 'declaro' ? -1 : 1;
    const fa = a.fechaRegistro ?? '';
    const fb = b.fechaRegistro ?? '';
    return fb.localeCompare(fa);
  });
}
