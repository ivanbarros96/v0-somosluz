import { Wifi, MapPin, ArrowDownRight, Navigation } from 'lucide-react';
import { AGENDA_SEMANAL, CULTO_GENERAL, UBICACION, COMO_LLEGAR } from '@/lib/landing-content';
import { Reveal } from './reveal';
import { LocationMap } from './location-map';

export function Schedule() {
  const cultoGeneral = AGENDA_SEMANAL.find((a) => a.destacado);
  const resto = AGENDA_SEMANAL.filter((a) => !a.destacado);

  return (
    <section id="horarios" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-card border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-14 lg:gap-20 items-start">
          {/* Culto General — protagonista tipográfico */}
          {cultoGeneral && (
            <Reveal>
              <p className="text-xs uppercase tracking-[0.35em] text-primary mb-6">
                Quiero visitar
              </p>
              <h2 className="font-serif font-semibold leading-none">
                <span className="block text-5xl sm:text-6xl text-foreground">
                  {cultoGeneral.dia}s
                </span>
                <span className="mt-2 block text-7xl sm:text-8xl lg:text-9xl text-primary tabular-nums tracking-tight">
                  {cultoGeneral.hora}
                </span>
              </h2>
              <p className="mt-3 text-sm uppercase tracking-[0.25em] text-muted-foreground">
                {cultoGeneral.nombre} · {cultoGeneral.tipo}
              </p>
              <p className="mt-6 max-w-lg text-muted-foreground leading-relaxed text-pretty">
                {CULTO_GENERAL.descripcion}
              </p>
              <p className="mt-8 inline-flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                {UBICACION.direccion}
              </p>

              {/* Quiero visitar — abre la app de navegación con la ruta */}
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={COMO_LLEGAR.googleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Navigation className="w-4 h-4" aria-hidden="true" />
                  Cómo llegar · Google Maps
                </a>
                <a
                  href={COMO_LLEGAR.waze}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 h-11 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Navigation className="w-4 h-4" aria-hidden="true" />
                  Waze
                </a>
              </div>
            </Reveal>
          )}

          {/* Semana — timeline editorial */}
          <Reveal delay={1}>
            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Durante la semana
              <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <ul className="divide-y divide-border">
              {resto.map((act) => (
                <li key={`${act.dia}-${act.hora}`} className="py-5 flex items-baseline gap-4">
                  <span className="w-14 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                    {act.dia.slice(0, 3)}
                  </span>
                  <span className="w-16 shrink-0 font-serif text-2xl text-primary tabular-nums">
                    {act.hora}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground leading-tight">{act.nombre}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      {act.tipo}
                      {act.online && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                            Online
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Mapa de la iglesia */}
        <Reveal>
          <div className="mt-14">
            <LocationMap />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
