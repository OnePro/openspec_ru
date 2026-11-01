// Преобразует оповещения в блочных цитатах в стиле GitHub (`> [!NOTE]`) в элементы
// Fumadocs Callout, используя то же внедрение mdxJsxFlowElement, что и remarkMdxMermaid,
// чтобы документация сохраняла синтаксис GitHub, а сайт отображал стилизованные выноски.
//
// Соответствие маркеров и Callout биективно, поэтому getLLMText (lib/source.ts) может
// выполнять обратное преобразование заполнителя Callout в исходный синтаксис блочной цитаты.

const MARKER_TO_TYPE: Record<string, string> = {
  NOTE: 'info',
  TIP: 'idea',
  IMPORTANT: 'warn',
  WARNING: 'warning',
  CAUTION: 'error',
};

export const TYPE_TO_MARKER: Record<string, string> = Object.fromEntries(
  Object.entries(MARKER_TO_TYPE).map(([marker, type]) => [type, marker]),
);

const MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/;

interface Node {
  type: string;
  value?: string;
  children?: Node[];
  [key: string]: unknown;
}

function transform(node: Node): void {
  if (!node.children) return;

  node.children.forEach((child, index) => {
    transform(child);
    if (child.type !== 'blockquote') return;

    const para = child.children?.[0];
    const text = para?.type === 'paragraph' ? para.children?.[0] : undefined;
    if (!text || text.type !== 'text' || typeof text.value !== 'string') return;
    const match = MARKER_RE.exec(text.value);
    if (!match) return;

    text.value = text.value.slice(match[0].length);
    if (!text.value) para!.children!.shift();
    if (para!.children!.length === 0) child.children!.shift();

    node.children![index] = {
      type: 'mdxJsxFlowElement',
      name: 'Callout',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'type', value: MARKER_TO_TYPE[match[1]] },
      ],
      children: child.children,
    };
  });
}

export function remarkGfmAlert() {
  return (tree: Node) => {
    transform(tree);
  };
}
