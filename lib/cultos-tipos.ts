// Catálogo de tipos de culto/reunión y sus reglas de público.
// Fuente: definición del cliente (jul-2026), actualizada en ago-2026.
//
// 'kids' se agregó el 09/08/2026: la clase de niños ocurre EN PARALELO al
// culto dominical, en otra sala. Antes compartía el registro del general, así
// que quien tomaba la asistencia general se llevaba la marca y después no se
// podía responder "cuántos niños entraron a la clase de Kids" — solo "cuántos
// niños vinieron a la iglesia". Con su propio tipo son dos hechos separados y
// ya no se pisan. El culto de Kids se crea solo junto al dominical
// (ver POST /api/cultos).
export type CultoTipo = 'general' | 'hombres' | 'mujeres' | 'discipulado' | 'youth' | 'kids';

export interface PersonaAudiencia {
  source_tipo: 'adulto' | 'nino' | 'joven' | 'nuevo';
  sexo: string | null;
  edad: number | null;
  // Solo relevante para 'youth': si la persona NO se registró en la pestaña
  // Youth (source_tipo !== 'joven') pero su edad cae en el rango 15–20, no
  // se la cuenta como Youth por edad sola — hace falta que ya haya asistido
  // al menos una vez a un culto de Youth. Quien se registra directo como
  // Youth siempre es elegible, sin importar la edad.
  asistioAYouthAlgunaVez?: boolean;
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
      if (p.source_tipo === 'nuevo') return 'no'; // ocultos por defecto: se ven con "Ver todos"
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
      if (p.source_tipo === 'nuevo') return 'no'; // ocultos por defecto: se ven con "Ver todos"
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
      if (p.source_tipo === 'nuevo') return 'no'; // ocultos por defecto: se ven con "Ver todos"
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
      if (p.source_tipo === 'nuevo') return 'no'; // ocultos por defecto: se ven con "Ver todos"
      if (p.source_tipo === 'joven') return 'si'; // la categoría manda sobre la edad
      if (p.edad == null) return 'incompleto';
      if (p.edad < 15 || p.edad > 20) return 'no';
      // Adulto (o Niño) en el rango de edad de Youth: no cuenta como Youth
      // solo por edad — necesita al menos una asistencia previa registrada
      // en un culto de Youth.
      return p.asistioAYouthAlgunaVez ? 'si' : 'no';
    },
  },
  kids: {
    label: 'Clase de Kids',
    publico: 'Niños',
    elegibilidad: (p) => {
      if (p.source_tipo === 'nuevo') return 'no'; // ocultos por defecto: se ven con "Ver todos"
      // Manda la categoría de registro, no la edad: así un niño sin fecha de
      // nacimiento cargada igual aparece en la lista de la maestra.
      return p.source_tipo === 'nino' ? 'si' : 'no';
    },
  },
};

export const CULTO_TIPO_KEYS = Object.keys(CULTO_TIPOS) as CultoTipo[];

// Tipos de ministerio (todos menos el general) — para estadísticas
export const MINISTERIO_KEYS = CULTO_TIPO_KEYS.filter((t) => t !== 'general');

export function esCultoTipo(v: unknown): v is CultoTipo {
  return typeof v === 'string' && v in CULTO_TIPOS;
}

// IDs de persona con al menos una asistencia registrada en un culto del tipo
// dado. Usado para decidir elegibilidad de Youth por asistencia real, no por
// edad — ver PersonaAudiencia.asistioAYouthAlgunaVez.
export function idsQueAsistieron(
  cultos: { id: number; tipo: string }[],
  asistencias: { culto_id: number; persona_id: number | null }[],
  tipo: CultoTipo,
): Set<number> {
  const cultoIds = new Set(cultos.filter((c) => c.tipo === tipo).map((c) => Number(c.id)));
  const out = new Set<number>();
  for (const a of asistencias) {
    if (a.persona_id != null && cultoIds.has(Number(a.culto_id))) out.add(Number(a.persona_id));
  }
  return out;
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
