// Tipos para el sistema de intranet

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  username: string;
  role: UserRole;
  name: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationDate: string;
  status: 'active' | 'inactive';
  ministry?: string;
  notes?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}
