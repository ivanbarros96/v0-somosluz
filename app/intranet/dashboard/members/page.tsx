'use client';

import { useAuth } from '@/lib/auth-context';
import { useIdioma } from '@/lib/idioma';
import { MembersTable } from '@/components/intranet/members-table';

export default function MembersPage() {
  const { user } = useAuth();
  const { t } = useIdioma();
  const isAdmin = user?.role === 'pastor';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('Miembros')}</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin 
            ? t('Administra la lista de miembros de la iglesia')
            : t('Consulta la informacion de los miembros de la iglesia')
          }
        </p>
      </div>

      <MembersTable />
    </div>
  );
}
