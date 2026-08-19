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

  // Cada reunión como Event recurrente. El openingHours de arriba dice "está
  // abierto"; esto dice "esto pasa acá, este día, a esta hora, y cualquiera
  // puede venir" — que es lo que un asistente de IA necesita para responder
  // "¿a qué hora es el culto en Somos Luz?" con una frase citable.
  //
  // Todos los datos salen de AGENDA_SEMANAL, la misma fuente que pinta la
  // agenda visible en la página: si cambia un horario, cambian los dos juntos.
  // Marcar aquí algo que no esté a la vista contradice las guías de Google.
  const eventos = AGENDA_SEMANAL.map((a) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: a.nombre,
    description: a.tipo,
    eventSchedule: {
      '@type': 'Schedule',
      byDay: `https://schema.org/${DIAS_SCHEMA[a.dia] ?? a.dia}`,
      startTime: a.hora,
      repeatFrequency: 'P1W',
      scheduleTimezone: 'America/Santiago',
    },
    eventAttendanceMode: a.online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: a.online
      ? { '@type': 'VirtualLocation', url: REDES.instagramIglesia }
      : {
          '@type': 'Place',
          name: 'Somos Luz Iglesia',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Almirante Goñi 251, esquina Cochrane',
            addressLocality: 'Valparaíso',
            addressRegion: 'Valparaíso',
            addressCountry: 'CL',
          },
        },
    organizer: { '@type': 'Church', name: 'Somos Luz Iglesia', url: SITE_URL },
    isAccessibleForFree: true,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        // JSON generado desde datos propios (no input de usuario) → seguro
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventos) }}
      />
    </>
  );
}
