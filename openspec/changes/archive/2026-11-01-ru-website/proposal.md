# Предложение

## Зачем

Переведены UI-строки сайта (шаг 1, 17 файлов) и весь контент `docs-lab` (шаг 2, 42 файла), но русского сайта нет: `ru/`-слои ничем не собираются, а ванильный сайт апстрима остаётся английским внутри — `<html lang="en">` (у нас уже `lang="ru"` в оверлее, но шрифт без кириллицы), slugify удаляет кириллицу (пустые якоря в FAQ), поисковый анализатор английский, лейблы сайдбара английские. Цель программы — «такой же сайт, как openspec, но на русском»: архитектура — standalone русский сайт (не двуязычный `/ru`), решение принято по формулировке цели владельца.

## Что изменится

- Новый инструмент `tools/build-website-ru.mjs` (`npm run build:website:ru`): клон апстрива на пине → рабочее дерево сайта → оверлей `ru/website-strings/**` → оверлей патчей `website-ru-patches/**` → контент `ru/docs-lab/**` на место `docs-lab/**` → `pnpm install` и `pnpm build` (Next.js статический экспорт). Падение сборки — отказ.
- Новый оверлей `website-ru-patches/docs.sync.config.mjs`: русские лейблы секций сайдбара (Начало, Настройка, Мультирепо (beta), Справочник), тот же список публикуемых страниц и те же slug.
- Русская i18n в оверлейных файлах `ru/website-strings/`: шрифт Inter с подмножеством cyrillic (`app/layout.tsx`), slugify с сохранением кириллицы (`lib/remark-faq.ts`), поисковый анализатор `russian` (`app/api/search/route.ts`).
- npm-скрипт и unit-тесты инструмента сборки.
- Собственные страницы openspec_ru в namespace `/docs/ru` (обзор + установка, закреплённые на `#v1.15.0`) с баннером провенанса; RU-конфиг публикации импортирует апстримовый манифест, чтобы новые апстрим-страницы не исчезали молча.

## Возможности

### Новые возможности

- `website-ru-build`: сборка standalone русского сайта OpenSpec из апстрива на пине, оверлеев строк и патчей i18n, контента `ru/docs-lab`; сборка Next.js как обязательный гейт.

### Изменённые возможности

## Влияние

- Новые: `tools/build-website-ru.mjs`, `tools/build-website-ru.test.mjs`, `website-ru-patches/docs.sync.config.mjs`, `website-ru-content/ru/{index,install}.md`.
- Меняются: `ru/website-strings/app/layout.tsx`, `ru/website-strings/lib/remark-faq.ts`, `ru/website-strings/app/api/search/route.ts`, `package.json` (скрипт), `.gitignore` (`dist-website/`, `.cache/website-ru/`).
- Пустой каталог `website/` в корне удаляется (сборка работает в `.cache/website-ru/`, результат в `dist-website/`).
- Вне скоупа: хостинг, домен, CI-публикация, smoke-проверки в браузере (шаг 4).
