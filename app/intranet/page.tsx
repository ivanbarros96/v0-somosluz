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

  // Pantalla de transición — anillo de progreso minimalista
  if (showTransition) {
    const isPastor = selectedProfile === 'pastor';
    const accent = isPastor ? '#f59e0b' : '#3b82f6';
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

        {/* Selector de perfil */}
        {!selectedProfile ? (
          <div className="space-y-3">
            <p className="text-center text-muted-foreground text-xs uppercase tracking-widest mb-5">
              Selecciona tu perfil de acceso
            </p>

            <button
              onClick={() => selectProfile('pastor')}
              className="w-full p-5 rounded-xl border border-border bg-card hover:bg-secondary hover:border-accent/50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                  <BookOpen className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">Pastor</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Acceso gerencial · Estadísticas y reportes</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => selectProfile('somosluz')}
              className="w-full p-5 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <Sun className="h-5 w-5 text-primary" />
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
                ? 'border-accent/20 bg-accent/5'
                : 'border-primary/20 bg-primary/5'
            )}>
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                selectedProfile === 'pastor' ? 'bg-accent/10' : 'bg-primary/10'
              )}>
                {selectedProfile === 'pastor'
                  ? <BookOpen className="h-5 w-5 text-accent" />
                  : <Sun className="h-5 w-5 text-primary" />
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

        <div className="text-center mt-8">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            ← Volver al sitio principal
          </a>
        </div>
      </div>
    </div>
  );
}
