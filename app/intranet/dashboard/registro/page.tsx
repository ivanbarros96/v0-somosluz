'use client';

import { ClipboardList } from 'lucide-react';
import { MemberForm } from '@/components/intranet/member-form';

export default function RegistroPage() {
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