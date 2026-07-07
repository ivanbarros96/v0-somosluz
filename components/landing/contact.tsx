import { Instagram, MapPin, Youtube, Navigation } from 'lucide-react';
import { REDES, UBICACION } from '@/lib/landing-content';

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  UBICACION.mapsQuery,
)}`;

export function Contact() {
  return (
    <section id="contacto" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-center mb-12">
          Conecta con Nosotros
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="text-center">
            <Instagram className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Instagram</h3>
            <div className="flex flex-col gap-1">
              <a
                href={REDES.instagramIglesia}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm font-medium"
              >
                @somosluz.iglesia
              </a>
              <a
                href={REDES.instagramYouth}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm font-medium"
              >
                @somosluz.youth
              </a>
            </div>
          </div>

          <div className="text-center">
            <Youtube className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">YouTube</h3>
            <a
              href={REDES.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm font-medium"
            >
              Somos Luz Iglesia
            </a>
          </div>

          <div className="text-center">
            <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Ubicación</h3>
            <p className="text-muted-foreground text-sm mb-1">
              {UBICACION.direccion ?? UBICACION.ciudad}
            </p>
            <p className="text-sm font-semibold">¡Ven a visitarnos!</p>
          </div>
        </div>

        {/* Cómo llegar — enlace a Google Maps (su geocoder resuelve la intersección
            y en móvil abre la app). Embed real pendiente del pin exacto de la iglesia. */}
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-secondary/50 to-card p-6 sm:p-8 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Nos reunimos en</p>
              <p className="text-muted-foreground text-sm">{UBICACION.direccion}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
            <Navigation className="w-4 h-4" />
            Cómo llegar
          </span>
        </a>
      </div>
    </section>
  );
}
