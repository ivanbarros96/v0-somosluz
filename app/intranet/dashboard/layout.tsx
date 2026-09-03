'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/intranet/dashboard-sidebar';
import { NotificationBell, tieneCampana } from '@/components/intranet/notification-bell';
import { soloTomaAsistencia, esRolCopastor, copastorPuedeVer, esRolOracion, esRolKids } from '@/lib/roles';
import { Menu, X } from 'lucide-react';

const RUTA_ASISTENCIA = '/intranet/dashboard/asistencia';
const RUTA_ORACION = '/intranet/dashboard/oracion';
const RUTA_REGISTRO = '/intranet/dashboard/registro';
// El módulo Agenda del panel (aprobar/rechazar) es sólo de Secretaría, Pastor y
// Co-pastor. Los ministerios, Kids y Oración NO entran acá aunque escriban la
// URL: para mirar las fechas está el calendario público /intranet/calendario.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Los ministerios (Amadas, Hombría al Máximo, Discipulado, Youth) toman
  // asistencia y registran a quien llega a su reunión — lo que registran queda
  // esperando autorización de Secretaría, así que el padrón sigue controlado.
  //
  // Kids es la excepción: solo asistencia. Su clase corre en paralelo al
  // dominical con niños que ya están dados de alta.
  //
  // El resto de la intranet queda fuera de su alcance aunque escriban la URL a
  // mano, no solo oculto en el menú.
  const esMinisterio = !!user && soloTomaAsistencia(user.role);
  const esKids = !!user && esRolKids(user.role);
  const rutasDeMinisterio = esKids
    ? [RUTA_ASISTENCIA]
    : [RUTA_ASISTENCIA, RUTA_REGISTRO];
  const rutaPermitida =
    !esMinisterio || rutasDeMinisterio.some((r) => pathname.startsWith(r));

  // El Co-pastor sí navega la intranet, pero Finanzas, Reservas y
  // Configuración quedan fuera de su alcance aunque escriba la URL a mano.
  const esCopastor = !!user && esRolCopastor(user.role);
  const rutaPermitidaCopastor = !esCopastor || copastorPuedeVer(pathname);

  // El perfil Oración solo entra a su panel; cualquier otra ruta lo devuelve
  // ahí, aunque escriba la URL a mano.
  const esOracion = !!user && esRolOracion(user.role);
  const rutaPermitidaOracion = !esOracion || pathname.startsWith(RUTA_ORACION);

  // La campana aparece en los perfiles que tienen algo que atender o vigilar
  // (Secretaría, Oración, Pastor, Co-pastor). Los ministerios y Kids no.
  const conCampana = !!user && tieneCampana(user.role);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/intranet');
      return;
    }
    if (!rutaPermitida) {
      router.push(RUTA_ASISTENCIA);
      return;
    }
    if (!rutaPermitidaOracion) {
      router.push(RUTA_ORACION);
      return;
    }
    if (!rutaPermitidaCopastor) {
      router.push('/intranet/dashboard');
    }
  }, [isAuthenticated, rutaPermitida, rutaPermitidaOracion, rutaPermitidaCopastor, router]);

  if (!isAuthenticated || !user || !rutaPermitida || !rutaPermitidaOracion || !rutaPermitidaCopastor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full z-30 transition-transform duration-300
          md:static md:translate-x-0 md:block
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar móvil */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-secondary transition"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-semibold text-foreground text-sm">Somos Luz</span>
          {conCampana && <div className="ml-auto -mr-1"><NotificationBell role={user.role} /></div>}
        </header>

        {/* Topbar de escritorio con la campana. Aparece en los perfiles que
            tienen algo que atender. Desde el 03/09/2026 eso incluye a los
            ministerios de reunión: es su único aviso, pero es el que importa
            —si dejan su reunión sin cerrar, sus cifras salen mal—. Kids sigue
            sin campana: no abre ni cierra cultos. */}
        {conCampana && (
          <header className="hidden md:flex items-center justify-end px-8 py-2 border-b border-border bg-card">
            <NotificationBell role={user.role} />
          </header>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}