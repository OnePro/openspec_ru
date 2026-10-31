# Proposal: release-and-governance

## Why

Публичному репозиторию `openspec_ru` нужны прозрачные правила версионирования, ведения журнала изменений (`CHANGELOG.md`) и участия в разработке (`CONTRIBUTING.md`), а также релизные Git-теги (`v1.15.0`, `v1.15.1` и т.д.), привязанные к версии `MAJOR.MINOR` оригинального OpenSpec (`1.15`). Сейчас в `package.json` стоит `0.1.0`, тегов в репозитории нет, а контрибьюторам не описаны правила работы с переводами и релизами.

## What Changes

- Введение схемы версионирования `MAJOR.MINOR.PATCH` (`v1.15.0`, `v1.15.1`, … `v1.15.9`), где `MAJOR.MINOR` строго совпадает с базовой версией апстрима из `upstream.json` (`1.15`), а `PATCH` увеличивается при выпуске изменений в переводе, патчере или веб-панели в рамках этой версии апстрима.
- Создание `CHANGELOG.md` с правилами ведения журнала изменений (привязка каждого релиза к тегу и коммиту апстрима, разделы `Добавлено`, `Изменено`, `Исправлено`, `Синхронизация с апстримом`) и записью первого релиза `1.15.0`.
- Создание `CONTRIBUTING.md` с правилами для контрибьюторов: архитектура `ru/` → `dist-ru/`, работа с глоссарием (`glossary.md`) и стилем (`style-guide.md`), непереводимые идентификаторы, проверки (`npm test`, `npm run validate:ru`, `npm run lint:glossary`) и регламент выпуска релизов.
- Добавление инструмента проверки и подготовки релиза (`tools/release-check.mjs`, npm-скрипт `release:check`), который проверяет:
  - совпадение `version` в `package.json`, `tools/apply/package.json` и `dist-ru/bundle-meta.json`;
  - совпадение `MAJOR.MINOR` версии пакета с `MAJOR.MINOR` тега в `upstream.json`;
  - наличие секции текущей версии в `CHANGELOG.md`.
- Обновление сверки совместимости версий в `tools/apply/index.mjs`: считать совместимыми любые версии с одинаковым `MAJOR.MINOR` (например, бандл `v1.15.2` совместим с установленным `openspec 1.15.0`), выводя предупреждение только при расхождении `MAJOR.MINOR`.
- Выставление версии `1.15.0` и создание релизного Git-тега `v1.15.0`.

## Capabilities

### New Capabilities

- `release-versioning`: схема версионирования `MAJOR.MINOR.PATCH` в привязке к `MAJOR.MINOR` апстрима, правила и структура `CHANGELOG.md` и `CONTRIBUTING.md`, автоматическая проверка согласованности версий перед тегированием (`release:check`) и сверка совместимости по `MAJOR.MINOR`.

### Modified Capabilities

(пусто)

## Impact

- **Новые файлы**: `CHANGELOG.md`, `CONTRIBUTING.md`, `tools/release-check.mjs`, `tools/release-check.test.mjs`.
- **Изменяемые файлы**: `package.json`, `tools/apply/package.json`, `dist-ru/bundle-meta.json`, `tools/build-ru.mjs`, `tools/apply/index.mjs`, `tools/apply/apply.test.mjs`.
- **Git-теги**: создание и публикация тега `v1.15.0`.
