// Tipos para el sistema de intranet

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

// ── Personas ──────────────────────────────────────────────

export interface PersonaBase {
  id: string;
  tipo: 'adulto' | 'nino';
  sourceId?: number;
  fechaRegistro: string;

  nombre: string;
  sexo?: string;

  telefono?: string;
  whatsapp?: string;
  email?: string;

  region?: string;
  comuna?: string;
  direccion?: string;

  status: 'active' | 'inactive';
  notes?: string;
}

export interface AdultoMember extends PersonaBase {
  tipo: 'adulto';
  bautizado?: string;          // 'Sí' | 'No' | 'En proceso'
  tiempoConversion?: string;
}

export interface NinoMember extends PersonaBase {
  tipo: 'nino';
  fechaNacimiento?: string;
  edad?: number;
  nombreApoderado?: string;
  telefonoApoderado?: string;
}

export type Member = AdultoMember | NinoMember;

// Helper de tipo
export function isAdulto(m: Member): m is AdultoMember {
  return m.tipo === 'adulto';
}
export function isNino(m: Member): m is NinoMember {
  return m.tipo === 'nino';
}