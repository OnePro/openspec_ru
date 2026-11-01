// Преобразует разделы `##` с вопросами на странице FAQ в элементы
// Fumadocs Accordion с помощью того же внедрения mdxJsxFlowElement, которое
// используют remarkGfmAlert и remarkFileSteps, чтобы на GitHub в документе
// оставались обычные заголовки, а сайт отображал сворачиваемый FAQ.
//
// Применяется только к файлам с именем `faq` (синхронизированный
// content/docs/faq.md); остальные страницы сохраняют свои заголовки. Каждый
// аккордеон получает идентификатор в виде slug в стиле GitHub, чтобы существующие
// прямые ссылки `#heading-anchor` по-прежнему открывали нужный вопрос.
// getLLMText (lib/source.ts) преобразует аккордеоны обратно в заголовки `##`.

interface Node {
  type: string;
  depth?: number;
  value?: string;
  children?: Node[];
  [key: string]: unknown;
}

function toText(node: Node): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  return (node.children ?? []).map(toText).join('');
}

// Соответствует github-slugger для заголовков из обычного текста — именно его
// использовали синхронизированные якоря заголовков.
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function accordion(title: string, children: Node[]): Node {
  return {
    type: 'mdxJsxFlowElement',
    name: 'Accordion',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'title', value: title },
      { type: 'mdxJsxAttribute', name: 'id', value: slugify(title) },
    ],
    children,
  };
}

export function remarkFaq() {
  return (tree: Node, file: { stem?: string | null }) => {
    if (file.stem !== 'faq' || !tree.children) return;

    const first = tree.children.findIndex(
      (child) => child.type === 'heading' && child.depth === 2,
    );
    if (first === -1) return;

    const accordions: Node[] = [];
    let title: string | undefined;
    let body: Node[] = [];
    for (const child of tree.children.slice(first)) {
      if (child.type === 'heading' && child.depth === 2) {
        if (title !== undefined) accordions.push(accordion(title, body));
        title = toText(child);
        body = [];
      } else {
        body.push(child);
      }
    }
    if (title !== undefined) accordions.push(accordion(title, body));

    tree.children = [
      ...tree.children.slice(0, first),
      { type: 'mdxJsxFlowElement', name: 'Accordions', attributes: [], children: accordions },
    ];
  };
}
