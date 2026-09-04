// De dónde viene la petición: de alguien de la iglesia o de alguien de fuera.
//
// ⚠️ OJO con la diferencia, que es la razón de que esto exista como archivo.
//
// El valor `interna`/`externa` nació significando POR DÓNDE ENTRÓ la petición
// (intranet vs formulario del sitio). Al renombrarlo a "Dentro / Fuera de Somos
// Luz" (Nicole, 04/09/2026) pasó a significar QUIÉN la trae, que no es lo
// mismo: un miembro de la congregación que escribe desde el sitio web entraría
// como "Fuera de Somos Luz", y sería falso.
//
// Por eso el canal solo aporta el valor INICIAL y el panel deja corregirlo.
// Sin esa corrección el nombre nuevo mentiría en un caso que ocurre seguido.

export type OrigenOracion = 'interna' | 'externa';

export const ORIGENES_ORACION: Record<
  OrigenOracion,
  { label: string; corto: string; clase: string }
> = {
  interna: {
    label: 'Dentro de Somos Luz',
    corto: 'Dentro',
    clase: 'bg-primary/10 text-primary',
  },
  externa: {
    label: 'Fuera de Somos Luz',
    corto: 'Fuera',
    clase: 'bg-secondary text-muted-foreground',
  },
};

export const ORIGEN_KEYS = Object.keys(ORIGENES_ORACION) as OrigenOracion[];

export function esOrigenOracion(v: unknown): v is OrigenOracion {
  return v === 'interna' || v === 'externa';
}
