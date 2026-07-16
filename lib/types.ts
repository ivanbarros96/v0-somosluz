// --- AUTH ---

// El catálogo de roles vive en lib/roles.ts (fuente única de verdad)
export type { UserRole } from './roles';
import type { UserRole } from './roles';

export interface AuthUser {
  username: string;
  role: UserRole;
  name: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// --- MEMBERS ---

export type BautizadoStatus = 'si' | 'no' | 'en_proceso' | null;

export interface PersonaBase {
  id: string;
  source_id: string | null;
  fecha_registro: string | null;
  nombre: string;
  sexo: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  region: string | null;
  comuna: string | null;
  direccion: string | null;
  created_at: string | null;
}

export interface AdultoMember extends PersonaBase {
  tipo: 'adulto';
  bautizado: BautizadoStatus;
  tiempo_conversion: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
}

export interface NinoMember extends PersonaBase {
  tipo: 'nino';
  fecha_nacimiento: string | null;
  edad: number | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
}

// Jóvenes (15-20): mismos campos que niño (pueden tener apoderado si son menores)
// más el estado de bautismo de adulto.
export interface JovenMember extends PersonaBase {
  tipo: 'joven';
  bautizado: BautizadoStatus;
  fecha_nacimiento: string | null;
  edad: number | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
}

export type Member = AdultoMember | NinoMember | JovenMember;

export function isAdultoMember(m: Member): m is AdultoMember {
  return m.tipo === 'adulto';
}

export function isNinoMember(m: Member): m is NinoMember {
  return m.tipo === 'nino';
}

export function isJovenMember(m: Member): m is JovenMember {
  return m.tipo === 'joven';
}

export function getMemberInitials(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
