# Proposal: layer-1-ru

## Why

Фундамент (трекинг апстрима) и инструменты (LLM-пайплайн, валидатор, сборочный гейт) готовы и заархивированы. Теперь нужно произвести сам перевод слоя 1 — AI-facing артефактов (`src/core/templates`, `schemas/`), из которых `openspec init` генерирует skills и slash-команды в проектах пользователей, — и доставить его пользователю: пакет-патчер `openspec-ru`, который делает уже установленный OpenSpec русскоязычным. Это центральная ценность всего проекта: «установил — работаешь с OpenSpec по-русски».

## What Changes

- **Перевод templates**: 18 оставшихся файлов `src/core/templates/**` (1 уже переведён) через `translate.mjs` (режим fresh), каждый проходит валидатор + сборочный гейт build-ru.
- **Перевод schemas**: `schemas/spec-driven/schema.yaml` + 4 шаблона артефактов. Предварительно — доработка `seed-manifest.mjs`: зона `schemas` сейчас пуста (0 записей, файлы не `.md`), паттерны должны включать `*.yaml`.
- **Расширение валидатора** под YAML-схемы (структура ключей, непереводимые идентификаторы артефактов).
- **RU-бандл артефактов**: build-ru дополнительно пререндерит slash-команды для топ-5 инструментов (Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI) штатными генераторами апстрима поверх RU-overlay → `dist-ru/` содержит skills + команды, готовые к раскладке.
- **Пакет-патчер `openspec-ru`** (`tools/apply/` → npm-пакет): команды `npx github:OnePro/openspec_ru init`, `apply` и `update` детектируют в проекте пользователя установленные OpenSpec-артефакты (по наличию `openspec-*/SKILL.md` в известных каталогах инструментов и opsx-файлов команд) и перезаписывают их RU-версиями из бандла (`skills`, `commands`, `openspec/schemas/spec-driven/`). Команда `update` за один шаг запускает штатный `openspec update` (подтягивая новые воркфлоу профиля и миграции) и сразу накатывает свежий русский бандл.
- **Проверка end-to-end**: в scratch-проекте `openspec init` (EN) → `npx openspec-ru apply` → skills/команды стали русскими, маркеры и имена файлов нетронуты.

## Capabilities

### New Capabilities

- `ru-artifact-bundle`: сборка дистрибутивного набора русскоязычных AI-артефактов — переведённые templates и schemas проходят валидацию и сборочный гейт, пререндер skills и slash-команд для поддерживаемых инструментов, версия бандла соответствует пинned-версии апстрима.
- `project-patcher`: раскладка RU-бандла в проект пользователя — детект установленных инструментов по существующим артефактам, перезапись skills и команд русскими версиями с сохранением имён, маркеров и структуры, идемпотентность и переприменение после `openspec update`.

### Modified Capabilities

(пусто)

## Impact

- **Новые файлы**: переводы в `ru/src/core/templates/**` (18 файлов) и `ru/schemas/**` (5 файлов); `tools/apply/**` (патчер); тесты; обновления `seed-manifest.mjs`, `validate-translation.mjs`, `build-ru.mjs`, `manifest.json`, `package.json`, `README.md` (инструкция для пользователей).
- **Зависимости**: существующие `translate.mjs`/`validate-translation.mjs`/`build-ru.mjs`; LLM API (Kimi) для массового перевода; npm-доступ для публикации (публикация — отдельное решение, пакет работает и через `npx github:OnePro/openspec_ru`).
- **Связи**: опирается на заархивированные `upstream-version-tracking`, `translation-glossary`, `llm-translation-pipeline`.
- **Не входит**: перевод `docs-lab` и сайта (change 4); полный форк CLI (фаза b); CLI runtime-строки.
