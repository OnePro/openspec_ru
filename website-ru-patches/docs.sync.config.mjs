// Русский манифест публикации (change ru-website, шаг 4).
//
// ИМПОРТИРУЕТ апстримовый манифест: build-website-ru.mjs кладёт оригинал апстрива
// рядом как docs.sync.upstream.mjs. Поэтому новая страница, опубликованная апстримом,
// не исчезает молча — она попадёт в pages, ей не хватит RU-source в docs-lab и сборка
// упадёт с понятной ошибкой до деплоя.
//
// Этот файл меняет только лейблы секций (label) и добавляет собственную секцию
// openspec_ru (namespace /docs/ru). Список страниц, slug и source апстрима неизменны.
import {
  docsDir,
  pages as upstreamPages,
  sections as upstreamSections,
} from './docs.sync.upstream.mjs';

export { docsDir };

const RU_LABELS = {
  Start: 'Начало',
  Customize: 'Настройка',
  'Multi-repo (beta)': 'Мультирепо (beta)',
  Reference: 'Справочник',
};

export const sections = [
  {
    label: 'OpenSpec RU',
    pages: [
      { source: 'ru/index.md', slug: 'ru/index' },
      { source: 'ru/install.md', slug: 'ru/install' },
      { source: 'ru/templates/proposal.md', slug: 'ru/templates/proposal' },
      { source: 'ru/templates/design.md', slug: 'ru/templates/design' },
      { source: 'ru/templates/tasks.md', slug: 'ru/templates/tasks' },
      { source: 'ru/templates/spec.md', slug: 'ru/templates/spec' },
    ],
  },
  // Апстримовые секции следом: это перевод официальной документации OpenSpec.
  ...upstreamSections.map((section) => ({
    ...section,
    label: RU_LABELS[section.label] ?? section.label,
  })),
];

export const pages = [
  ...upstreamPages,
  { source: 'ru/index.md', slug: 'ru/index' },
  { source: 'ru/install.md', slug: 'ru/install' },
  { source: 'ru/templates/proposal.md', slug: 'ru/templates/proposal' },
  { source: 'ru/templates/design.md', slug: 'ru/templates/design' },
  { source: 'ru/templates/tasks.md', slug: 'ru/templates/tasks' },
  { source: 'ru/templates/spec.md', slug: 'ru/templates/spec' },
];
