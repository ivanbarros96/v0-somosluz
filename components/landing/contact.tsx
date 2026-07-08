import { Instagram, MapPin, Youtube, Navigation } from 'lucide-react';
import { REDES, UBICACION } from '@/lib/landing-content';
import { Reveal } from './reveal';

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  UBICACION.mapsQuery,
)}`;

// Cierre oscuro cálido: contacto + invitación, continúa en el footer.
export function Contact() {
  return (
    <section
      id="contacto"
      className="relative overflow-hidden pt-20 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-[oklch(0.23_0.015_60)]"
    >
      {/* Brillo dorado inferior — la luz permanece encendida */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_115%,oklch(0.7_0.08_80/.3),transparent_65%)] pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.35em] text-[oklch(0.75_0.04_85)] mb-6">
              Conecta con nosotros
            </p>
            <h2 className="font-serif text-4xl sm:text-6xl font-semibold text-[oklch(0.96_0.01_88)] text-balance">
              Siempre habrá{' '}
              <span className="italic text-[oklch(0.85_0.07_85)]">un lugar para ti.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 text-center">
            <div>
              <Instagram className="w-8 h-8 text-[oklch(0.82_0.06_85)] mx-auto mb-4" aria-hidden="true" />
              <h3 className="font-medium text-[oklch(0.95_0.01_88)] mb-2">Instagram</h3>
              <div className="flex flex-col gap-1.5">
                <a
                  href={REDES.instagramIglesia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[oklch(0.8_0.03_85)] hover:text-[oklch(0.95_0.01_88)] transition-colors focus-visible:outline-2 focus-visible:outline-[oklch(0.95_0.01_88)] rounded"
                >
                  @somosluz.iglesia
                </a>
                <a
                  href={REDES.instagramYouth}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[oklch(0.8_0.03_85)] hover:text-[oklch(0.95_0.01_88)] transition-colors focus-visible:outline-2 focus-visible:outline-[oklch(0.95_0.01_88)] rounded"
                >
                  @somosluz.youth
                </a>
              </div>
            </div>

            <div>
              <Youtube className="w-8 h-8 text-[oklch(0.82_0.06_85)] mx-auto mb-4" aria-hidden="true" />
              <h3 className="font-medium text-[oklch(0.95_0.01_88)] mb-2">YouTube</h3>
              <a
                href={REDES.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[oklch(0.8_0.03_85)] hover:text-[oklch(0.95_0.01_88)] transition-colors focus-visible:outline-2 focus-visible:outline-[oklch(0.95_0.01_88)] rounded"
              >
                Somos Luz Iglesia
              </a>
            </div>

            <div>
              <MapPin className="w-8 h-8 text-[oklch(0.82_0.06_85)] mx-auto mb-4" aria-hidden="true" />
              <h3 className="font-medium text-[oklch(0.95_0.01_88)] mb-2">Ubicación</h3>
              <p className="text-sm text-[oklch(0.8_0.03_85)] mb-3 text-pretty">
                {UBICACION.direccion}
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[oklch(0.9_0.05_90)] hover:text-[oklch(0.97_0.02_90)] transition-colors focus-visible:outline-2 focus-visible:outline-[oklch(0.95_0.01_88)] rounded"
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                Cómo llegar
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
