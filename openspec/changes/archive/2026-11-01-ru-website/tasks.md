# Задачи

## 1. Русская i18n в оверлее строк

- [x] 1.1 `ru/website-strings/app/layout.tsx`: `subsets: ['latin', 'cyrillic']` у Inter. Проверка: диф содержит только эту правку; `node tools/gate-website-ru.mjs` проходит.
- [x] 1.2 `ru/website-strings/lib/remark-faq.ts`: slugify сохраняет кириллицу (диапазон `а-яё` после toLowerCase), латинское поведение прежнее. Проверка: unit-тест slugify на кириллическом и латинском заголовках (вынести slugify в экспорт или тестировать через gate-файл — на усмотрение, но тест обязателен).
- [x] 1.3 `ru/website-strings/app/api/search/route.ts`: `language: 'russian'`. Проверка: диф содержит только эту правку; гейт проходит.

## 2. Патч сайдбара

- [x] 2.1 `website-ru-patches/docs.sync.config.mjs`: полная копия апстримового `website/docs.sync.config.mjs` с переведёнными `label` секций (Start → Начало, Customize → Настройка, Multi-repo (beta) → Мультирепо (beta), Reference → Справочник); список страниц, slug и `source` без изменений; закомментированные блоки и комментарии сохранить. Проверка: `node -e "import('./website-ru-patches/docs.sync.config.mjs').then(m=>console.log(m.sections.map(s=>s.label)))"` печатает русские лейблы и тот же набор slug, что у апстрима.

## 3. Инструмент сборки `tools/build-website-ru.mjs`

- [x] 3.1 Сборка дерева: клон апстрива на `upstream.json.commit` (переиспользовать кэш-логику `tools/build-ru.mjs` или `tools/lib/github.mjs`), копия `website/` в `.cache/website-ru/site`, наложение `ru/website-strings/**` по парам манифеста, наложение `website-ru-patches/**`, копия `ru/docs-lab/**` в `docs-lab/`. Проверка: unit-тесты дерева на моках (без сети): порядок наложения, отсутствие лишних файлов, целевые пути.
- [x] 3.2 Сборка сайта: `pnpm install` (frozen-lockfile нельзя — оверлей меняет дерево; обычный install) и `pnpm build` в дереве, артефакты в `dist-website/`. Проверка: реальный прогон `npm run build:website:ru` завершается успешно, `dist-website/` содержит `index.html` и HTML страниц документации с русским текстом.
- [x] 3.3 npm-скрипт `build:website:ru`, `.gitignore` дополнен (`.cache/website-ru/`, `dist-website/`), пустой `website/` в корне удалён. Проверка: `npm test` зелёный (кроме известного pre-existing `installGlobalCliShim`), git status не показывает артефактов сборки.

## 4. Итоговая проверка

- [x] 4.1 `npm run validate:ru` — все файлы валидны; `node tools/gate-website-ru.mjs` — 17/17; `npm test` зелёный (кроме pre-existing).

## 5. Собственные страницы openspec_ru (/docs/ru)

- [x] 5.1 `website-ru-content/ru/{index,install}.md`: обзор openspec_ru с провенанс-баннером и установка с командами на `#v1.15.0`. Проверка: страницы собираются в `dist-website/docs/ru.html` и `dist-website/docs/ru/install.html`, баннер виден в HTML.
- [x] 5.2 RU-конфиг публикации импортирует апстримовый манифест (`docs.sync.upstream.mjs`, сохраняется build-website-ru) и добавляет секцию «OpenSpec RU»; buildTree подкладывает `website-ru-content` в docs-lab. Проверка: unit-тесты 5/5, секция «OpenSpec RU» в сайдбаре собранного сайта.
