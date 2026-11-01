# Задачи

## 1. Обновление привязки апстрима и перенос дельт `v1.16.0`

- [x] 1.1 Обновить `upstream.json` до `tag: "v1.16.0"` и `commit: "27c0515724decc633818c735ee596481eec78a8b"`, запустить `npm run drift:check` и зафиксировать список устаревших файлов в `manifest.json`.
- [x] 1.2 Выполнить дельта-обновление и ревью `schemas/spec-driven/schema.yaml`, `website/lib/layout.shared.tsx`, `website/app/layout.tsx` (сохранив `cyrillic` и маяк Cloudflare Web Analytics) и `README.md` (`ru/meta/README.md`); перевести `install.md` (`ru/meta/install.md`) в режиме `fresh`. Проверка: `node tools/gate-website-ru.mjs` и статус `reviewed` в `manifest.json`.
- [x] 1.3 Выполнить дельта-обновление и ревью 5 файлов `docs-lab` (`multi-repo/stores.md`, `reference/cli.md`, `reference/configuration/config-yaml.md`, `reference/schemas/spec-driven/index.md`, `start/installation.md`). Проверка: `npm run validate:ru` без ошибок, статус `reviewed`.
- [x] 1.4 Прогнать `review-translation.mjs` через `aiproxy` для оставшихся `machine`-файлов (`src/core/templates/**`) и устранить замечания. Проверка: все 85 записей в `manifest.json` имеют статус `reviewed`, `npm run drift:check` сообщает об отсутствии дрейфа.

## 2. Сборка бандла, обновление сайта и релиз `v1.16.0`

- [x] 2.1 Обновить версии (`#v1.16.0`, `@1.16`, `1.16.x`), требование Node.js (`22.12.0+`) и URL установщика (`https://openspec.dev/cli/install.sh` / `install.ps1`) в `website-ru-content/ru/{index,install}.md`, `website-ru-content/ru/templates/*.md` и корневом `README.md`. Проверка: `rg '1\.15' website-ru-content/ README.md` пуст.
- [x] 2.2 Поднять версию до `1.16.0` в `package.json` и `tools/apply/package.json`, добавить секцию `## [1.16.0]` в `CHANGELOG.md`, пересобрать `dist-ru/` (`npm run build:ru`) и `dist-website/` (`npm run build:website:ru`). Проверка: `npm run release:check -- --tag v1.16.0` и `npm test` проходят.
- [x] 2.3 Опубликовать `dist-website/` на Cloudflare Pages (`openspec-ru.pages.dev`) и проверить доступность `/docs/ru` и `/docs/ru/install`.

## Последующие шаги процесса

- Заархивировать изменение `upstream-v1-16-0` после выполнения всех задач.
- Закоммитить изменения, создать PR, влить в `main` и выпустить тег и GitHub Release `v1.16.0`.
