'use client';

import { useAuth } from '@/lib/auth-context';
import { MembersTable } from '@/components/intranet/members-table';

export default function MembersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Miembros</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin 
            ? 'Administra la lista de miembros de la iglesia' 
            : 'Consulta la informacion de los miembros de la iglesia'
          }
        </p>
      </div>

      <MembersTable />
    </div>
  );
}
