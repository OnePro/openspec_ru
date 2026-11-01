# OpenSpec RU

> Русская версия OpenSpec: переведённая документация, шаблоны артефактов и патчер для ИИ-инструментов. Неофициальный проект русскоязычного сообщества, не продукт Fission-AI.

## Что это

**openspec_ru** — русскоязычный перевод [OpenSpec](https://github.com/Fission-AI/OpenSpec): системы согласования изменений с ИИ-ассистентом через спецификации. Мы перевели документацию, шаблоны артефактов (`proposal.md`, `design.md`, `tasks.md`, `spec.md`) и slash-команды, а патчер ставит всё это в ваш ИИ-инструмент одной командой.

- Перевод привязан к версии OpenSpec **1.16.0** и проверен редакторски.
- Работает с ИИ-инструментами: Claude Code, Cursor, GitHub Copilot, Codex, Gemini и [другими](/docs/reference/supported-tools).
- Проект живёт на GitHub: [OnePro/openspec_ru](https://github.com/OnePro/openspec_ru).

> [!NOTE]
> Это неофициальный перевод. Официальная (английская) документация OpenSpec — [в остальных разделах этого сайта](/docs/installation).

## Установить за 4 шага

Если OpenSpec ещё не знаком — начните здесь, за несколько минут проект будет работать по-русски:

1. Подготовьте git-репозиторий проекта.
2. Установите CLI OpenSpec на компьютер.
3. Выполните `npx github:OnePro/openspec_ru#v1.16.0 init` в корне проекта.
4. Проверьте, что русские артефакты на месте.

**[Точная последовательность команд →](/docs/ru/install)**

## Что дальше

- [Установка и обновление openspec-ru](/docs/ru/install) — все команды и проверки.
- [Шаблоны артефактов](/docs/ru/templates/proposal) — как выглядят `proposal.md`, `design.md`, `tasks.md`, `spec.md` на русском.
- [Документация OpenSpec](/docs/installation) — перевод официальных страниц: концепции, настройка, справочник CLI.
- [Веб-панель изменений](https://github.com/OnePro/openspec_ru) — канбан-доска и просмотр спецификаций из терминала (`openspec-ru start web`).

## Как предложить правку

Замечания по переводу оформляйте issue или pull request в [OnePro/openspec_ru](https://github.com/OnePro/openspec_ru). Ошибки самого OpenSpec сообщайте в апстрим [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec).
