import { MapPin } from 'lucide-react';
import { UBICACION } from '@/lib/landing-content';

// Mapa de Google Maps (Embed API). Si no hay key configurada, muestra un panel
// de respaldo de marca en vez de un mapa de terceros con estilo ajeno.
// La key gratuita va en NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY (env de Vercel).
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;

export function LocationMap() {
  if (KEY) {
    const src = `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${UBICACION.lat},${UBICACION.lon}&zoom=16&language=es&region=CL`;
    return (
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-background">
        <iframe
          title="Ubicación de Somos Luz Iglesia — Almirante Goñi 251, Valparaíso"
          src={src}
          className="w-full h-[300px] sm:h-[380px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  // Respaldo de marca (sin key): panel cálido con la dirección, no un mapa ajeno.
  return (
    <a
      href={UBICACION.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col items-center justify-center gap-3 h-[300px] sm:h-[380px] rounded-2xl border border-border shadow-sm overflow-hidden bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,oklch(0.62_0.05_130/.12),transparent_70%)] bg-secondary/40 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {/* Retícula sutil tipo mapa */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:38px_38px]"
      />
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 group-hover:bg-primary/25 transition-colors">
        <MapPin className="w-7 h-7 text-primary" aria-hidden="true" />
      </span>
      <p className="relative font-medium text-foreground">{UBICACION.direccion}</p>
      <p className="relative text-sm text-primary">Ver en Google Maps →</p>
    </a>
  );
}
