# Новое расположение каждой текущей страницы

Соответствие старых страниц новым: исходный материал для каждой страницы `docs-lab/` при подготовке черновиков
и список перенаправлений при переключении. Целевая структура — оглавление страниц в
[README.md](README.md).

| Текущий файл (`docs/`) | Новое расположение |
|---|---|
| README.md (оглавление) | `start/overview.md`, переписан как презентация и навигация |
| getting-started.md | `start/quickstart.md` |
| installation.md | разделён: `start/installation.md` (на уровне машины: матрица, обновление, удаление) · `start/setup.md` (на уровне проекта: init, что записывает init, доставка в виде навыков или команд, маршрутизатор хранилищ) |
| how-commands-work.md | `start/quickstart.md` (встроенные подписи) · `help/faq.md` · `help/troubleshooting.md` |
| existing-projects.md | `guides/existing-codebases.md` («Существующие кодовые базы»); часть с пошаговым руководством — в `start/quickstart.md` |
| overview.md | `guides/concepts.md` |
| concepts.md | `guides/concepts.md` (основная часть) · формат дельты — в `reference/schemas/spec-driven/index.md` (раздел «Дельта-спецификации») · встроенная таблица глоссария удалена |
| explore.md | `guides/explore.md` |
| workflows.md | `guides/apply.md` (шаблоны выполнения, continue/ff) · `reference/skills.md` |
| opsx.md | разделён на четыре части: конфигурация — в `customize/project-config.md` · команды — в `reference/skills.md` · философия — в `guides/concepts.md` · архитектура — в `reference/architecture/` |
| reviewing-changes.md + writing-specs.md | `guides/review-the-plan.md` (объединены) |
| editing-changes.md | `guides/change-course.md` |
| team-workflow.md | `guides/teams.md` |
| examples.md | отложено: заготовка `guides/examples.md` не включается в оглавление и конфигурацию синхронизации, пока не появятся реальные заархивированные изменения (см. TODO в README) |
| customization.md | `customize/project-config.md` + `customize/schemas.md` + `customize/overview.md` (последовательность решений) · поля schema.yaml — в `reference/schemas/schema-yaml.md` |
| multi-language.md | `customize/project-config.md` §context, примечание «Другой язык» |
| stores-beta/user-guide.md | `multi-repo/stores.md` · раздел о рабочих наборах — в `multi-repo/worksets.md` |
| commands.md | `reference/skills.md` (устаревший раздел `/openspec:*` удалён) |
| cli.md | `reference/cli.md` (без установки, которая переносится в `start/installation.md`) |
| supported-tools.md | `reference/supported-tools.md` |
| glossary.md | `reference/glossary.md` |
| faq.md | `help/faq.md` (утверждение о неопубликованной модели удалено; обновление и удаление — в `start/installation.md`) |
| troubleshooting.md | `help/troubleshooting.md` — каноническое расположение всех 5 копий, а также раздела «Получение помощи» |
| migration-guide.md | `help/legacy/migration.md` (понижен в статусе) |
| agent-contract.md | **вне сайта**, в документацию репозитория для участников |

Новые страницы, для которых нет единого текущего источника: `customize/overview.md`, `customize/profiles.md`
(сейчас: двухстрочные фрагменты разбросаны по 12 страницам), а также разделы
`reference/schemas/` и `reference/configuration/` (которые заменили
запланированный `reference/file-formats.md`).

## Переключение

В `website/docs.sync.config.mjs` укажите этот каталог, добавьте перенаправления со старых адресов на новые в
`website/public/_redirects` и проверьте `llms.txt` / `llms-full.txt` /
маршруты Markdown для отдельных страниц. `docs/` остаётся на месте без изменений. Сайт просто
перестаёт его читать.
