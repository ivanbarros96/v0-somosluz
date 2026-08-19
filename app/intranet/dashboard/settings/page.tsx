'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Database, Info, BookOpen, ClipboardList, HeartHandshake, HandHeart, CalendarDays, Baby } from 'lucide-react';
import { ROLES } from '@/lib/roles';
import { cn } from '@/lib/utils';

// Qué puede hacer cada acceso. Nombres e insignias salen de lib/roles.ts:
// escritos a mano quedaban viejos cada vez que se renombraba un perfil.
//
// Las cuatro reuniones de adultos van en un solo bloque porque comparten
// exactamente los mismos permisos; Kids va aparte porque tiene reglas propias.
const PERMISOS = [
  {
    titulo: `${ROLES.pastor.name} · ${ROLES.pastor.badge}`,
    icon: BookOpen,
    destacado: true,
    puntos: [
      'Estadísticas, gráficos y reportes',
      'Ve el seguimiento del Co-pastor, sin registrar',
      'Finanzas, reservas y configuración',
      'Ver y administrar miembros (incl. eliminar)',
    ],
  },
  {
    titulo: `${ROLES.copastor.name} · ${ROLES.copastor.badge}`,
    icon: HeartHandshake,
    destacado: false,
    puntos: [
      'Seguimiento: registra llamadas y cierra casos',
      'Ve y registra miembros',
      'No entra a Finanzas, Reservas ni Configuración',
    ],
  },
  {
    titulo: `${ROLES.oracion.name} · ${ROLES.oracion.badge}`,
    icon: HandHeart,
    destacado: false,
    puntos: [
      'Solo entra al panel de peticiones de oración',
      'Anota peticiones de los miembros y cambia su estado',
      'No ve el resto de la intranet',
    ],
  },
  {
    titulo: `${ROLES.somosluz.name} · ${ROLES.somosluz.badge}`,
    icon: ClipboardList,
    destacado: false,
    puntos: [
      'Registrar miembros y visitantes',
      'Abrir, tomar y cerrar la asistencia de los cultos',
      'Cumpleaños',
      'Eliminar requiere autorización del pastor',
    ],
  },
  {
    titulo: `${ROLES.amadas.name}, ${ROLES.hombres.name}, ${ROLES.discipulado.name} y ${ROLES.youth.name} · ${ROLES.amadas.badge}`,
    icon: CalendarDays,
    destacado: false,
    puntos: [
      'Solo toman la asistencia de su propia reunión',
      'No ven el resto de la intranet',
    ],
  },
  {
    titulo: `${ROLES.kids.name} · ${ROLES.kids.badge}`,
    icon: Baby,
    destacado: false,
    puntos: [
      'Toma la asistencia de la clase de niños',
      'Su culto se abre y se cierra junto con el dominical, no lo maneja ella',
      'Solo ve la clase abierta y no puede desmarcar adultos',
    ],
  },
];

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
            {PERMISOS.map(({ titulo, icon: Icon, destacado, puntos }) => (
              <div key={titulo} className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('w-4 h-4', destacado ? 'text-accent' : 'text-primary')} />
                  <p className="text-sm font-medium text-foreground">{titulo}</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {puntos.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
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
