# Задачи

## 1. Поддержка статики `assets/` при сборке сайта

- [x] 1.1 Добавить в `buildTree` (`tools/build-website-ru.mjs`) копирование корневого каталога `assets/` в `site/public/assets/` и дополнить модульный тест в `tools/build-website-ru.test.mjs`. Проверка: `node --test tools/build-website-ru.test.mjs` проходит.

## 2. Презентация Web UI в начале главной страницы `/docs/ru`

- [x] 2.1 Обновить `website-ru-content/ru/index.md`: вынести в начало страницы раздел «Встроенная веб-панель изменений и спецификаций» со скриншотами `/assets/openspec-ru-ui-kanban.png` и `/assets/openspec-ru-ui-specs.png`, примерами запуска через ИИ-ассистента («открой спеки», `/opsx:ui`) и командами CLI (`openspec-ru start web`, `openspec-ru stop web`).
- [x] 2.2 Пересобрать сайт (`npm run build:website:ru`), проверить наличие `dist-website/assets/openspec-ru-ui-kanban.png`, `dist-website/assets/openspec-ru-ui-specs.png` и ссылок на них в `dist-website/docs/ru.html`, затем опубликовать на Cloudflare Pages (`openspec-ru.pages.dev`). Проверка: `npm test` зелёный, `https://openspec-ru.pages.dev/assets/openspec-ru-ui-kanban.png` и `/docs/ru` отдают `HTTP 200`.

## Workflow follow-up

- Заархивировать изменение `web-ui-showcase` после выполнения всех задач.
