export type UserRole = 'admin' | 'user';

export interface AuthUser {
  username: string;
  role: UserRole;
  name: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

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
  fecha_nacimiento: string | null;  // ✅ AGREGADO
  edad: number | null;              // ✅ AGREGADO
}

export interface NinoMember extends PersonaBase {
  tipo: 'nino';
  fecha_nacimiento: string | null;
  edad: number | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
}

export type Member = AdultoMember | NinoMember;

export function isAdultoMember(m: Member): m is AdultoMember {
  return m.tipo === 'adulto';
}

export function isNinoMember(m: Member): m is NinoMember {
  return m.tipo === 'nino';
}

export function getMemberInitials(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}