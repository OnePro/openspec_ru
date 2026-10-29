# openspec_ru

Русскоязычный перевод [OpenSpec](https://github.com/Fission-AI/OpenSpec) — документации, AI-facing skills/шаблонов и вебсайта, — привязанный к конкретной версии оригинала, с автоматическим обнаружением дрейфа апстрима.

## Использование (Быстрый старт)

Патчер `openspec-ru` заменяет сгенерированные OpenSpec skills и slash-команды в вашем проекте русскоязычными версиями из пререндеренного бандла (`dist-ru/`), сохраняя имена файлов, идентификаторы команд (`/opsx:*`, `/opsx-*`) и машинные маркеры без изменений.

### 1. Инициализация нового проекта сразу на русском (в один шаг)

В корне вашего Git-репозитория (если `.git` отсутствует, команда заблокирует выполнение):

```sh
# Установите CLI OpenSpec один раз на компьютер (если ещё не установлен)
npm install -g @fission-ai/openspec@latest

# Инициализируйте проект и сразу примените русский перевод одной командой
npx github:OnePro/openspec_ru init
# или неинтерактивно:
npx github:OnePro/openspec_ru init --tools claude
```

### 2. Перевод уже инициализированного проекта (`apply`)

Если `openspec init` уже был выполнен ранее:

```sh
npx github:OnePro/openspec_ru apply
```

Локальный запуск из клона этого репозитория:

```sh
node tools/apply/cli.mjs apply <путь-к-проекту>
# или
node tools/apply/ apply <путь-к-проекту>
# или через npm-скрипт (для текущего каталога или указанного пути)
npm run apply:ru -- <путь-к-проекту>
```

### 2. Предпросмотр изменений (`--dry-run`)

Чтобы увидеть, какие инструменты обнаружены и сколько файлов будет обновлено, без записи на диск:

```sh
npx github:OnePro/openspec_ru apply --dry-run
# или локально:
node tools/apply/cli.mjs apply <путь-к-проекту> --dry-run
```

### 3. Повторный запуск и переприменение после `openspec update`

Патчер идемпотентен: повторный запуск сравнивает содержимое файлов и сообщает, что все артефакты уже актуальны. Сторонние skills и команды в каталогах инструментов не затрагиваются.

Если вы обновили артефакты штатной командой `openspec update` или `openspec init --force` (которая перезаписывает их английскими версиями), выполните патчер повторно:

```sh
openspec update
npx github:OnePro/openspec_ru apply
```

### Поддерживаемые инструменты (топ-5)

| Инструмент | ID | Skills | Slash-команды |
| --- | --- | --- | --- |
| Claude Code | `claude` | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` (`/opsx:<id>`) |
| Cursor | `cursor` | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` (`/opsx-<id>`) |
| GitHub Copilot | `github-copilot` | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md` (`/opsx-<id>`) |
| Codex | `codex` | `.agents/skills/openspec-*/SKILL.md` | — (используются skills) |
| Gemini CLI | `gemini` | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` (`/opsx:<id>`) |

Для других AI-инструментов вне топ-5 патчер выводит предупреждение и не изменяет их файлы.

## Привязка к версии апстрима

Перевод привязан к релизу апстрима из `upstream.json`:

- репозиторий: `Fission-AI/OpenSpec`
- тег: `v1.15.0`
- commit: `8e0288df12d401b0e183e2f47254d22528c1dffb`

Поднятие привязки — осознанное действие: обновить `upstream.json` → `npm run drift:check` → волна перепереводов по отчёту.

## Структура

- `ru/` — дерево-зеркало апстрима с переводами (`src/core/templates/`, `schemas/`, `docs-lab/`, `website-strings/`, `meta/`).
- `dist-ru/` — собранный русскоязычный бандл артефактов (пререндеренные skills, slash-команды для топ-5 инструментов, схемы и `bundle-meta.json`).
- `tools/apply/` — патчер пользовательских проектов (`openspec-ru apply`).
- `manifest.json` — реестр всех переводимых файлов: EN-путь, RU-путь, `base_blob_sha`, статус (`pending`/`machine`/`reviewed`), зона. Единственный источник правды о состоянии перевода.
- `tools/` — инструменты трекинга, перевода, валидации и сборки (Node 20+, ESM, без внешних зависимостей).
- `website/` — форк сайта (последующие change'и).
- `.github/workflows/drift.yml` — ежедневная проверка новых релизов и дрейфа в CI.

## Команды для разработчиков и мейнтейнеров

```sh
npm run manifest:seed        # перегенерировать manifest.json по дереву пинned-тега
npm run drift:check          # отчёт о дрейфе: актуальны / изменены / удалены / новые
npm run drift:diff -- <путь> # unified diff оригинала для устаревшего файла
npm run translate            # LLM-перевод (fresh / delta) с валидацией и ретраями
npm run validate:ru          # детерминированная проверка всех переведённых файлов
npm run lint:glossary        # проверка соблюдения глоссария в ru/
npm run build:ru             # сборочный гейт overlay + пререндер бандла dist-ru/
npm run apply:ru             # применить RU-артефакты к проекту
npm run mark-translated -- <путь> [machine|reviewed]  # зафиксировать (пере)перевод
npm test                     # запуск всех unit- и E2E-тестов
```

`GITHUB_TOKEN` опционален (снимает rate limit GitHub API); в CI выставляется автоматически.

Статусы перевода: `pending` (не начат) → `machine` (LLM-черновик) → `reviewed` (вычитан человеком). Файлы со статусом `pending` могут не иметь RU-файла на диске; `machine`/`reviewed` — обязаны.

