'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, ChevronLeft, BookOpen, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type Profile = 'pastor' | 'somosluz' | null;

export default function IntranetLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [selectedProfile, setSelectedProfile] = useState<Profile>(null);
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

  function selectProfile(p: 'pastor' | 'somosluz') {
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

  // Pantalla de transición — iglesia que se "llena" mientras carga
  if (showTransition) {
    const isPastor = selectedProfile === 'pastor';
    const fillColor = isPastor ? '#fbbf24' : '#60a5fa';
    const fillY = 140 - (140 * progress) / 100;

    return (
      <div className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        isPastor ? 'bg-amber-950' : 'bg-blue-950'
      )}>
        <svg width="150" height="175" viewBox="0 0 120 140" className="mb-7">
          <defs>
            <clipPath id="fillClip">
              <rect x="0" y={fillY} width="120" height={140 - fillY} />
            </clipPath>
          </defs>

          {/* Silueta fantasma (siempre visible, tenue) */}
          <g fill={fillColor} fillOpacity={0.15}>
            <rect x="33.5" y="6" width="4" height="20" />
            <rect x="29.5" y="11" width="12" height="4" />
            <polygon points="24,42 47,42 35.5,24" />
            <rect x="28" y="42" width="15" height="78" />
            <polygon points="43,72 110,72 76.5,44" />
            <rect x="50" y="72" width="60" height="48" />
            <rect x="18" y="120" width="94" height="10" rx="2" />
          </g>

          {/* Relleno que sube con el progreso */}
          <g fill={fillColor} clipPath="url(#fillClip)">
            <rect x="33.5" y="6" width="4" height="20" />
            <rect x="29.5" y="11" width="12" height="4" />
            <polygon points="24,42 47,42 35.5,24" />
            <rect x="28" y="42" width="15" height="78" />
            <polygon points="43,72 110,72 76.5,44" />
            <rect x="50" y="72" width="60" height="48" />
            <rect x="18" y="120" width="94" height="10" rx="2" />
          </g>

          {/* Detalles: puerta y vitrales */}
          <g fill="none" stroke="white" strokeOpacity={0.4} strokeWidth={1.3}>
            <path d="M70 120 V100 a6.5 6.5 0 0 1 13 0 V120" />
            <circle cx="76.5" cy="88" r="4.5" />
            <circle cx="35.5" cy="66" r="3.2" />
          </g>
        </svg>

        <Image src="/logo.png" alt="Somos Luz" width={150} height={60} className="mb-5 brightness-0 invert opacity-90" />
        <p className="text-white/70 text-sm font-medium">
          {isPastor ? 'Preparando tu panel gerencial' : 'Cargando panel operativo'}
        </p>
        <div className="flex gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn('w-1.5 h-1.5 rounded-full animate-pulse', isPastor ? 'bg-yellow-400' : 'bg-blue-400')}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="Somos Luz" width={180} height={72} className="mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Sistema de Gestión Interna</p>
        </div>

        {/* Selector de perfil */}
        {!selectedProfile ? (
          <div className="space-y-3">
            <p className="text-center text-muted-foreground text-xs uppercase tracking-widest mb-5">
              Selecciona tu perfil de acceso
            </p>

            <button
              onClick={() => selectProfile('pastor')}
              className="w-full p-5 rounded-xl border border-border bg-card hover:bg-secondary hover:border-yellow-500/50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors shrink-0">
                  <BookOpen className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">Pastor</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Acceso gerencial · Estadísticas y reportes</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => selectProfile('somosluz')}
              className="w-full p-5 rounded-xl border border-border bg-card hover:bg-secondary hover:border-blue-500/50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors shrink-0">
                  <Sun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">Somos Luz</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Acceso operativo · Registro y asistencia</p>
                </div>
              </div>
            </button>
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
                ? 'border-yellow-500/20 bg-yellow-500/5'
                : 'border-blue-500/20 bg-blue-500/5'
            )}>
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                selectedProfile === 'pastor' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
              )}>
                {selectedProfile === 'pastor'
                  ? <BookOpen className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  : <Sun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                }
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">
                  {selectedProfile === 'pastor' ? 'Pastor' : 'Somos Luz'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {selectedProfile === 'pastor' ? 'Acceso gerencial' : 'Acceso operativo'}
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
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
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

        <div className="text-center mt-8">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            ← Volver al sitio principal
          </a>
        </div>
      </div>
    </div>
  );
}
