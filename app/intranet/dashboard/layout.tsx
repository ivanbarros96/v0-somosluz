'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardSidebar } from '@/components/intranet/dashboard-sidebar';
import { soloTomaAsistencia } from '@/lib/roles';
import { Menu, X } from 'lucide-react';

const RUTA_ASISTENCIA = '/intranet/dashboard/asistencia';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ministerios (Amadas, Hombría al Máximo, Discipulado, Youth) y Kids solo
  // pueden tomar asistencia — el resto de la intranet queda fuera de su alcance
  // aunque escriban la URL a mano, no solo oculto en el menú.
  const esMinisterio = !!user && soloTomaAsistencia(user.role);
  const rutaPermitida = !esMinisterio || pathname.startsWith(RUTA_ASISTENCIA);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/intranet');
      return;
    }
    if (!rutaPermitida) {
      router.push(RUTA_ASISTENCIA);
    }
  }, [isAuthenticated, rutaPermitida, router]);

  if (!isAuthenticated || !user || !rutaPermitida) {
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
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}