import { SOBRE_NOSOTROS } from '@/lib/landing-content';

export function About() {
  return (
    <section id="nosotros" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold mb-10">Sobre Nosotros</h2>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty mb-12">
          {SOBRE_NOSOTROS.parrafo}
        </p>
        <blockquote className="border-t border-border pt-10">
          <p className="font-serif italic text-xl sm:text-2xl text-primary text-balance mb-3">
            “{SOBRE_NOSOTROS.versiculo}”
          </p>
          <cite className="text-sm uppercase tracking-widest text-muted-foreground not-italic">
            — {SOBRE_NOSOTROS.cita}
          </cite>
        </blockquote>
      </div>
    </section>
  );
}
