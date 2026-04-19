'use client';

import { useAuth } from '@/lib/auth-context';
import { useMembers } from '@/lib/members-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { members } = useMembers();

  const activeMembers = members.filter(m => m.status === 'active').length;
  const inactiveMembers = members.filter(m => m.status === 'inactive').length;
  const recentMembers = members.filter(m => {
    const regDate = new Date(m.registrationDate);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return regDate >= threeMonthsAgo;
  }).length;

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Panel de {isAdmin ? 'administracion' : 'usuario'} de Somos Luz Iglesia
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Miembros
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Activos
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{activeMembers}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Participando actualmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Inactivos
            </CardTitle>
            <UserX className="h-4 w-4 text-orange-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{inactiveMembers}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Temporalmente ausentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Nuevos (3m)
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{recentMembers}</div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
              Registros recientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Acciones Rapidas</CardTitle>
          <CardDescription className="text-sm">
            Accede rapidamente a las funciones mas utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <a
              href="/intranet/dashboard/members"
              className="block p-4 rounded-lg border border-border hover:bg-secondary transition"
            >
              <Users className="h-7 w-7 md:h-8 md:w-8 text-primary mb-2" />
              <h3 className="font-semibold text-foreground text-sm md:text-base">Ver Miembros</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {isAdmin ? 'Administra la lista de miembros' : 'Consulta la lista de miembros'}
              </p>
            </a>

            {isAdmin && (
              <a
                href="/intranet/dashboard/settings"
                className="block p-4 rounded-lg border border-border hover:bg-secondary transition"
              >
                <svg className="h-7 w-7 md:h-8 md:w-8 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-semibold text-foreground text-sm md:text-base">Configuracion</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Ajustes del sistema
                </p>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}