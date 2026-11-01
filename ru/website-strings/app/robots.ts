import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/shared';

// Статический robots.txt, формируемый при статическом экспорте.
export const revalidate = false;

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
