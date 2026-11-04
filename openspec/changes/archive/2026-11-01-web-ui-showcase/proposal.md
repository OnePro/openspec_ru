# Предложение

## Зачем

Встроенная веб-панель (`openspec-ru start web` и скилл `openspec-ui` / «открой спеки») — ключевая собственная возможность `openspec_ru`, которой нет в оригинальном OpenSpec. Сейчас на главной странице сайта (`/docs/ru`) веб-панель упомянута одной строкой в конце без скриншотов и без инструкций запуска, хотя в репозитории уже есть готовые скриншоты (`assets/openspec-ru-ui-kanban.png` и `assets/openspec-ru-ui-specs.png`).

## Что изменится

- Главная страница сайта (`/docs/ru`, файл `website-ru-content/ru/index.md`) начинается с раздела о встроенной веб-панели спецификаций и Канбан-доске изменений, содержит оба скриншота (`openspec-ru-ui-kanban.png`, `openspec-ru-ui-specs.png`) и команды запуска через ИИ-ассистента («открой спеки», `/opsx:ui`) и CLI (`openspec-ru start web`, `openspec-ru stop web`).
- Сборщик сайта (`tools/build-website-ru.mjs`) копирует изображения из корневого каталога `assets/` в `public/assets/` рабочего дерева сайта, чтобы статика `/assets/*.png` попадала в `dist-website/assets/`.

## Возможности

### Новые возможности

### Изменённые возможности

- `website-ru-build`: требование «Сайт открывается обзором openspec-ru» дополняется обязательным блоком веб-панели со скриншотами и командами запуска в начале страницы `/docs/ru`, а сборка сайта включает копирование `assets/*` в `public/assets/`.

## Влияние

- `website-ru-content/ru/index.md` — блок веб-панели и скриншоты в начале страницы.
- `tools/build-website-ru.mjs` и `tools/build-website-ru.test.mjs` — копирование `assets/` в `site/public/assets/`.
- `dist-website/` — пересборка и деплой на Cloudflare Pages.
