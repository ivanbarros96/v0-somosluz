import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // La intranet no debe indexarse
      disallow: '/intranet',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
