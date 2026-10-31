# Дизайн: release-and-governance

## Контекст

См. `proposal.md` — мотивация и цель. В проекте есть три места, где хранятся версии:
1. `upstream.json` (`tag: "v1.15.0"`, `commit: "8e0288df..."`) — пин на релиз оригинала `Fission-AI/OpenSpec`.
2. `package.json` и `tools/apply/package.json` (`version`) — версия нашего пакета `openspec-ru`.
3. `dist-ru/bundle-meta.json` — метаданные пререндеренного бандла.

## Цели и не-цели

**Цели:**

- Единое правило версионирования `X.Y.Z`, где `X.Y` всегда равно `MAJOR.MINOR` из `upstream.json`, а `Z` (`0, 1, 2...`) — номер релиза `openspec_ru` внутри этой минорной ветки.
- Оформленные `CHANGELOG.md` и `CONTRIBUTING.md` на русском языке.
- Автоматический гейт `tools/release-check.mjs` (`npm run release:check`), который не даст выпустить тег с рассинхроном версий или без записи в `CHANGELOG.md`.
- Выпуск первого релизного тега `v1.15.0` в репозитории.

**Не-цели:**

- Автоматическая публикация в npm registry (пакет устанавливается из GitHub).

## Решения

### D1: Схема версий `MAJOR.MINOR.PATCH` (`1.15.x`)

- Когда `upstream.json` привязан к `v1.15.x`, версия `openspec-ru` имеет вид `1.15.<N>` (`1.15.0`, `1.15.1`, … `1.15.9` и далее `1.15.10+` по SemVer).
- В `dist-ru/bundle-meta.json` храним и `bundleVersion` (например, `"v1.15.0"` — из корневого `package.json`), и `upstream` (`tag: "v1.15.0"` из `upstream.json`).
- В `tools/apply/index.mjs` проверка совместимости сравнивает `MAJOR.MINOR` установленного `openspec` CLI и бандла (`1.15 === 1.15`), чтобы наши патч-релизы (`v1.15.1`, `v1.15.2`) не вызывали ложного предупреждения у пользователей с `openspec 1.15.0`.

### D2: Скрипт `tools/release-check.mjs`

Детерминированный скрипт без внешних зависимостей проверяет:
1. `package.json.version === tools/apply/package.json.version`.
2. `MAJOR.MINOR` этой версии совпадает с `MAJOR.MINOR` из `upstream.json.tag`.
3. В `CHANGELOG.md` есть секция `## [<version>]`.
4. В `CONTRIBUTING.md` описаны правила версионирования и ведения `CHANGELOG.md`.
5. При передаче флага `--tag <vX.Y.Z>` дополнительно проверяет, что тег равен `v${package.json.version}`.

## Риски и компромиссы

- [Апстрим выпустит `v1.15.1`, когда у нас уже есть `v1.15.1`] → при поднятии `upstream.json` до `v1.15.1` мы просто выпускаем следующий свободный патч `1.15.2` и указываем в `CHANGELOG.md` строку `> Базовая версия апстрима: Fission-AI/OpenSpec @ v1.15.1`.
