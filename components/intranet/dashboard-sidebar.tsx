'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Users, ClipboardList, UserX, Settings,
  LogOut, UserPlus, X, BookOpen, Sun, Activity, HeartHandshake, HandHeart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  // Fecha 'YYYY-MM-DD' en que se agregó al menú. Muestra "Nuevo" por 1 mes.
  addedAt?: string;
}

// Indica si un ítem sigue siendo "nuevo" (dentro de 1 mes calendario desde addedAt)
function esNuevo(addedAt?: string): boolean {
  if (!addedAt) return false;
  const added = new Date(addedAt + 'T00:00:00');
  if (isNaN(added.getTime())) return false;
  const expira = new Date(added);
  expira.setMonth(expira.getMonth() + 1);
  return Date.now() < expira.getTime();
}

const PASTOR_NAV: NavItem[] = [
  { href: '/intranet/dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { href: '/intranet/dashboard/members', label: 'Miembros', icon: Users },
  { href: '/intranet/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
  { href: '/intranet/dashboard/seguimiento', label: 'Seguimiento', icon: Activity },
  { href: '/intranet/dashboard/fidelizacion', label: 'Fidelización', icon: HeartHandshake, addedAt: '2026-06-22' },
  { href: '/intranet/dashboard/oracion', label: 'Oración', icon: HandHeart, addedAt: '2026-07-07' },
  { href: '/intranet/dashboard/retiros', label: 'Retiros', icon: UserX },
  { href: '/intranet/dashboard/settings', label: 'Configuración', icon: Settings },
];

const SOMOSLUZ_NAV: NavItem[] = [
  { href: '/intranet/dashboard/registro', label: 'Registro', icon: UserPlus },
  { href: '/intranet/dashboard/members', label: 'Miembros', icon: Users },
  { href: '/intranet/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
];

interface DashboardSidebarProps {
  onClose?: () => void;
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPastor = user?.role === 'pastor';
  const navItems = isPastor ? PASTOR_NAV : SOMOSLUZ_NAV;

  const handleLogout = async () => {
    await logout();
    router.push('/intranet');
  };

  const handleNav = (href: string) => {
    router.push(href);
    onClose?.();
  };

  const isActive = (href: string) =>
    href === '/intranet/dashboard'
      ? pathname === '/intranet/dashboard'
      : pathname.startsWith(href);

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <Image src="/logo-trans.png" alt="Somos Luz" width={130} height={84} className="h-12 w-auto" />
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded-md hover:bg-secondary transition ml-2">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Info del usuario */}
      <div className="p-4 border-b border-border">
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-xl border',
          isPastor ? 'bg-accent/5 border-accent/15' : 'bg-primary/5 border-primary/15'
        )}>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isPastor ? 'bg-accent/15' : 'bg-primary/15'
          )}>
            {isPastor
              ? <BookOpen className="w-5 h-5 text-accent" />
              : <Sun className="w-5 h-5 text-primary" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <Badge
              variant="outline"
              className={cn(
                'text-xs mt-0.5 border-0',
                isPastor
                  ? 'bg-accent/10 text-accent'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isPastor ? 'Gerencial' : 'Operativo'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <button
                onClick={() => handleNav(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive(item.href)
                    ? isPastor
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {esNuevo(item.addedAt) && (
                  <span
                    className={cn(
                      'ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none',
                      isPastor
                        ? 'bg-accent/15 text-accent'
                        : 'bg-primary/15 text-primary'
                    )}
                  >
                    Nuevo
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
        <a href="/" className="flex items-center gap-2 px-3 py-2 mt-1 text-sm text-muted-foreground hover:text-foreground transition">
          ← Volver al sitio
        </a>
      </div>
    </aside>
  );
}
