import type { MetadataRoute } from 'next';

// Manifest de la web app. Define cómo se ve el sitio al guardarlo en la
// pantalla de inicio del teléfono. Colores tomados del Manual de Marca:
// verde bosque #223F2F y crema #ECE9D8.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Somos Luz Iglesia',
    short_name: 'Somos Luz',
    description:
      'Iglesia Cristiana en Valparaíso, Chile. Culto general los domingos a las 11:30 hrs.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ECE9D8',
    theme_color: '#223F2F',
    lang: 'es-CL',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // maskable: Android recorta el icono en círculo y sin esto queda con
      // bordes blancos.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
