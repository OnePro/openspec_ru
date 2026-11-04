# Дизайн

## Контекст

См. `proposal.md`. В корне репозитория лежат скриншоты `assets/openspec-ru-ui-kanban.png` и `assets/openspec-ru-ui-specs.png`, которые уже используются в корневом `README.md`. Сборщик сайта (`tools/build-website-ru.mjs`) формирует рабочее дерево `.cache/website-ru/site`, но пока не копирует корневой каталог `assets/` в `site/public/assets/`.

## Цели / нецели

**Цели:**

- Начинать главную страницу `/docs/ru` с наглядной демонстрации встроенной веб-панели (оба скриншота + команды запуска из чата агента и из терминала).
- Автоматически включать файлы из `assets/` в `public/assets/` при сборке сайта.

**Нецели:**

- Изменение самого кода веб-панели (`tools/web/`).

## Решения

### D1: Копирование `assets/` в `site/public/assets/` в `buildTree`

В `tools/build-website-ru.mjs` функция `buildTree` проверяет наличие `resolve(root, 'assets')` и копирует его в `join(siteDir, 'public/assets')`. Next.js при статическом экспорте (`output: 'export'`) переносит `public/assets/*` в `dist-website/assets/*`, поэтому в Markdown-контенте работают абсолютные пути `/assets/openspec-ru-ui-kanban.png` и `/assets/openspec-ru-ui-specs.png`.

### D2: Структура главной страницы `/docs/ru`

Страница `website-ru-content/ru/index.md` открывается разделом о веб-панели изменений и спецификаций сразу после вводного абзаца и дисклеймера:
1. Два скриншота (Канбан-доска изменений и просмотр спецификаций).
2. Запуск голосом/текстом в чате ИИ-агента («открой спеки», «покажи доску изменений», `/opsx:ui`) и остановка («закрой спеки»).
3. Запуск и остановка из терминала (`openspec-ru start web`, `openspec-ru start web --detach`, `openspec-ru stop web`).
4. Далее следуют разделы «Что входит в openspec_ru» и «Установить за 4 шага».

## Риски / компромиссы

- [Преобразование `![](...)` в `sync-docs.mjs`] → `rewriteLinks` в `sync-docs.mjs` не изменяет пути, начинающиеся с `/` (`if (/^(https?:|mailto:|#|\/)/.test(target)) return whole;`), поэтому `![...](/assets/...)` и `<img src="/assets/...">` проходят без искажений.
