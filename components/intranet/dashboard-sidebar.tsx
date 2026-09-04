'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { usePeticionesPendientes } from '@/hooks/use-peticiones-pendientes';
import { useConteoPendiente } from '@/hooks/use-conteo-pendiente';
import { useCultosSinCerrar } from '@/hooks/use-cultos-sin-cerrar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Users, ClipboardList, UserX, Settings,
  LogOut, UserPlus, X, BookOpen, Sun, Activity, HeartHandshake, HandHeart, Wallet, PiggyBank, Cake, Grid3x3,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES, esRolValido, soloTomaAsistencia, esRolCopastor, esRolOracion, esRolKids, puedeAutorizarFichas, puedeAutorizarAgenda } from '@/lib/roles';

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

// El menú va por GRUPOS, no como una lista corrida. Con 11 entradas seguidas
// había que leerlas todas para encontrar una; agrupadas por para-qué-sirve, el
// ojo salta primero al grupo y después al ítem.
// Un grupo sin título (titulo: null) va suelto arriba, sin encabezado: es el
// caso del Panel Principal, que no pertenece a ninguna familia.
interface NavGrupo {
  titulo: string | null;
  items: NavItem[];
}

// El módulo Agenda del panel es SOLO para los tres perfiles que aprueban:
// Secretaría, Pastor y Co-pastor (decisión de Iván, 30/08/2026). Ahí se
// confirma o rechaza lo que llega. El resto de los roles no lo necesitan: si
// alguien de un ministerio quiere ver las fechas, entra al calendario público
// de /intranet/calendario, que no pide cuenta. Por eso ITEM_AGENDA vive sólo
// en PASTOR_NAV, COPASTOR_NAV y SOMOSLUZ_NAV.
const ITEM_AGENDA: NavItem = {
  href: '/intranet/dashboard/agenda',
  label: 'Agenda',
  icon: CalendarDays,
  addedAt: '2026-08-29',
};

const PASTOR_NAV: NavGrupo[] = [
  {
    titulo: null,
    items: [
      { href: '/intranet/dashboard', label: 'Panel Principal', icon: LayoutDashboard },
      ITEM_AGENDA,
    ],
  },
  {
    titulo: 'Congregación',
    items: [
      { href: '/intranet/dashboard/members', label: 'Miembros', icon: Users },
      { href: '/intranet/dashboard/cumpleanos', label: 'Cumpleaños', icon: Cake, addedAt: '2026-08-05' },
    ],
  },
  {
    titulo: 'Cuidado pastoral',
    items: [
      { href: '/intranet/dashboard/seguimiento', label: 'Seguimiento', icon: Activity },
      { href: '/intranet/dashboard/fidelizacion', label: 'Fidelización', icon: HeartHandshake, addedAt: '2026-06-22' },
      { href: '/intranet/dashboard/oracion', label: 'Oración', icon: HandHeart, addedAt: '2026-07-07' },
      { href: '/intranet/dashboard/retiros', label: 'Retiros', icon: UserX },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { href: '/intranet/dashboard/finanzas', label: 'Finanzas', icon: Wallet, addedAt: '2026-07-23' },
      { href: '/intranet/dashboard/reservas', label: 'Reservas', icon: PiggyBank, addedAt: '2026-08-05' },
      { href: '/intranet/dashboard/settings', label: 'Configuración', icon: Settings },
    ],
  },
];

// Co-pastor: mismos grupos que el Pastor pero sin Administración. Su foco es
// el seguimiento de personas, así que Cuidado pastoral va primero.
const COPASTOR_NAV: NavGrupo[] = [
  {
    titulo: null,
    items: [
      { href: '/intranet/dashboard', label: 'Panel Principal', icon: LayoutDashboard },
      ITEM_AGENDA,
    ],
  },
  {
    titulo: 'Cuidado pastoral',
    items: [
      // Los nuevos en la fe ya no tienen pantalla propia: entran a la misma
      // bandeja de Seguimiento etiquetados con su motivo. La acción del
      // Co-pastor es la misma (contactar), solo cambia la conversación.
      { href: '/intranet/dashboard/seguimiento', label: 'Seguimiento', icon: Activity },
      { href: '/intranet/dashboard/fidelizacion', label: 'Fidelización', icon: HeartHandshake },
      { href: '/intranet/dashboard/retiros', label: 'Retiros', icon: UserX },
    ],
  },
  {
    titulo: 'Congregación',
    items: [
      { href: '/intranet/dashboard/members', label: 'Miembros', icon: Users },
    ],
  },
  {
    titulo: 'Asistencia',
    items: [
      { href: '/intranet/dashboard/mapa-asistencia', label: 'Mapa de asistencia', icon: Grid3x3 },
    ],
  },
];

// Operativo: 4 ítems, no necesita encabezados — agruparlos sería más ruido que
// ayuda.
const SOMOSLUZ_NAV: NavGrupo[] = [
  {
    titulo: null,
    items: [
      { href: '/intranet/dashboard/registro', label: 'Registro', icon: UserPlus },
      { href: '/intranet/dashboard/members', label: 'Miembros', icon: Users },
      { href: '/intranet/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
      { href: '/intranet/dashboard/cumpleanos', label: 'Cumpleaños', icon: Cake, addedAt: '2026-08-05' },
      ITEM_AGENDA,
    ],
  },
];

// Ministerios de adultos y jóvenes (Amadas, Hombría al Máximo, Discipulado,
// Youth): toman asistencia y registran a la gente que llega a SU reunión.
// Lo que registran queda esperando autorización de Secretaría (ver
// registraSinAprobacion en lib/roles.ts), así que pueden dar de alta sin que
// nadie entre al padrón sin revisión.
// No ven el resto de la intranet: bloqueado también por ruta en
// dashboard/layout.tsx, no solo oculto acá.
const MINISTERIO_NAV: NavGrupo[] = [
  {
    titulo: null,
    items: [
      { href: '/intranet/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
      { href: '/intranet/dashboard/registro', label: 'Registro', icon: UserPlus, addedAt: '2026-08-21' },
    ],
  },
];

// Kids es la excepción entre los ministerios: NO registra. Su clase corre en
// paralelo al dominical y los niños ya vienen dados de alta; darle el alta a
// ella multiplicaría las fichas repetidas de un mismo niño.
const KIDS_NAV: NavGrupo[] = [
  {
    titulo: null,
    items: [
      { href: '/intranet/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
    ],
  },
];

// Oración: un solo panel, como los ministerios pero el suyo.
const ORACION_NAV: NavGrupo[] = [
  {
    titulo: null,
    items: [
      { href: '/intranet/dashboard/oracion', label: 'Oración', icon: HandHeart },
    ],
  },
];

interface DashboardSidebarProps {
  onClose?: () => void;
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPastor = user?.role === 'pastor';
  const esCopastor = !!user && esRolCopastor(user.role);
  const esOracion = !!user && esRolOracion(user.role);
  const esKids = !!user && esRolKids(user.role);
  const esMinisterio = !!user && soloTomaAsistencia(user.role);
  const navGrupos = isPastor
    ? PASTOR_NAV
    : esCopastor
      ? COPASTOR_NAV
      : esOracion
        ? ORACION_NAV
        : esKids
          ? KIDS_NAV
          : esMinisterio
            ? MINISTERIO_NAV
            : SOMOSLUZ_NAV;

  // Peticiones de oración sin revisar. Alimenta el badge y el título de
  // pestaña. Lo ven quienes gestionan el panel de oración: pastor y el
  // perfil Oración.
  const oracionPendientes = usePeticionesPendientes(isPastor || esOracion);

  // Fichas esperando autorización. Se pide con la MISMA regla que aplica el
  // servidor (puedeAutorizarFichas): si el badge apareciera para alguien que
  // no puede aprobar, lo estaría mandando a una acción que se le rechaza.
  const registrosPendientes = useConteoPendiente(
    '/api/personas/pendientes/count',
    !!user && puedeAutorizarFichas(user.role),
  );

  // Fechas propuestas esperando confirmación. Mismo criterio: se pide sólo si
  // el rol puede confirmarlas, para no mostrar un aviso sobre el que no se
  // puede actuar. Todos ven la Agenda, pero sólo tres roles la resuelven.
  const agendaPendientes = useConteoPendiente(
    '/api/agenda/pendientes/count',
    !!user && puedeAutorizarAgenda(user.role),
  );

  // Cultos que quedaron abiertos más de 48 h. Es la MISMA fuente que usa la
  // campana, para que los dos números no puedan contradecirse.
  const cultosAbiertos = useCultosSinCerrar(user?.role);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = oracionPendientes > 0 ? `(${oracionPendientes}) ${base}` : base;
  }, [oracionPendientes, pathname]);

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
        {/* Version crema: el logo normal es oscuro y desaparece sobre el mocha. */}
        <Image src="/logo-cream.png" alt="Somos Luz" width={130} height={84} className="h-12 w-auto" />
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
              {user && esRolValido(user.role) ? ROLES[user.role].badge : 'Operativo'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-3">
        {navGrupos.map((grupo, gi) => (
          <div key={grupo.titulo ?? `grupo-${gi}`} className={gi > 0 ? 'mt-5' : ''}>
            {grupo.titulo && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {grupo.titulo}
              </p>
            )}
            <ul className="space-y-1">
          {grupo.items.map((item) => {
            // Tres avisos distintos, el mismo badge: peticiones de oración sin
            // revisar, auto-registros esperando aprobación y fechas propuestas
            // en la agenda. Antes había que entrar a la pestaña Pendientes para
            // enterarse de que alguien se había registrado.
            const pendientes =
              item.href === '/intranet/dashboard/oracion' ? oracionPendientes
              : item.href === '/intranet/dashboard/members' ? registrosPendientes
              : item.href === '/intranet/dashboard/agenda' ? agendaPendientes
              : 0;

            // Asistencia lleva su propio badge, en ÁMBAR y no en naranja: los
            // otros tres son novedades que revisar, éste es algo roto que
            // arreglar. Mismo color que la advertencia de la campana, para que
            // se lean como la misma cosa en los dos lados.
            const avisoCultos =
              item.href === '/intranet/dashboard/asistencia' ? cultosAbiertos.length : 0;
            return (
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
                  {avisoCultos > 0 ? (
                    <span
                      className="ml-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold rounded-full bg-amber-600 text-white leading-none"
                      aria-label={`${avisoCultos} ${avisoCultos === 1 ? 'culto sin cerrar' : 'cultos sin cerrar'}`}
                    >
                      {avisoCultos > 9 ? '9+' : avisoCultos}
                    </span>
                  ) : pendientes > 0 ? (
                    <span
                      className="ml-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold rounded-full bg-orange-500 text-white leading-none"
                      aria-label={
                        item.href === '/intranet/dashboard/members'
                          ? `${pendientes} registros esperando aprobación`
                          : item.href === '/intranet/dashboard/agenda'
                            ? `${pendientes} fechas esperando confirmación`
                            : `${pendientes} peticiones sin revisar`
                      }
                    >
                      {pendientes > 9 ? '9+' : pendientes}
                    </span>
                  ) : esNuevo(item.addedAt) ? (
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
                  ) : null}
                </button>
              </li>
            );
          })}
            </ul>
          </div>
        ))}
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
