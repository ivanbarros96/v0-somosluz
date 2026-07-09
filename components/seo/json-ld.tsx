import { UBICACION, REDES, AGENDA_SEMANAL } from '@/lib/landing-content';
import { SITE_URL } from '@/lib/site';

// Datos estructurados schema.org para SEO local (Google entiende que es una iglesia,
// con dirección, ubicación, horarios y redes → rich results y Google Maps/Search).
const DIAS_SCHEMA: Record<string, string> = {
  Domingo: 'Sunday',
  Lunes: 'Monday',
  Martes: 'Tuesday',
  Miércoles: 'Wednesday',
  Jueves: 'Thursday',
  Viernes: 'Friday',
  Sábado: 'Saturday',
};

export function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: 'Somos Luz Iglesia',
    alternateName: 'Iglesia Somos Luz',
    description:
      'Iglesia Cristiana en Valparaíso, Chile. Una generación que manifiesta el Reino de Dios en la tierra.',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/og.png`,
    telephone: undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Almirante Goñi 251, esquina Cochrane',
      addressLocality: 'Valparaíso',
      addressRegion: 'Valparaíso',
      addressCountry: 'CL',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: UBICACION.lat,
      longitude: UBICACION.lon,
    },
    hasMap: UBICACION.mapsUrl,
    sameAs: [REDES.instagramIglesia, REDES.instagramYouth, REDES.youtube, REDES.spotify],
    openingHoursSpecification: AGENDA_SEMANAL.filter((a) => !a.online).map((a) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DIAS_SCHEMA[a.dia] ?? a.dia,
      opens: a.hora,
    })),
  };

  return (
    <script
      type="application/ld+json"
      // JSON generado desde datos propios (no input de usuario) → seguro
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
