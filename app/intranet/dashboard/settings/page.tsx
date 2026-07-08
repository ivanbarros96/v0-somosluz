'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Database, Info, BookOpen, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Solo el perfil gerencial (pastor) accede a configuración
  useEffect(() => {
    if (user && user.role !== 'pastor') {
      router.replace('/intranet/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'pastor') return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Información del sistema y permisos de acceso
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sesión actual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Tu sesión
            </CardTitle>
            <CardDescription>Perfil con el que ingresaste</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/5 border border-accent/15">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <Badge className="mt-1 bg-accent/10 text-accent border-0">
                  Acceso gerencial
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              La sesión se cierra automáticamente tras 8 horas de inactividad.
            </p>
          </CardContent>
        </Card>

        {/* Permisos por rol */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Permisos por perfil
            </CardTitle>
            <CardDescription>Qué puede hacer cada acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <p className="text-sm font-medium text-foreground">Pastor · Gerencial</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Estadísticas, gráficos y reportes</li>
                <li>• Seguimiento de ausencias y retiros</li>
                <li>• Ver y administrar miembros (incl. eliminar)</li>
              </ul>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Somos Luz · Operativo</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Registrar miembros y visitantes</li>
                <li>• Tomar asistencia de los cultos</li>
                <li>• Eliminar requiere autorización del pastor</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Almacenamiento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Almacenamiento
            </CardTitle>
            <CardDescription>Dónde viven los datos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">Supabase (PostgreSQL)</p>
              <p className="text-xs text-muted-foreground">
                Los miembros, cultos, asistencias y retiros se guardan en la nube y
                se comparten entre todos los dispositivos en tiempo real.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Información del sistema
            </CardTitle>
            <CardDescription>Detalles técnicos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versión</span>
                <span className="text-foreground">1.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework</span>
                <span className="text-foreground">Next.js 16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base de datos</span>
                <span className="text-foreground">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Autenticación</span>
                <span className="text-foreground">Sesión cifrada (HMAC)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
