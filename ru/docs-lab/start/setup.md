# Настройка проекта

> Добавьте OpenSpec в проект: запустите init, посмотрите на созданные файлы и настройте их.

## Выберите, где будет храниться OpenSpec

- **В вашем репозитории (по умолчанию)**: спецификации и изменения находятся рядом с кодом, который они описывают, и версионируются вместе с ним. Остальная часть страницы посвящена этому варианту.
- **В хранилище**: отдельный репозиторий для планирования, общий для использующих его репозиториев — подходит для мультирепозиторных проектов или для полного вынесения планирования за пределы репозитория с кодом. В разделе [Хранилища (бета)](../multi-repo/stores.md) описано, в каких случаях это оправдано и как всё настроить.

## Инициализируйте проект

После установки CLI ([Установка](installation.md)) запустите init в корне вашего проекта. В терминале выполните:

```bash
cd <your-project>
openspec init
```

Команда init спросит, какие ИИ-инструменты вы используете, запишет файлы процессов для выбранных вариантов и выведет отчёт:

```
OpenSpec Setup Complete

Created: Claude Code
6 skills and 6 commands in .claude/
Config: openspec/config.yaml (schema: spec-driven)
```

Перезапустите IDE, чтобы новые команды вступили в силу.

Повторный запуск init безопасен:

- Для уже настроенных инструментов вместо `Created` будет выведено `Refreshed`.
- Повторный запуск init с выбором нового инструмента добавит этот инструмент.
- Флаг `--tools` позволяет пропустить интерактивный выбор ([Справочник по CLI](../reference/cli.md)).

### Миграция существующего файла `project.md`

Команда init не копирует устаревший файл `openspec/project.md` в `config.yaml`. Она сохраняет файл и выводит запрос для миграции с помощью ИИ.

Отправьте в чат с ИИ:

```
Review openspec/project.md and migrate its useful content to openspec/config.yaml.
Keep context concise: include only project-wide facts needed during artifact creation, apply, and archive.
Move artifact-specific guidance into rules for the matching artifacts.
Move guidance for apply or archive into the matching operations entry.
Leave out generic, outdated, or verbose material. Do not delete project.md.
```

Проверьте `config.yaml`, а затем удалите `project.md`, когда будете готовы.

## Что устанавливает init

Запуск init создаёт в проекте два элемента:

- Папку `openspec/` в корне репозитория
- Файлы процессов (навыки и команды), добавленные в папку вашего ИИ-инструмента (`.agents/`, `.claude/` и т. д.)

Закоммитьте все эти файлы так же, как и остальной исходный код. Команда init больше ничего не меняет в репозитории (если она обнаружит остатки старой версии OpenSpec, то спросит разрешения перед их удалением).

### Папка `openspec/`

Здесь, в корне вашего проекта, хранятся все артефакты OpenSpec. Структура выглядит так:

```
openspec/
├── config.yaml     project settings and context for the AI
├── specs/          your specs (empty for now)
└── changes/        in-motion changes (empty for now)
    └── archive/    completed changes move here
```

Подробности о `config.yaml` приведены в разделе [Конфигурация проекта](../customize/project-config.md).

### Файлы процессов (навыки и команды)

Это процессы OpenSpec — действия, которые вы будете выполнять во время работы. Вот как они выглядят в виде установленных навыков в общей папке `.agents/`, которую использует большинство инструментов:

```
.agents/skills/
├── openspec-explore/              think through an idea first
├── openspec-propose/              propose a change
├── openspec-apply-change/         implement a change's tasks
├── openspec-update-change/        revise a change's plan
├── openspec-sync-specs/           sync a change's spec updates into specs/
├── openspec-archive-change/       move a finished change to the archive
├── openspec-verify-change/        check the implementation matches the plan (not included by default)
└── openspec-bulk-archive-change/  archive several changes at once (not included by default)
```

Это набор по умолчанию плюс два дополнительных процесса. В разделе [Профили](../customize/profiles.md) перечислены все 12.

По умолчанию каждый процесс устанавливается в двух формах:

- **Навык** (`openspec-apply-change`): инструкции, которые ваш агент подхватывает самостоятельно, когда вы поручаете ему работу.
- **Команда** (`/opsx:apply` в Claude Code): вводимая вручную точка входа для того же процесса под более коротким именем.

Функционально они идентичны. Навык процесса и его команда содержат одни и те же инструкции.

Зачем нужны две формы: команды появились первыми, и в каждом инструменте они записываются по-своему. Навыки — это более новый стандарт, общий для разных инструментов, но не каждый инструмент умеет вызывать навык напрямую, поэтому команды остаются точкой входа для таких инструментов.

Некоторые инструменты устанавливают только навыки. Если инструмент запускает навыки напрямую, init пропускает команды и сообщает об этом (`Commands skipped for: codex (uses skills)`).

Мы отдаём предпочтение навыкам и со временем планируем отказаться от команд.

#### Изменение состава установки

Интерактивное меню позволяет изменить форму доставки и набор процессов ([Профили](../customize/profiles.md)). В терминале выполните:

```bash
openspec config profile
```

Пример переключения только на навыки:

```
Current profile settings
  Delivery: both

? What do you want to configure? Delivery only
? Delivery mode (how workflows are installed): Skills only

Config changes:
  delivery: both -> skills
? Apply changes to this project now? (Y/n) y
```

При положительном ответе настройки сразу применяются к текущему проекту. Другие проекты получат их при следующем запуске `openspec update`. Эта настройка является глобальной для всей машины.

#### В Claude Code не отображаются процессы

Claude Code загружает процессы OpenSpec из одного или обоих путей проекта в зависимости от настройки доставки:

- **Навыки**: `.claude/skills/openspec-*/SKILL.md`
- **Команды**: `.claude/commands/opsx/<id>.md`

Если файлы отсутствуют, обновите проект. В терминале выполните:

```bash
openspec update
```

Если файлы команд существуют, но при вводе `/opsx:` команды OpenSpec не появляются, обновите Claude Code и перезапустите его. Если команды всё равно не загружаются, включите также и навыки. В терминале выполните:

```bash
openspec config set delivery both
openspec update
```

Перезапустите Claude Code, а затем введите `/openspec-propose` в чате. Если отсутствуют только некоторые процессы, [измените профиль](../customize/profiles.md#expanding-the-set-optional-workflows).

Настройка завершена. В разделе [Быстрый старт](quickstart.md) описано, как создать ваше первое изменение.
