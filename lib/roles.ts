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
