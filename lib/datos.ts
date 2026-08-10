// Acceso a datos desde el cliente, vía API autenticada.
//
// Antes cada componente leía Supabase directamente con la anon key
// (`lib/supabase.ts`, eliminado). Esa key viaja al navegador y el repo es
// público, así que las tablas con RLS abierto quedaban expuestas a cualquiera.
// Ahora toda lectura pasa por `/api/*`, que valida la cookie de sesión y
// consulta con service_role.
//
// Regla: ningún componente cliente debe importar `@supabase/supabase-js`.
// Si falta un dato, se agrega un GET al route handler correspondiente.

async function pedir<T>(url: string, campo: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: null }));
    throw new Error(error ?? 'No se pudieron cargar los datos.');
  }
  const json = await res.json().catch(() => null);
  if (!json || !(campo in json)) {
    throw new Error('Respuesta inesperada del servidor.');
  }
  return json[campo] as T;
}

// ─── Personas ────────────────────────────────────────────────────────────────

/** Fila completa de `personas`. Campos opcionales según el tipo de persona. */
export interface PersonaRow {
  id: number;
  source_tipo: string;
  nombre: string;
  fecha_registro: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  sexo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  region: string | null;
  comuna: string | null;
  direccion: string | null;
  tiempo_conversion: string | null;
  bautizado: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  created_at: string | null;
  [campo: string]: unknown;
}

export interface PersonaBusqueda {
  id: number;
  nombre: string;
  telefono: string | null;
}

/**
 * Personas activas. Los dados de baja quedan fuera desde el servidor, así que
 * ninguna pantalla los muestra por descuido.
 * `incluirRetirados` los trae igual, cada uno con `retirado: boolean` — solo lo
 * necesita la pantalla de Retiros.
 */
export function getPersonas(incluirRetirados = false): Promise<PersonaRow[]> {
  const url = incluirRetirados ? '/api/personas?incluirRetirados=1' : '/api/personas';
  return pedir<PersonaRow[]>(url, 'personas');
}

/** Autocompletar por nombre (máx. 8 resultados). `tipo` filtra por source_tipo. */
export function buscarPersonas(termino: string, tipo?: string): Promise<PersonaBusqueda[]> {
  const params = new URLSearchParams({ buscar: termino });
  if (tipo) params.set('tipo', tipo);
  return pedir<PersonaBusqueda[]>(`/api/personas?${params}`, 'personas');
}

/** ¿Existe ya una persona con ese nombre? `excluirId` sirve al editar. */
export function existePersona(nombre: string, excluirId?: string | number): Promise<boolean> {
  const params = new URLSearchParams({ nombreExacto: nombre });
  if (excluirId != null) params.set('excluirId', String(excluirId));
  return pedir<boolean>(`/api/personas?${params}`, 'existe');
}

// ─── Miembros nuevos (visitantes) ────────────────────────────────────────────

export interface MiembroNuevoRow {
  id: number;
  nombre: string;
  telefono: string | null;
}

export function getMiembrosNuevos(): Promise<MiembroNuevoRow[]> {
  return pedir<MiembroNuevoRow[]>('/api/miembros-nuevos', 'miembrosNuevos');
}

/** ¿Existe ya un visitante con ese nombre? `excluirId` sirve al convertirlo
 *  en miembro: si no, el visitante se detecta a sí mismo como duplicado. */
export function existeMiembroNuevo(nombre: string, excluirId?: number): Promise<boolean> {
  const params = new URLSearchParams({ nombreExacto: nombre });
  if (excluirId != null) params.set('excluirId', String(excluirId));
  return pedir<boolean>(`/api/miembros-nuevos?${params}`, 'existe');
}

// ─── Cultos ──────────────────────────────────────────────────────────────────

export interface CultoRow {
  id: number;
  fecha: string;
  descripcion: string;
  activo: boolean;
  tipo: string;
}

export interface OpcionesCultos {
  /** Solo cultos de este tipo. */
  tipo?: string;
  /** Todo menos este tipo (p. ej. reuniones de ministerio = distinto de 'general'). */
  tipoDistinto?: string;
  /** Orden por fecha. Default: 'desc'. */
  orden?: 'asc' | 'desc';
}

export function getCultos(opciones: OpcionesCultos = {}): Promise<CultoRow[]> {
  const params = new URLSearchParams();
  if (opciones.tipo) params.set('tipo', opciones.tipo);
  if (opciones.tipoDistinto) params.set('tipoDistinto', opciones.tipoDistinto);
  if (opciones.orden) params.set('orden', opciones.orden);
  const qs = params.toString();
  return pedir<CultoRow[]>(`/api/cultos${qs ? `?${qs}` : ''}`, 'cultos');
}

// ─── Asistencias ─────────────────────────────────────────────────────────────

export interface AsistenciaRow {
  culto_id: number;
  persona_id: number | null;
  miembro_nuevo_id: number | null;
}

export interface AsistenciaDeCulto {
  persona_id: number | null;
  miembro_nuevo_id: number | null;
}

export function getAsistencias(): Promise<AsistenciaRow[]> {
  return pedir<AsistenciaRow[]>('/api/asistencias', 'asistencias');
}

export function getAsistenciasDeCulto(cultoId: number): Promise<AsistenciaDeCulto[]> {
  return pedir<AsistenciaDeCulto[]>(`/api/asistencias?cultoId=${cultoId}`, 'asistencias');
}

/**
 * Asistencias de personas con la fecha de su culto, ya aplanada.
 * PostgREST devuelve el embed `cultos` como objeto o arreglo según infiera la
 * relación; aquí se normaliza a `fecha` para que el consumidor no lo note.
 */
export async function getAsistenciasConFechaCulto(): Promise<
  { persona_id: number; fecha: string | null }[]
> {
  const filas = await pedir<{ persona_id: number; cultos: unknown }[]>(
    '/api/asistencias?conFechaCulto=1',
    'asistencias',
  );

  return filas.map((a) => {
    const culto = Array.isArray(a.cultos) ? a.cultos[0] : a.cultos;
    const fecha = (culto as { fecha?: string } | null)?.fecha ?? null;
    return { persona_id: Number(a.persona_id), fecha };
  });
}

// ─── Retiros ─────────────────────────────────────────────────────────────────

export interface RetiroRow {
  id: number;
  persona_id: number | null;
  nombre: string;
  motivo: string;
  observaciones: string | null;
  fecha_retiro: string;
  created_at: string | null;
}

export function getRetiros(): Promise<RetiroRow[]> {
  return pedir<RetiroRow[]>('/api/retiros', 'retiros');
}

// Antes acá vivía getIdsRetirados(), que cada pantalla tenía que acordarse de
// usar — y varias no lo hacían, así que un dado de baja seguía apareciendo en
// la asistencia y en los KPIs. Ahora el filtro está en GET /api/personas y no
// hay nada que recordar.

// ─── Cumpleaños ──────────────────────────────────────────────────────────────

export interface CumpleanosRow {
  id: number;
  nombre: string;
  source_tipo: string;
  sexo: string | null;
  fecha_nac: string;
  cumple_dia: number;
  cumple_mes: number;
  proximo_cumple: string;
  dias_hasta: number;
  es_hoy: boolean;
  edad_actual: number;
  edad_que_cumple: number;
  email: string | null;
  contacto_telefono: string | null;
  contacto_nombre: string;
  contacto_es_apoderado: boolean;
}

/** Próximos cumpleaños, ya calculados en Postgres (excluye retirados). */
export function getCumpleanos(dias = 400): Promise<CumpleanosRow[]> {
  return pedir<CumpleanosRow[]>(`/api/cumpleanos?dias=${dias}`, 'cumpleanos');
}
