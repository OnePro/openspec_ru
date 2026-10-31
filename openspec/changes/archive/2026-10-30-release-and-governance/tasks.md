# Задачи

## 1. Документы `CHANGELOG.md` и `CONTRIBUTING.md`

- [x] 1.1 Создать корневой `CHANGELOG.md` с описанием схемы версий `MAJOR.MINOR.PATCH` (`1.15.x` в привязке к OpenSpec `1.15`) и полной записью релиза `## [1.15.0]` (базовая версия апстрима `v1.15.0`, разделы `Добавлено` / `Изменено` / `Исправлено`)
- [x] 1.2 Создать корневой `CONTRIBUTING.md` с правилами для контрибьюторов: структура `ru/` → `dist-ru/`, правила работы с `glossary.md` и `style-guide.md`, непереводимые элементы, обязательные проверки, правила ведения `CHANGELOG.md` и порядок выпуска релизных Git-тегов `v1.15.x`

## 2. Синхронизация версий и проверка `release:check`

- [x] 2.1 Синхронизировать версию `1.15.0` в `package.json`, `tools/apply/package.json` и `dist-ru/bundle-meta.json`; обновить сверку совместимости версий в `tools/apply/index.mjs` на сравнение по `MAJOR.MINOR` (`1.15.*` совместим с `openspec 1.15.*`)
- [x] 2.2 Реализовать `tools/release-check.mjs` (и скрипт `npm run release:check` в `package.json`) и покрыть unit-тестами `tools/release-check.test.mjs` (проверка совпадения версий в обоих `package.json`, совпадения `MAJOR.MINOR` с `upstream.json`, наличия секции в `CHANGELOG.md` и проверка `--tag v1.15.0`)

## 3. Тегирование релиза `v1.15.0`

- [x] 3.1 Запустить `npm run release:check -- --tag v1.15.0` и `npm test`; после успешного прохождения создать аннотированный Git-тег `v1.15.0` и опубликовать его в `origin`

## Последующие шаги процесса

- Заархивировать change `release-and-governance` после выполнения всех задач.
