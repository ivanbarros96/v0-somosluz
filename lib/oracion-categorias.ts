// Categorías de las peticiones de oración.
//
// Las definió Nicole (03/09/2026), que atiende la Red de Oración: son las que
// ya usaba de hecho para organizar el tiempo de oración y el informe semanal.
// No se inventan categorías nuevas acá — si hace falta otra, se agrega junto
// con el CHECK de la base (migración `oracion_categoria`).
//
// El 04/09/2026 se quitó 'somos_luz': se confundía con el ORIGEN, que ya
// responde si la petición es de dentro o de fuera de la iglesia. La categoría
// es el MOTIVO por el que se ora, no de quién viene.

export type CategoriaOracion = 'salud' | 'salvacion' | 'motivos';

export const CATEGORIAS_ORACION: Record<
  CategoriaOracion,
  {
    /** Nombre completo, como lo dice Nicole. */
    label: string;
    /** Nombre corto para chips y filtros angostos. */
    corto: string;
    /** Clases de color del chip. Cada categoría tiene el suyo para que la
     *  lista se lea de un vistazo sin tener que leer cada etiqueta. */
    clase: string;
  }
> = {
  salud: {
    label: 'Peticiones de salud',
    corto: 'Salud',
    clase: 'bg-rose-500/12 text-rose-800 dark:text-rose-300 border-rose-500/25',
  },
  salvacion: {
    label: 'Para que conozcan al Señor',
    corto: 'Salvación',
    clase: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  motivos: {
    label: 'Peticiones con distintos motivos',
    corto: 'Otros motivos',
    clase: 'bg-sky-500/12 text-sky-800 dark:text-sky-300 border-sky-500/25',
  },
};

export const CATEGORIA_KEYS = Object.keys(CATEGORIAS_ORACION) as CategoriaOracion[];

export function esCategoriaOracion(v: unknown): v is CategoriaOracion {
  return typeof v === 'string' && v in CATEGORIAS_ORACION;
}

/** Etiqueta para mostrar, incluyendo el caso "todavía nadie la clasificó". */
export function etiquetaCategoria(v: string | null): string {
  return esCategoriaOracion(v) ? CATEGORIAS_ORACION[v].corto : 'Sin clasificar';
}
