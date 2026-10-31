import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

// Статическая карта сайта, создаваемая как sitemap.xml при статическом экспорте.
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, '');
  // `/` перенаправляет на /docs, поэтому карта сайта состоит только из страниц
  // документации; главная страница документации получает наивысший приоритет.
  return source.getPages().map((page) => ({
    url: `${base}${page.url}`,
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 1 : 0.7,
  }));
}
