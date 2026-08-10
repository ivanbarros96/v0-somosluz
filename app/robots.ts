import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // La intranet no debe indexarse. El registro público tampoco: es un link
      // que se comparte a mano, no algo que deba aparecer en Google.
      // Ojo: esto evita que lo indexen, NO que alguien entre. La protección
      // real es que todo lo que llega queda pendiente de aprobación.
      disallow: ['/intranet', '/registro'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
