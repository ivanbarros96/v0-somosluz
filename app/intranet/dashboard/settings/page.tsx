'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Database, Info } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/intranet/dashboard');
    }
  }, [user, router]);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Configuracion</h1>
        <p className="text-muted-foreground mt-1">
          Panel de configuracion del sistema (solo administradores)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Credenciales del Sistema
            </CardTitle>
            <CardDescription>
              Credenciales de acceso configuradas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Administrador</p>
              <p className="text-xs text-muted-foreground">Usuario: ADMIN</p>
              <p className="text-xs text-muted-foreground">Password: SOMOSLUZ</p>
              <Badge className="mt-2">Admin</Badge>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">Usuario General</p>
              <p className="text-xs text-muted-foreground">Usuario: somosluz</p>
              <p className="text-xs text-muted-foreground">Password: somosluz</p>
              <Badge variant="secondary" className="mt-2">User</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Permisos por Rol
            </CardTitle>
            <CardDescription>
              Capacidades de cada tipo de usuario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">Administrador</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Ver todos los miembros</li>
                <li>- Agregar nuevos miembros</li>
                <li>- Editar cualquier miembro</li>
                <li>- Eliminar miembros</li>
                <li>- Acceso a configuracion</li>
              </ul>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">Usuario</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Ver todos los miembros</li>
                <li>- Editar informacion de miembros</li>
                <li>- Sin acceso a eliminar</li>
                <li>- Sin acceso a configuracion</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Almacenamiento
            </CardTitle>
            <CardDescription>
              Informacion sobre el almacenamiento de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">localStorage</p>
              <p className="text-xs text-muted-foreground">
                Los datos de miembros y sesiones se almacenan localmente en el navegador. 
                Los datos persisten entre sesiones pero son especificos del dispositivo.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Informacion del Sistema
            </CardTitle>
            <CardDescription>
              Detalles tecnicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework</span>
                <span className="text-foreground">Next.js 16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UI</span>
                <span className="text-foreground">shadcn/ui</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Autenticacion</span>
                <span className="text-foreground">Hardcoded</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
