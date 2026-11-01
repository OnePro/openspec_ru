# Предложение

## Зачем

Апстрим `Fission-AI/OpenSpec` выпустил релиз `v1.16.0` (коммит `27c0515724decc633818c735ee596481eec78a8b`). В этом релизе изменились 10 отслеживаемых файлов в `manifest.json`, обновился адрес установщика (`https://openspec.dev/cli/install.sh`), минимальная версия Node.js для npm выросла до `22.12.0+`, а в `openspec validate` добавлена проверка шагов `WHEN/GIVEN` и `THEN` в сценариях. Необходимо синхронизировать `openspec_ru` с `v1.16.0` и выпустить релиз `v1.16.0`.

## Что изменится

- Привязка `upstream.json` поднимается до тега `v1.16.0` (`27c0515724decc633818c735ee596481eec78a8b`).
- Дельта-перевод и ревью 9 изменённых файлов (`docs-lab/multi-repo/stores.md`, `docs-lab/reference/cli.md`, `docs-lab/reference/configuration/config-yaml.md`, `docs-lab/reference/schemas/spec-driven/index.md`, `docs-lab/start/installation.md`, `schemas/spec-driven/schema.yaml`, `website/app/layout.tsx`, `website/lib/layout.shared.tsx`, `README.md`) с сохранением кастомных правок i18n и маяка аналитики в `ru/website-strings/app/layout.tsx`.
- Перевод `install.md` в `ru/meta/install.md` и перевод оставшихся 21 `machine`-файлов CLI-шаблонов до статуса `reviewed` через `aiproxy`.
- Пересборка бандла `dist-ru/` (`npm run build:ru`) на базе `v1.16.0`.
- **BREAKING**: обновление минимальной версии Node.js (`22.12.0+`), URL установщика (`openspec.dev/cli/install.*`) и пинов версий (`#v1.16.0`, `@1.16`) на страницах `website-ru-content/ru/**` и в корневом `README.md`.
- Сборка и публикация обновлённого сайта `dist-website/`, обновление версий пакетов до `1.16.0`, запись в `CHANGELOG.md` и выпуск тега `v1.16.0`.

## Возможности

### Новые возможности

### Изменённые возможности

- `website-ru-build`: требование «Точная последовательность установки на сайте» обновляется под актуальную привязку версий (`1.16.x`, `#v1.16.0`, Node.js `22.12.0+` и URL установщика `openspec.dev/cli/install.*`).

## Влияние

- `upstream.json`, `manifest.json`, `package.json`, `tools/apply/package.json`, `CHANGELOG.md`, `README.md`.
- `ru/docs-lab/**`, `ru/schemas/spec-driven/schema.yaml`, `ru/website-strings/**`, `ru/meta/**`, `ru/src/core/templates/**`.
- `website-ru-content/ru/**`, `dist-ru/**`, `dist-website/**`.
