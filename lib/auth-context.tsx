'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthContextType } from './types';
import { CREDENTIALS } from './mock-data';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'somos_luz_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesion guardada
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    // Verificar credenciales de admin
    if (username === CREDENTIALS.admin.username && password === CREDENTIALS.admin.password) {
      const authUser: AuthUser = {
        username: CREDENTIALS.admin.username,
        role: CREDENTIALS.admin.role,
        name: CREDENTIALS.admin.name
      };
      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return true;
    }
    
    // Verificar credenciales de usuario
    if (username === CREDENTIALS.user.username && password === CREDENTIALS.user.password) {
      const authUser: AuthUser = {
        username: CREDENTIALS.user.username,
        role: CREDENTIALS.user.role,
        name: CREDENTIALS.user.name
      };
      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
