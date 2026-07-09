import { Button } from '@/components/ui/button';
import { Instagram, Youtube, Play, Music } from 'lucide-react';
import { REDES, SERIE } from '@/lib/landing-content';
import { Reveal } from './reveal';

const CANALES = [
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
];

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

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-14 lg:gap-20 items-center">
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

          {/* Portada de la serie — arte tipográfico estilo covers del IG */}
          <Reveal delay={1}>
            <div className="relative max-w-sm mx-auto w-full">
              {/* Marco offset, eco del retrato de pastores */}
              <div
                aria-hidden
                className="absolute -inset-2 translate-x-4 translate-y-4 rounded-2xl border-2 border-[oklch(0.85_0.05_95_/_0.3)]"
              />
              <div
                aria-hidden="true"
                className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,oklch(0.75_0.09_80/.55),transparent_60%),radial-gradient(ellipse_90%_70%_at_50%_115%,oklch(0.32_0.04_130/.6),transparent_65%)] [background-color:oklch(0.21_0.015_60)] border border-[oklch(0.45_0.03_80_/_0.4)] flex flex-col items-center justify-center text-center p-8"
              >
                {/* Halo de luz */}
                <div
                  className="absolute w-56 h-56 rounded-full border border-[oklch(0.8_0.07_85_/_0.25)] blur-[1px]"
                />
                <p className="relative text-[0.6rem] uppercase tracking-[0.45em] text-[oklch(0.75_0.04_85)] mb-6">
                  Somos Luz · Serie
                </p>
                <p className="relative font-script text-6xl leading-none text-[oklch(0.95_0.03_90)] -rotate-2">
                  No pierdas
                </p>
                <p className="relative mt-3 font-serif font-bold text-4xl uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-[oklch(0.95_0.04_90)] to-[oklch(0.72_0.08_80)]">
                  La Esencia
                </p>
                <p className="relative mt-8 text-[0.65rem] uppercase tracking-[0.35em] text-[oklch(0.7_0.04_85)]">
                  {SERIE.versiculo}
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Nuestra música — player de Spotify de la iglesia */}
        <Reveal>
          <div className="mt-16">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-[oklch(0.88_0.05_95)]" aria-hidden="true" />
              <h3 className="text-sm uppercase tracking-[0.3em] text-[oklch(0.88_0.05_95)]">
                Nuestra música
              </h3>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-[oklch(0.85_0.02_100_/_0.2)]">
              <iframe
                title="Somos Luz en Spotify"
                src={`https://open.spotify.com/embed/artist/${REDES.spotifyArtistId}?utm_source=generator&theme=0`}
                className="w-full h-[352px]"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            </div>
          </div>
        </Reveal>

        {/* Canales */}
        <Reveal>
          <ul className="mt-8 grid sm:grid-cols-3 gap-3">
            {CANALES.map((c) => (
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
