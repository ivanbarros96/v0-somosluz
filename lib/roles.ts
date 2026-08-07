// Fuente única de verdad de los usuarios/roles de la intranet.
// Las contraseñas viven en variables de entorno de Vercel (una por usuario).
import type { CultoTipo } from './cultos-tipos';

export const ROLES = {
  pastor: { name: 'Pastor', badge: 'Gerencial', envVar: 'PASTOR_PASSWORD', ministerio: null },
  somosluz: { name: 'Somos Luz', badge: 'Operativo', envVar: 'SOMOSLUZ_PASSWORD', ministerio: null },
  amadas: { name: 'Amadas', badge: 'Ministerio', envVar: 'AMADAS_PASSWORD', ministerio: 'mujeres' },
  hombres: { name: 'Hombría al Máximo', badge: 'Ministerio', envVar: 'HOMBRES_PASSWORD', ministerio: 'hombres' },
  discipulado: { name: 'Viernes de Discipulado', badge: 'Ministerio', envVar: 'DISCIPULADO_PASSWORD', ministerio: 'discipulado' },
  youth: { name: 'Generación Youth', badge: 'Ministerio', envVar: 'YOUTH_PASSWORD', ministerio: 'youth' },
  // Kids NO tiene reunión propia (ministerio: null a propósito): toma la
  // asistencia de los niños DENTRO del culto general que abre Somos Luz. Su
  // límite es de público (niños), no de tipo de culto — ver esRolKids().
  kids: { name: 'Kids', badge: 'Ministerio', envVar: 'KIDS_PASSWORD', ministerio: null },
} as const satisfies Record<
  string,
  { name: string; badge: string; envVar: string; ministerio: CultoTipo | null }
>;

export type UserRole = keyof typeof ROLES;

// Para middleware (Edge) y session: lista plana sin dependencias
export const VALID_ROLES = Object.keys(ROLES) as UserRole[];

export function esRolValido(v: unknown): v is UserRole {
  return typeof v === 'string' && v in ROLES;
}

// Ministerio (tipo de culto) al que está limitado un rol. null = sin límite por tipo.
export function ministerioDeRol(role: string): CultoTipo | null {
  return esRolValido(role) ? ROLES[role].ministerio : null;
}

// Kids: caso aparte. No filtra por tipo de culto (trabaja sobre el culto
// general de Somos Luz) sino por público — solo puede marcar niños, y solo
// mientras el culto siga abierto. Somos Luz es quien crea y cierra el culto.
export function esRolKids(role: string): boolean {
  return role === 'kids';
}

// Tipos de persona (source_tipo) que Kids puede marcar presente. Los
// visitantes entran porque no traen edad ni categoría: se ven solo al activar
// "Ver todos" y ahí Kids decide si es un niño.
export const TIPOS_MARCABLES_KIDS = ['nino', 'nuevo'];

// Roles cuya única función es tomar asistencia: no ven el resto de la
// intranet (ver dashboard-sidebar.tsx y dashboard/layout.tsx).
export function soloTomaAsistencia(role: string): boolean {
  return ministerioDeRol(role) !== null || esRolKids(role);
}
