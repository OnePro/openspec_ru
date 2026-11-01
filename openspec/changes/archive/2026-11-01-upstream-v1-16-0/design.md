# Дизайн

## Контекст

См. `proposal.md`. В релизе `Fission-AI/OpenSpec` `v1.16.0` (`27c0515724decc633818c735ee596481eec78a8b`) изменились 10 файлов из `manifest.json`: 5 страниц `docs-lab/*`, `schemas/spec-driven/schema.yaml`, `website/app/layout.tsx`, `website/lib/layout.shared.tsx`, `README.md` и `install.md`. Кроме того, в `manifest.json` остаются 21 файл со статусом `machine` (шаблоны `src/core/templates/**`), а провайдер `aiproxy` снова доступен.

## Цели / нецели

**Цели:**

- Синхронизировать все отслеживаемые файлы `manifest.json` с `v1.16.0` и довести все 85 записей манифеста до статуса `reviewed`.
- Сохранить кастомные правки сайта (`subsets: ['latin', 'cyrillic']` и маяк Cloudflare Web Analytics в `ru/website-strings/app/layout.tsx`) при переносе дельты апстрима (`icons` в `layout.tsx` и `/docs/openspec-pixel.svg` в `layout.shared.tsx`).
- Пересобрать `dist-ru/` и `dist-website/` на пине `v1.16.0` и выпустить релиз `v1.16.0`.

**Нецели:**

- Изменение архитектуры сборщиков `build-ru.mjs` и `build-website-ru.mjs`.

## Решения

### D1: Дельта-обновление через `translate.mjs --mode delta` и сохранение оверлеев сайта

После обновления `upstream.json` до `v1.16.0` команда `npm run drift:check` фиксирует 9 устаревших файлов и 1 `pending`-файл (`install.md`).
- Для 5 файлов `docs-lab/*`, `schemas/spec-driven/schema.yaml`, `README.md` и `website/lib/layout.shared.tsx` запускается `translate.mjs --mode delta` через `aiproxy` (`gemini-4-argon` для перевода, `claude-sonnet-5-5` для ревью).
- В `ru/website-strings/app/layout.tsx` дельта апстрима добавляет только блок `icons` в `metadata`; чтобы не потерять `subsets: ['latin', 'cyrillic']` и скрипт Cloudflare Web Analytics, дельта вносится точечно и проходит `gate-website-ru.mjs` и `review-translation.mjs`.
- Для `install.md` выполняется `translate.mjs --mode fresh`.
- Для оставшихся `machine`-файлов запускается `review-translation.mjs` через `aiproxy` с исправлением замечаний до статуса `reviewed`.

### D2: Синхронизация пинов версий и сборка артефактов

- Команда `npm run build:ru` пересобирает `dist-ru/` на коммите `v1.16.0` (включая обновлённый `schema.yaml` с проверкой `WHEN/GIVEN` и `THEN`).
- В `website-ru-content/ru/{index,install}.md`, `website-ru-content/ru/templates/*.md` и корневом `README.md` версии обновляются с `1.15.0`/`1.15` до `1.16.0`/`1.16`, требование к Node.js для `npx` поднимается до `22.12.0+`, а URL установщика CLI меняется на `https://openspec.dev/cli/install.sh` (`install.ps1`).
- Версия в `package.json` и `tools/apply/package.json` поднимается до `1.16.0`, добавляется секция `## [1.16.0]` в `CHANGELOG.md`, прогоняется `npm run release:check -- --tag v1.16.0`.

## Риски / компромиссы

- [Дельта в крупном файле `docs-lab/reference/cli.md` (86 КБ) может превысить лимит выходных токенов] → при отказе `translate.mjs` перенести небольшой unified diff `v1.15.0..v1.16.0` точечно, затем прогнать `validate:ru` и `review-translation.mjs`.
- [Потеря кастомных правок в `ru/website-strings/app/layout.tsx`] → проверить наличие `cyrillic` и `cloudflareinsights` перед сборкой сайта.
