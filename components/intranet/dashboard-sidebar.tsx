'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, LogOut, Home, Settings, Shield, User, ClipboardList } from 'lucide-react';

export function DashboardSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/intranet');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <Image
          src="/logo.png"
          alt="Somos Luz"
          width={150}
          height={60}
          className="mx-auto"
        />
      </div>

      {/* User info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
            <a
              href="/intranet/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <Home className="w-4 h-4" />
              Inicio
            </a>
          </li>
          <li>
            <a
              href="/intranet/dashboard/registro"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <ClipboardList className="w-4 h-4" />
              Registro
            </a>
          </li>
          <li>
            <a
              href="/intranet/dashboard/members"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
            >
              <Users className="w-4 h-4" />
              Miembros
            </a>
          </li>
          {isAdmin && (
            <li>
              <a
                href="/intranet/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition"
              >
                <Settings className="w-4 h-4" />
                Configuracion
              </a>
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