// Equipos de oración.
//
// A diferencia de las categorías y los tipos de culto, los equipos NO viven en
// el código: se crean desde el panel, porque son grupos de personas reales que
// cambian con el tiempo. Acá sólo vive la paleta de colores del chip.
//
// Se guarda la CLAVE del color, no el color: así el tono real se define con los
// tokens del kit de marca y funciona en claro y en oscuro. Guardar un hex fijo
// es el error que ya costó una corrección en las gráficas.

export type ColorEquipo = 'salvia' | 'mocha' | 'arena' | 'bosque' | 'ciruela' | 'petroleo';

export interface EquipoOracion {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: ColorEquipo;
  created_at: string;
}

export const COLORES_EQUIPO: Record<ColorEquipo, { nombre: string; chip: string; punto: string }> = {
  salvia:   { nombre: 'Salvia',    chip: 'bg-primary/12 text-primary border-primary/25',                              punto: 'bg-primary' },
  mocha:    { nombre: 'Mocha',     chip: 'bg-[#6E4E37]/12 text-[#5A3F2C] dark:text-[#C9A987] border-[#6E4E37]/25',    punto: 'bg-[#6E4E37]' },
  arena:    { nombre: 'Arena',     chip: 'bg-[#BCA286]/20 text-[#6A5540] dark:text-[#D8C4A8] border-[#BCA286]/35',    punto: 'bg-[#BCA286]' },
  bosque:   { nombre: 'Bosque',    chip: 'bg-[#223F2F]/12 text-[#223F2F] dark:text-[#8FB49A] border-[#223F2F]/25',    punto: 'bg-[#223F2F]' },
  ciruela:  { nombre: 'Ciruela',   chip: 'bg-purple-500/12 text-purple-800 dark:text-purple-300 border-purple-500/25', punto: 'bg-purple-600' },
  petroleo: { nombre: 'Petróleo',  chip: 'bg-teal-500/12 text-teal-800 dark:text-teal-300 border-teal-500/25',        punto: 'bg-teal-600' },
};

export const COLOR_EQUIPO_KEYS = Object.keys(COLORES_EQUIPO) as ColorEquipo[];

export function esColorEquipo(v: unknown): v is ColorEquipo {
  return typeof v === 'string' && v in COLORES_EQUIPO;
}

/** Clases del chip, tolerando un color desconocido (por si se agrega en la base). */
export function chipEquipo(color: string): string {
  return esColorEquipo(color) ? COLORES_EQUIPO[color].chip : COLORES_EQUIPO.salvia.chip;
}

export function puntoEquipo(color: string): string {
  return esColorEquipo(color) ? COLORES_EQUIPO[color].punto : COLORES_EQUIPO.salvia.punto;
}

// ── Aviso de cambios ────────────────────────────────────────────────────────
//
// El menú de la izquierda y el panel muestran la misma lista de equipos desde
// dos componentes distintos. Sin este aviso, al crear o borrar un equipo el
// menú se quedaba con la lista vieja hasta cambiar de pestaña: se veía un
// equipo recién eliminado y al tocarlo llevaba a una vista vacía.
const EVENTO_EQUIPOS = 'sl:equipos-oracion';

export function avisarCambioEquipos() {
  try {
    window.dispatchEvent(new Event(EVENTO_EQUIPOS));
  } catch {
    // Sin window (SSR): nada que avisar.
  }
}

export function alCambiarEquipos(cb: () => void): () => void {
  window.addEventListener(EVENTO_EQUIPOS, cb);
  return () => window.removeEventListener(EVENTO_EQUIPOS, cb);
}
