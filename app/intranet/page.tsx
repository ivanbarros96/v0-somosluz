'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, ChevronLeft, BookOpen, ClipboardList, Heart, Shield, GraduationCap, Flame, Baby, HeartHandshake, HandHeart, Users2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES, type UserRole } from '@/lib/roles';

type Profile = UserRole | null;

// Los perfiles agrupados. El login abre corto —solo los dos grupos— y recién
// al elegir uno se despliegan sus perfiles.
//
// La división no es cosmética: "Equipo" son los que navegan paneles de gestión
// y "Reuniones" los que solo marcan asistencia de su propia reunión — la misma
// frontera que aplica soloTomaAsistencia() en lib/roles.ts.
//
// Se evita a propósito la palabra "Ministerios": Discipulado es una reunión de
// formación, no un ministerio, y agruparlo así obligaba a llamarlo lo que no es.
//
// `corto` es el nombre para la vista previa de la tarjeta del grupo, donde los
// nombres completos no caben.
//
// ⚠️ Agregar acá TODO rol nuevo de lib/roles.ts. Si falta, el perfil existe y
// su contraseña funciona, pero nadie puede elegirlo.
// `satisfies` en vez de anotar el tipo: anotarlo colapsa cada `role` a UserRole
// y la verificación de abajo dejaría de detectar nada.
const GRUPOS = [
  {
    id: 'equipo',
    titulo: 'Equipo',
    icon: Users2,
    perfiles: [
      { role: 'pastor', icon: BookOpen, desc: 'Estadísticas y reportes' },
      { role: 'copastor', icon: HeartHandshake, desc: 'Seguimiento y cuidado de las personas' },
      { role: 'oracion', icon: HandHeart, desc: 'Peticiones de oración' },
      { role: 'somosluz', icon: ClipboardList, desc: 'Registro, miembros y asistencia' },
    ],
  },
  {
    id: 'reuniones',
    titulo: 'Reuniones',
    icon: CalendarDays,
    perfiles: [
      { role: 'kids', icon: Baby, desc: 'Niños · en paralelo al dominical' },
      { role: 'amadas', icon: Heart, desc: 'Mujeres' },
      { role: 'hombres', icon: Shield, desc: 'Varones', corto: 'Hombría' },
      { role: 'discipulado', icon: GraduationCap, desc: 'Formación · viernes', corto: 'Discipulado' },
      { role: 'youth', icon: Flame, desc: 'Jóvenes 15–20', corto: 'Youth' },
    ],
  },
] satisfies {
  id: string;
  titulo: string;
  icon: React.ElementType;
  perfiles: { role: UserRole; icon: React.ElementType; desc: string; corto?: string }[];
}[];

// Red de seguridad: si se agrega un rol a lib/roles.ts y se olvida acá, el
// perfil queda invisible en el login aunque su contraseña funcione —
// exactamente lo que pasó al crear el Co-pastor. Esto rompe el BUILD en vez de
// dejar que el error llegue a producción.
type RolesEnLogin = (typeof GRUPOS)[number]['perfiles'][number]['role'];
type FaltanEnLogin = Exclude<UserRole, RolesEnLogin>;
const _todosLosRolesEstanEnLogin: FaltanEnLogin extends never ? true : never = true;
void _todosLosRolesEstanEnLogin;

// Lista plana, solo para encontrar el ícono del perfil ya elegido. El tipo va
// explícito porque cada grupo tiene sus propios roles literales y flatMap no
// sabe unir esos arrays por su cuenta.
const PERFILES = GRUPOS.flatMap<{ role: UserRole; icon: React.ElementType; desc: string }>(
  (g) => g.perfiles,
);

export default function IntranetLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [selectedProfile, setSelectedProfile] = useState<Profile>(null);
  // Grupo desplegado. null = pantalla inicial, corta.
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace('/intranet/dashboard');
  }, [isAuthenticated, router]);

  // Animación de progreso post-login
  useEffect(() => {
    if (!showTransition) return;
    const duration = 3500;
    const interval = 20;
    const increment = 100 / (duration / interval);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) { clearInterval(timer); return 100; }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [showTransition]);

  useEffect(() => {
    if (progress >= 100) router.replace('/intranet/dashboard');
  }, [progress, router]);

  function selectProfile(p: UserRole) {
    setSelectedProfile(p);
    setPassword('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile || !password) return;

    setIsSubmitting(true);
    setError('');

    const ok = await login(selectedProfile, password);

    if (ok) {
      setShowTransition(true);
    } else {
      setError('Contraseña incorrecta');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setIsSubmitting(false);
    }
  }

  // Pantalla de transición — anillo de progreso minimalista
  if (showTransition) {
    const isPastor = selectedProfile === 'pastor';
    const accent = isPastor ? '#8a6d55' : '#6f814f'; // mocha pastor · salvia equipo
    const radius = 30;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - progress / 100);

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <div className="relative flex items-center justify-center mb-8">
          <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
            <circle cx="42" cy="42" r={radius} fill="none" strokeWidth="3" className="stroke-border" />
            <circle
              cx="42" cy="42" r={radius} fill="none" stroke={accent} strokeWidth="3"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 80ms linear' }}
            />
          </svg>
          <span className="absolute text-sm font-semibold tabular-nums text-foreground">
            {Math.round(progress)}%
          </span>
        </div>

        <Image src="/logo-trans.png" alt="Somos Luz" width={140} height={91} className="mb-3 opacity-95 h-14 w-auto" />
        <p className="text-muted-foreground text-sm">
          {isPastor ? 'Preparando tu panel gerencial' : 'Cargando panel operativo'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/logo-trans.png" alt="Somos Luz" width={180} height={117} className="mx-auto mb-3 h-20 w-auto" />
          <p className="text-muted-foreground text-sm">Sistema de Gestión Interna</p>
        </div>

        {/* Paso 1 — solo los grupos, para que la entrada se vea corta */}
        {!selectedProfile && !grupoAbierto ? (
          <div className="space-y-3">
            <p className="text-center text-muted-foreground text-xs uppercase tracking-widest mb-5">
              Selecciona tu perfil de acceso
            </p>
            {GRUPOS.map(({ id, titulo, icon: Icon, perfiles }) => (
              <button
                key={id}
                onClick={() => setGrupoAbierto(id)}
                className="w-full p-5 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold">{titulo}</p>
                    {/* Generada desde los perfiles: escrita a mano se quedaba
                        vieja al agregar un rol — así fue como Oración quedó
                        invisible acá. */}
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {perfiles.map((p) => ('corto' in p ? p.corto : ROLES[p.role].name)).join(' · ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : !selectedProfile && grupoAbierto ? (
          /* Paso 2 — los perfiles del grupo elegido */
          <div className="space-y-2">
            <button
              onClick={() => setGrupoAbierto(null)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-3 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </button>
            <p className="text-center text-muted-foreground text-xs uppercase tracking-widest mb-4">
              {GRUPOS.find((g) => g.id === grupoAbierto)?.titulo}
            </p>
            {GRUPOS.find((g) => g.id === grupoAbierto)?.perfiles.map(({ role, icon: Icon, desc }) => {
              // El Pastor conserva su color propio: es el único acceso
              // gerencial y se distingue del resto de un vistazo.
              const esPastor = role === 'pastor';
              return (
                <button
                  key={role}
                  onClick={() => selectProfile(role)}
                  className={cn(
                    'w-full p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-all duration-200 text-left group',
                    esPastor ? 'hover:border-accent/50' : 'hover:border-primary/50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors',
                        esPastor
                          ? 'bg-accent/10 border-accent/20 group-hover:bg-accent/20'
                          : 'bg-primary/10 border-primary/20 group-hover:bg-primary/20',
                      )}
                    >
                      <Icon className={cn('h-4 w-4', esPastor ? 'text-accent' : 'text-primary')} />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{ROLES[role].name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Formulario de contraseña */
          <div className={shake ? 'animate-shake' : ''}>
            <button
              onClick={() => { setSelectedProfile(null); setPassword(''); setError(''); }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Cambiar perfil
            </button>

            {/* Perfil seleccionado */}
            <div className={cn(
              'p-4 rounded-xl border mb-6 flex items-center gap-3',
              selectedProfile === 'pastor'
                ? 'border-accent/20 bg-accent/5'
                : 'border-primary/20 bg-primary/5'
            )}>
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                selectedProfile === 'pastor' ? 'bg-accent/10' : 'bg-primary/10'
              )}>
                {(() => {
                  const Icon = PERFILES.find((p) => p.role === selectedProfile)?.icon ?? BookOpen;
                  return (
                    <Icon
                      className={cn('h-5 w-5', selectedProfile === 'pastor' ? 'text-accent' : 'text-primary')}
                    />
                  );
                })()}
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">
                  {selectedProfile ? ROLES[selectedProfile].name : ''}
                </p>
                <p className="text-muted-foreground text-xs">
                  {selectedProfile ? `Acceso ${ROLES[selectedProfile].badge.toLowerCase()}` : ''}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11"
                  autoFocus
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="text-sm text-destructive text-center bg-destructive/10 py-2 px-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className={cn(
                  'w-full h-11 font-semibold',
                  selectedProfile === 'pastor'
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    : ''
                )}
                disabled={isSubmitting || !password}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando acceso...
                  </span>
                ) : 'Ingresar'}
              </Button>
            </form>
          </div>
        )}

        {/* Salida para los líderes SIN cuenta. Varios ministerios los tienen y
            son justamente los que necesitan coordinar fechas, así que ni ver el
            calendario ni pedir una fecha pueden depender de tener acceso. Sólo
            se muestra en la pantalla inicial: una vez que alguien eligió su
            perfil, ya va a entrar. */}
        {!selectedProfile && (
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              ¿Eres líder y no tienes acceso?
            </p>
            <a
              href="/intranet/calendario"
              className="inline-flex items-center gap-1.5 mt-1.5 text-sm font-medium text-primary hover:underline"
            >
              <CalendarDays className="h-4 w-4" />
              Ver el calendario o pedir una fecha
            </a>
          </div>
        )}

        <div className="text-center mt-8">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            ← Volver al sitio principal
          </a>
        </div>
      </div>
    </div>
  );
}
