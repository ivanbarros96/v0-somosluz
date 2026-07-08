import { SOBRE_NOSOTROS, PULL_QUOTE } from '@/lib/landing-content';
import { Reveal } from './reveal';

export function About() {
  return (
    <section id="nosotros" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-start">
        {/* Pull-quote editorial — cita del Instagram sobre la construcción */}
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.35em] text-primary mb-6">Sobre Nosotros</p>
            <blockquote className="relative">
              <span
                aria-hidden
                className="absolute -top-10 -left-3 font-serif text-[7rem] leading-none text-primary/15 select-none"
              >
                “
              </span>
              <p className="font-serif italic text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight text-foreground text-balance">
                {PULL_QUOTE.texto}
              </p>
            </blockquote>
            <p className="mt-6 text-primary font-medium">{PULL_QUOTE.contexto}</p>
          </div>
        </Reveal>

        {/* Visión + versículo */}
        <Reveal delay={1}>
          <div className="border-l-2 border-primary/30 pl-6 sm:pl-10">
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
              {SOBRE_NOSOTROS.parrafo}
            </p>
            <div className="mt-10 pt-8 border-t border-border">
              <p className="font-serif italic text-xl text-primary text-balance mb-2">
                “{SOBRE_NOSOTROS.versiculo}”
              </p>
              <cite className="text-xs uppercase tracking-[0.25em] text-muted-foreground not-italic">
                {SOBRE_NOSOTROS.cita}
              </cite>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
