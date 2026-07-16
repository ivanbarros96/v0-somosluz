// Catálogo de tipos de culto/reunión y sus reglas de público.
// Fuente: definición del cliente (jul-2026). Niños no tienen reunión propia:
// asisten con sus padres al Culto General.

export type CultoTipo = 'general' | 'hombres' | 'mujeres' | 'discipulado' | 'youth';

export interface PersonaAudiencia {
  source_tipo: 'adulto' | 'nino' | 'joven' | 'nuevo';
  sexo: string | null;
  edad: number | null;
}

// Resultado de elegibilidad:
// - 'si': pertenece al público del culto
// - 'incompleto': podría pertenecer, pero su ficha no tiene el dato (sexo/edad)
// - 'no': no pertenece
export type Elegibilidad = 'si' | 'incompleto' | 'no';

const norm = (v: string | null) => (v ?? '').trim().toLowerCase();

export const CULTO_TIPOS: Record<
  CultoTipo,
  {
    label: string;
    publico: string;
    elegibilidad: (p: PersonaAudiencia) => Elegibilidad;
  }
> = {
  general: {
    label: 'Culto General',
    publico: 'Toda la congregación',
    elegibilidad: () => 'si',
  },
  hombres: {
    label: 'Hombría al Máximo',
    publico: 'Varones adultos',
    elegibilidad: (p) => {
      if (p.source_tipo === 'nuevo') return 'si'; // visitantes siempre bienvenidos
      if (p.source_tipo !== 'adulto') return 'no';
      const s = norm(p.sexo);
      if (s === 'masculino') return 'si';
      if (s === '') return 'incompleto';
      return 'no';
    },
  },
  mujeres: {
    label: 'Amadas',
    publico: 'Mujeres adultas',
    elegibilidad: (p) => {
      if (p.source_tipo === 'nuevo') return 'si';
      if (p.source_tipo !== 'adulto') return 'no';
      const s = norm(p.sexo);
      if (s === 'femenino') return 'si';
      if (s === '') return 'incompleto';
      return 'no';
    },
  },
  discipulado: {
    label: 'Viernes de Discipulado',
    publico: 'Adultos',
    elegibilidad: (p) => {
      if (p.source_tipo === 'nuevo') return 'si';
      if (p.source_tipo === 'adulto') return 'si';
      // Jóvenes mayores de edad también son adultos (rango adultos: 18+)
      if (p.source_tipo === 'joven') return p.edad != null && p.edad >= 18 ? 'si' : 'no';
      return 'no';
    },
  },
  youth: {
    label: 'Generación Youth',
    publico: 'Jóvenes 15–20',
    elegibilidad: (p) => {
      if (p.source_tipo === 'nuevo') return 'si';
      if (p.source_tipo === 'joven') return 'si'; // la categoría manda sobre la edad
      if (p.edad == null) return 'incompleto';
      return p.edad >= 15 && p.edad <= 20 ? 'si' : 'no';
    },
  },
};

export const CULTO_TIPO_KEYS = Object.keys(CULTO_TIPOS) as CultoTipo[];

// Tipos de ministerio (todos menos el general) — para estadísticas
export const MINISTERIO_KEYS = CULTO_TIPO_KEYS.filter((t) => t !== 'general');

export function esCultoTipo(v: unknown): v is CultoTipo {
  return typeof v === 'string' && v in CULTO_TIPOS;
}

export function descripcionCulto(tipo: CultoTipo, fechaISO: string): string {
  const fecha = new Date(fechaISO + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return tipo === 'general'
    ? `Culto dominical ${fecha}`
    : `${CULTO_TIPOS[tipo].label} — ${fecha}`;
}
