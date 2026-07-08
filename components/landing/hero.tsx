import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Instagram, CalendarDays, MapPin } from 'lucide-react';
import { HERO, REDES, UBICACION, AGENDA_SEMANAL } from '@/lib/landing-content';

export function Hero() {
  const culto = AGENDA_SEMANAL.find((a) => a.destacado);

  return (
    <section className="hero-luz relative overflow-hidden min-h-[92svh] flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Rayos de luz decorativos */}
      <div aria-hidden className="hero-rayos absolute inset-0 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto text-center w-full">
        <p className="reveal in-view text-[0.7rem] sm:text-xs uppercase tracking-[0.35em] text-[oklch(0.8_0.04_85)] mb-8">
          {HERO.overline}
        </p>

        {/* Logo real de la iglesia, versión crema para fondo oscuro */}
        <h1 className="mb-4">
          <span className="sr-only">{HERO.titulo} Iglesia</span>
          <Image
            src="/logo-cream.png"
            alt=""
            aria-hidden="true"
            width={1600}
            height={1036}
            priority
            className="mx-auto w-[19rem] sm:w-[26rem] lg:w-[32rem] h-auto drop-shadow-[0_0_45px_oklch(0.8_0.08_80_/_0.35)]"
          />
        </h1>

        <p className="font-serif italic text-xl sm:text-3xl text-[oklch(0.88_0.02_85)] max-w-3xl mx-auto mt-8 mb-12 text-pretty">
          {HERO.subtitulo}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#horarios">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base"
            >
              <CalendarDays className="w-5 h-5 mr-2" aria-hidden="true" />
              Planea tu visita
            </Button>
          </a>
          <a href={REDES.instagramIglesia} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-[oklch(0.85_0.02_85_/_0.4)] bg-transparent text-[oklch(0.92_0.01_85)] hover:bg-[oklch(0.92_0.01_85_/_0.1)] hover:text-[oklch(0.97_0.01_85)] px-8 h-12 text-base"
            >
              <Instagram className="w-5 h-5 mr-2" aria-hidden="true" />
              Síguenos en Instagram
            </Button>
          </a>
        </div>

        {/* Datos esenciales: cuándo y dónde */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-sm text-[oklch(0.78_0.02_85)]">
          {culto && (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[oklch(0.8_0.06_85)]" aria-hidden="true" />
              {culto.dia}s · <span className="tabular-nums">{culto.hora}</span> hrs
            </span>
          )}
          <span aria-hidden className="hidden sm:block w-px h-4 bg-[oklch(0.5_0.02_80)]" />
          <span className="inline-flex items-center gap-2 text-center">
            <MapPin className="w-4 h-4 text-[oklch(0.8_0.06_85)]" aria-hidden="true" />
            {UBICACION.direccion}
          </span>
        </div>
      </div>
    </section>
  );
}
