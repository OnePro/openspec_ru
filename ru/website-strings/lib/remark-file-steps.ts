// Преобразует ограждённые блоки `file-steps` в интерактивный пошаговый
// компонент <FileSteps>, используя ту же вставку mdxJsxFlowElement, что и
// remarkMdxMermaid и remarkGfmAlert. Тело блока остаётся читаемым на GitHub:
// строки `## ` начинают шаг, строки `> ` содержат его подпись, а остальные
// строки образуют дерево файлов, двухсимвольная разметка которого
// (`+ ` — добавлено, `- ` — удалено, `  ` — без изменений) читается как diff.

interface Node {
  type: string;
  lang?: string | null;
  value?: string;
  children?: Node[];
  [key: string]: unknown;
}

function transform(node: Node): void {
  if (!node.children) return;

  node.children.forEach((child, index) => {
    transform(child);
    if (child.type !== 'code' || child.lang !== 'file-steps') return;

    node.children![index] = {
      type: 'mdxJsxFlowElement',
      name: 'FileSteps',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'content', value: child.value ?? '' },
      ],
      children: [],
    };
  });
}

export function remarkFileSteps() {
  return (tree: Node) => {
    transform(tree);
  };
}
