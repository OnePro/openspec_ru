# Tasks

## 1. Каркас репозитория и привязка

- [x] 1.1 Создать структуру директорий `ru/{src/core/templates,schemas,docs-lab,website-strings}`, `tools/`, `website/` (пустые, с `.gitkeep`) и проверить, что они закоммичены
- [x] 1.2 Создать `upstream.json` (`{"repo":"Fission-AI/OpenSpec","tag":"v1.15.0","commit":"8e0288df12d401b0e183e2f47254d22528c1dffb"}`) и проверить, что `git ls-remote https://github.com/Fission-AI/OpenSpec.git refs/tags/v1.15.0^{}` возвращает именно этот commit
- [x] 1.3 Создать корневой `README.md` (рус.): назначение репо, привязка к версии, команды drift-check/drift-diff; проверить, что команды из README запускаются

## 2. Манифест переводимых файлов

- [x] 2.1 Написать `tools/lib/manifest.mjs` (чтение/запись/валидация схемы записи: en, ru, base_blob_sha, status, area) и проверить unit-тестом round-trip
- [x] 2.2 Написать `tools/seed-manifest.mjs`: получить дерево апстрима на пинned-теге (`GET /repos/{repo}/git/trees/{tag}?recursive=1`) и сгенерировать `manifest.json` со всеми файлами зон `docs-lab/`, `src/core/templates/`, `schemas/`, `website/app/`, `website/lib/`, плюс `README.md`, `install.md` — со статусом `pending`; проверить, что все EN-пути существуют в дереве тега
- [x] 2.3 Прогнать seed и зафиксировать `manifest.json`; проверить, что JSON валиден и счётчики по зонам совпадают с замерами из design.md (docs-lab 42 файла, templates 19)

## 3. Дрейф-инструменты

- [x] 3.1 Написать `tools/lib/github.mjs` (tree по тегу, blob по sha, сверка tag→commit, поддержка `GITHUB_TOKEN`) и проверить запросом дерева `v1.15.0`
- [x] 3.2 Написать `tools/drift-check.mjs`: сверка blob sha, категории «актуален / изменён / удалён / новый без перевода», симметричная сверка манифест↔диск, сохранение `latest_blob_sha`; проверить на свежем манифесте (отчёт «дрейф отсутствует») и на искусственно заниженном base_blob_sha (файл помечается «изменённым»)
- [x] 3.3 Написать `tools/drift-diff.mjs`: unified diff base_blob_sha→latest_blob_sha через blob API; проверить на файле с известным изменением, что diff непустой и читаемый; для актуального файла — сообщение без diff
- [x] 3.4 Написать `tools/mark-translated.mjs`: поднять base_blob_sha до latest_blob_sha и выставить статус; проверить, что после фиксации drift-check считает файл актуальным
- [x] 3.5 Добавить npm-скрипты (`drift:check`, `drift:diff`, `manifest:seed`) в `package.json` и проверить, что каждый запускается через `npm run`

## 4. CI-уведомления о релизах

- [x] 4.1 Создать `.github/workflows/drift.yml` (cron ежедневно + workflow_dispatch): список тегов апстрима, сравнение с пином, создание/обновление issue при новом теге; проверить ручным запуском workflow_dispatch, что workflow проходит и не создаёт issue при отсутствии новых тегов
- [x] 4.2 Добавить в workflow шаг drift-check с выгрузкой отчёта артефактом job; проверить, что отчёт доступен в артефактах запуска

## Workflow follow-up

- Заархивировать change после выполнения всех задач и ручной проверки отчёта drift-check.
- Проверить архивированный результат (`openspec validate --archived`).
