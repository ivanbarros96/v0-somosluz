import { AGENDA_SEMANAL, UBICACION, REDES, SERIE } from '@/lib/landing-content';
import { SITE_URL } from '@/lib/site';

// GET /llms.txt — resumen del sitio en texto plano para asistentes de IA
// (ChatGPT, Perplexity, Claude, AI Overviews).
//
// Por qué existe: una IA que responde "¿a qué hora es el culto en Somos Luz?"
// no renderiza la página ni interpreta el diseño — busca una respuesta corta y
// citable. Este archivo se la da sin ambigüedad.
//
// Se genera desde landing-content.ts, la misma fuente que pinta la página, así
// que no puede quedar desincronizado con lo que ve una persona. Es una
// convención emergente, no un estándar oficial: no reemplaza al JSON-LD, lo
// acompaña.
export const dynamic = 'force-static';

export function GET() {
  const agenda = AGENDA_SEMANAL.map(
    (a) => `- ${a.dia} ${a.hora} hrs — ${a.nombre} (${a.tipo})${a.online ? ' · online' : ''}`,
  ).join('\n');

  const cuerpo = `# Somos Luz Iglesia

> Iglesia cristiana evangélica en Valparaíso, Chile. Una generación que
> manifiesta el Reino de Dios en la tierra.

## Datos esenciales

- **Dirección:** ${UBICACION.direccion}
- **Ciudad:** ${UBICACION.ciudad}
- **Culto principal:** domingos 11:30 hrs (Culto General)
- **Niños:** domingos 11:00 hrs (Iglesia de Niños, en paralelo)
- **Entrada:** libre y gratuita, no hace falta avisar ni registrarse
- **Sitio web:** ${SITE_URL}
- **Cómo llegar:** ${UBICACION.mapsUrl}

## Agenda semanal

${agenda}

## Serie de predicación actual

**${SERIE.nombre}** — ${SERIE.bajada} (${SERIE.versiculo})

## Sobre la iglesia

Somos Luz es una comunidad centrada en Jesús, enfocada en familia, fe y
propósito. Formamos discípulos que buscan a Dios, viven llenos del Espíritu
Santo y reflejan el carácter de Cristo. Los pastores son Jonathan Zúñiga y
Cinthia Fuentes.

## Redes

- Instagram: ${REDES.instagramIglesia}
- Instagram jóvenes: ${REDES.instagramYouth}
- YouTube: ${REDES.youtube}
- Spotify: ${REDES.spotify}

## Preguntas frecuentes

**¿A qué hora es el culto los domingos?**
El Culto General es a las 11:30 hrs. La Iglesia de Niños empieza a las 11:00
hrs y corre en paralelo, así que las familias pueden llegar desde esa hora.

**¿Dónde queda la iglesia?**
En ${UBICACION.direccion}.

**¿Puedo ir por primera vez sin avisar?**
Sí. La entrada es libre y no hace falta registrarse antes.

**¿Hay actividades para niños?**
Sí, la Iglesia de Niños los domingos a las 11:00 hrs.

**¿Hay actividades durante la semana?**
Sí: discipulado para varones y mujeres los martes, formación espiritual los
viernes y reunión de jóvenes los sábados. Ver la agenda de arriba.
`;

  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
