import { Button } from '@/components/ui/button';
import { Instagram, CalendarDays } from 'lucide-react';
import { HERO, REDES } from '@/lib/landing-content';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-36 px-4 sm:px-6 lg:px-8">
      {/* Resplandor cálido: "luz" como concepto visual */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,oklch(0.9_0.06_75/.55),transparent)]"
      />
      <div className="relative max-w-6xl mx-auto text-center">
        <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground mb-6">
          {HERO.overline}
        </p>
        <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl italic font-medium text-primary mb-6 text-balance">
          {HERO.titulo}
        </h1>
        <p className="text-lg sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
          {HERO.subtitulo}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#horarios">
            <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <CalendarDays className="w-5 h-5 mr-2" />
              Planea tu visita
            </Button>
          </a>
          <a href={REDES.instagramIglesia} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
            >
              <Instagram className="w-5 h-5 mr-2" />
              Síguenos en Instagram
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
