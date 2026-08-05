'use client';

import { ClipboardList, ShieldAlert } from 'lucide-react';
import { MemberForm } from '@/components/intranet/member-form';
import { useAuth } from '@/lib/auth-context';

export default function RegistroPage() {
  const { user } = useAuth();

  // El Pastor no registra miembros — ve todo desde Miembros/Asistencia, pero
  // el alta de fichas es tarea operativa del resto del equipo.
  if (user?.role === 'pastor') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">El perfil Pastor no registra miembros.</p>
            <p className="text-sm mt-1">
              Para ver o editar fichas existentes, usa la sección Miembros.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registro de Miembros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingresa un nuevo miembro directamente a la base de datos
          </p>
        </div>
      </div>
      <MemberForm />
    </div>
  );
}