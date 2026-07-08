import { Button } from '@/components/ui/button';
import { Instagram, Youtube, Play } from 'lucide-react';
import { REDES, SERIE } from '@/lib/landing-content';
import { Reveal } from './reveal';

// Sección "Serie actual" — sobre verde salvia profundo, como las portadas del feed.
export function Media() {
  return (
    <section
      id="predicaciones"
      className="relative overflow-hidden py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[oklch(0.38_0.045_130)]"
    >
      {/* Luz suave sobre el fondo salvia */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_0%,oklch(0.6_0.06_110/.35),transparent_65%)] pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-14 items-center">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.35em] text-[oklch(0.85_0.04_110)] mb-5">
            {SERIE.etiqueta}
          </p>
          <h2 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-semibold text-[oklch(0.97_0.01_90)] leading-[1.05] text-balance">
            {SERIE.nombre}
          </h2>
          <p className="mt-4 font-script text-3xl sm:text-4xl text-[oklch(0.88_0.05_95)]">
            {SERIE.bajada}
          </p>
          <p className="mt-7 max-w-xl text-[oklch(0.88_0.02_100)] leading-relaxed text-pretty">
            {SERIE.descripcion}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[oklch(0.8_0.03_105)]">
            — {SERIE.versiculo}
          </p>

          <div className="mt-10">
            <a href={REDES.youtube} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-[oklch(0.97_0.01_90)] text-[oklch(0.35_0.04_130)] hover:bg-[oklch(0.92_0.02_90)] px-8 h-12 text-base"
              >
                <Play className="w-5 h-5 mr-2" aria-hidden="true" />
                Ver predicaciones
              </Button>
            </a>
          </div>
        </Reveal>

        {/* Canales */}
        <Reveal delay={1}>
          <ul className="space-y-3">
            {[
              {
                href: REDES.youtube,
                icon: Youtube,
                titulo: 'YouTube',
                detalle: 'Mensajes completos cada semana',
              },
              {
                href: REDES.instagramIglesia,
                icon: Instagram,
                titulo: '@somosluz.iglesia',
                detalle: 'Devocionales y vida de la iglesia',
              },
              {
                href: REDES.instagramYouth,
                icon: Instagram,
                titulo: '@somosluz.youth',
                detalle: 'La generación joven',
              },
            ].map((c) => (
              <li key={c.titulo}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-xl border border-[oklch(0.85_0.02_100_/_0.25)] bg-[oklch(0.97_0.01_90_/_0.06)] hover:bg-[oklch(0.97_0.01_90_/_0.14)] transition-colors p-4 focus-visible:outline-2 focus-visible:outline-[oklch(0.97_0.01_90)]"
                >
                  <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[oklch(0.97_0.01_90_/_0.12)] shrink-0">
                    <c.icon className="w-5 h-5 text-[oklch(0.95_0.02_95)]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-[oklch(0.97_0.01_90)] truncate">
                      {c.titulo}
                    </span>
                    <span className="block text-sm text-[oklch(0.85_0.02_100)] truncate">
                      {c.detalle}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
