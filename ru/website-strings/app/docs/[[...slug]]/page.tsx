import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';

// ВРЕМЕННО (2026-08-21): страница «Обзор» (индекс документации, доступный по /docs)
// временно убрана из docs.sync.config.mjs, пока она переписывается, поэтому
// индексной страницы нет. Cloudflare перенаправляет /docs через public/_redirects; эта
// страница с meta-refresh служит запасным вариантом для локальной разработки и статического экспорта
// (который не может выполнять HTTP-перенаправления), по аналогии с app/page.tsx.
// Удалите эту константу, два её использования ниже и параметр `{ slug: [] }`
// после восстановления страницы «Обзор».
const TEMP_DOCS_INDEX_REDIRECT = '/docs/ru';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    if (!params.slug?.length) {
      return (
        <>
          <meta httpEquiv="refresh" content={`0; url=${TEMP_DOCS_INDEX_REDIRECT}`} />
          <p>
            Перенаправление на обзор <a href={TEMP_DOCS_INDEX_REDIRECT}>OpenSpec RU</a>…
          </p>
        </>
      );
    }
    notFound();
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      breadcrumb={{ enabled: true, includeRoot: false, includePage: false }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${
            page.data.githubSource ?? `website/content/docs/${page.path}`
          }`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // это позволяет ссылаться на другие страницы по относительным путям к файлам
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params: { slug: string[] }[] = source.generateParams();
  // ВРЕМЕННО: генерировать /docs даже без индексной страницы, чтобы статический экспорт
  // включал приведённый выше запасной вариант с meta-refresh.
  if (!params.some((p) => !p.slug?.length)) params.push({ slug: [] });
  return params;
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    // ВРЕМЕННО: метаданные для запасного варианта перенаправления /docs (см. Page выше).
    if (!params.slug?.length) return { title: 'Документация', robots: { index: false } };
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
