import { Instagram } from 'lucide-react';
import { MINISTERIOS } from '@/lib/landing-content';
import { Reveal } from './reveal';

export function Ministries() {
  return (
    <section id="ministerios" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.35em] text-primary mb-4">Ministerios</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-balance">
              Hay un lugar para ti,{' '}
              <span className="italic text-primary">en cada etapa de la vida.</span>
            </h2>
          </div>
        </Reveal>

        <div className="border-t border-border">
          {MINISTERIOS.map((m, i) => (
            <Reveal key={m.id}>
              <article className="group grid sm:grid-cols-[auto_1fr_1.2fr] gap-4 sm:gap-10 items-baseline py-8 border-b border-border transition-colors hover:bg-secondary/40 sm:px-4 -mx-0 sm:-mx-4">
                <span
                  aria-hidden
                  className="font-serif text-2xl text-primary/40 tabular-nums group-hover:text-primary transition-colors"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight text-balance">
                    {m.nombre}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {m.publico}
                  </p>
                  <p className="mt-2 text-sm font-medium text-primary tabular-nums">{m.horario}</p>
                </div>
                <div>
                  <p className="text-muted-foreground leading-relaxed text-pretty">
                    {m.descripcion}
                  </p>
                  {m.instagram && (
                    <a
                      href={m.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium focus-visible:outline-2 focus-visible:outline-primary rounded"
                    >
                      <Instagram className="w-4 h-4" aria-hidden="true" />
                      @somosluz.youth
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
