import { docs } from 'collections/server';
import { renderPlaceholder } from 'fumadocs-core/mdx-plugins/remark-llms.runtime';
import type * as PageTree from 'fumadocs-core/page-tree';
import { loader } from 'fumadocs-core/source';
import { TYPE_TO_MARKER } from './remark-gfm-alert';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';

// Подробнее см. https://fumadocs.dev/docs/headless/source-api
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [],
});

// Синхронизированное содержимое имеет плоскую структуру (разделители meta.json, плоские URL-адреса /docs/*),
// поэтому разделы отображаются как фиксированные подписи. Группируем страницы каждого разделителя
// в узел папки, чтобы разделы боковой панели можно было сворачивать, не изменяя URL-адреса.
export function getSidebarTree(): PageTree.Root {
  const tree = source.getPageTree();
  const children: PageTree.Node[] = [];
  let section: PageTree.Folder | undefined;

  for (const node of tree.children) {
    if (node.type === 'separator') {
      section = {
        $id: node.$id ?? `section-${children.length}`,
        type: 'folder',
        name: node.name,
        defaultOpen: true,
        children: [],
      };
      children.push(section);
    } else if (section) {
      section.children.push(node);
    } else {
      children.push(node);
    }
  }

  return { ...tree, children: splitIntoTabs(children) };
}

function firstPage(nodes: PageTree.Node[]): PageTree.Item | undefined {
  for (const node of nodes) {
    if (node.type === 'page') return node;
    if (node.type === 'folder') {
      const found = firstPage(node.children);
      if (found) return found;
    }
  }
}

// Разделяем боковую панель на две вкладки макета («Документация» и «Руководства»),
// заключая разделы в папки `root: true`. Fumadocs формирует панель вкладок
// из корневых папок и показывает в боковой панели только поддерево активного корня;
// URL-адреса не меняются. `index` обязателен для корневой папки без непосредственных
// дочерних страниц — он становится адресом, на который ведёт ссылка вкладки.
function splitIntoTabs(sections: PageTree.Node[]): PageTree.Node[] {
  const guides = sections.find(
    (node): node is PageTree.Folder => node.type === 'folder' && node.name === 'Guides'
  );
  if (!guides) return sections;

  const rest = sections.filter((node) => node !== guides);
  const docsTab: PageTree.Folder = {
    $id: 'tab-documentation',
    type: 'folder',
    name: 'Документация',
    root: true,
    index: firstPage(rest),
    children: rest,
  };
  const guidesTab: PageTree.Folder = {
    ...guides,
    $id: 'tab-guides',
    root: true,
    index: firstPage(guides.children),
  };

  return [docsTab, guidesTab];
}

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');
  const markdown = await renderPlaceholder(processed, {
    Mermaid({ attributes }) {
      if (typeof attributes.chart !== 'string') return '';

      return `\`\`\`mermaid
${attributes.chart}
\`\`\``;
    },
    FileSteps({ attributes }) {
      if (typeof attributes.content !== 'string') return '';

      return `\`\`\`file-steps
${attributes.content}
\`\`\``;
    },
    Callout({ attributes, children }) {
      const marker = TYPE_TO_MARKER[String(attributes.type)] ?? 'NOTE';
      const body = String(children ?? '').trim();

      return [`> [!${marker}]`, ...body.split('\n').map((line) => `> ${line}`)].join('\n');
    },
    Accordions({ children }) {
      return String(children ?? '').trim();
    },
    Accordion({ attributes, children }) {
      const body = String(children ?? '').trim();

      return [`## ${attributes.title}`, body].filter(Boolean).join('\n\n') + '\n\n';
    },
  });

  return `# ${page.data.title} (${page.url})

${markdown}`;
}
