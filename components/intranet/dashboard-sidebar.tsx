'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, LogOut, Home, Settings, Shield, User, ClipboardList, UserCheck, X } from 'lucide-react';

interface DashboardSidebarProps {
  onClose?: () => void;
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/intranet');
  };

  const isAdmin = user?.role === 'admin';

  const handleNav = (href: string) => {
    router.push(href);
    onClose?.();
  };

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="Somos Luz"
          width={150}
          height={60}
          className="mx-auto"
        />
        {/* Botón cerrar solo en móvil */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md hover:bg-secondary transition ml-2"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {isAdmin ? (
              <Shield className="w-5 h-5 text-primary" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name}
            </p>
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
              {isAdmin ? 'Administrador' : 'Usuario'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => handleNav('/intranet/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <Home className="w-4 h-4" />
              Inicio
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNav('/intranet/dashboard/registro')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <ClipboardList className="w-4 h-4" />
              Registro
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNav('/intranet/dashboard/members')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <Users className="w-4 h-4" />
              Miembros
            </button>
          </li>
          <li>
            <button
              onClick={() => handleNav('/intranet/dashboard/asistencia')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <UserCheck className="w-4 h-4" />
              Asistencia
            </button>
          </li>
          {isAdmin && (
            <li>
              <button
                onClick={() => handleNav('/intranet/dashboard/settings')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
              >
                <Settings className="w-4 h-4" />
                Configuracion
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesion
        </Button>
        <a
          href="/"
          className="flex items-center gap-2 px-3 py-2 mt-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          Volver al sitio
        </a>
      </div>
    </aside>
  );
}