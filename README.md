# openspec_ru

Русскоязычный перевод [OpenSpec](https://github.com/Fission-AI/OpenSpec) — документации, AI-facing skills/шаблонов и вебсайта, — привязанный к конкретной версии оригинала, с автоматическим обнаружением дрейфа апстрима.

## Привязка к версии апстрима

Перевод привязан к релизу апстрима из `upstream.json`:

- репозиторий: `Fission-AI/OpenSpec`
- тег: `v1.15.0`
- commit: `8e0288df12d401b0e183e2f47254d22528c1dffb`

Поднятие привязки — осознанное действие: обновить `upstream.json` → `npm run drift:check` → волна перепереводов по отчёту.

## Структура

- `ru/` — дерево-зеркало апстрима с переводами (`src/core/templates/`, `schemas/`, `docs-lab/`, `website-strings/`, `meta/`).
- `manifest.json` — реестр всех переводимых файлов: EN-путь, RU-путь, `base_blob_sha`, статус (`pending`/`machine`/`reviewed`), зона. Единственный источник правды о состоянии перевода.
- `tools/` — инструменты трекинга (Node 20+, ESM, без внешних зависимостей).
- `website/` — форк сайта (последующие change'и).
- `.github/workflows/drift.yml` — ежедневная проверка новых релизов и дрейфа в CI.

## Команды

```sh
npm run manifest:seed        # перегенерировать manifest.json по дереву пинned-тега
npm run drift:check          # отчёт о дрейфе: актуальны / изменены / удалены / новые
npm run drift:diff -- <путь> # unified diff оригинала для устаревшего файла
npm run mark-translated -- <путь> [machine|reviewed]  # зафиксировать (пере)перевод
npm test                     # unit-тесты манифеста
```

`GITHUB_TOKEN` опционален (снимает rate limit GitHub API); в CI выставляется автоматически.

Статусы перевода: `pending` (не начат) → `machine` (LLM-черновик) → `reviewed` (вычитан человеком). Файлы со статусом `pending` могут не иметь RU-файла на диске; `machine`/`reviewed` — обязаны.
