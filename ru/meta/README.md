<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="OpenSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>Самый любимый фреймворк для спецификаций.</strong></summary>

[![Stars](https://img.shields.io/github/stars/Fission-AI/OpenSpec?style=flat-square&label=Stars)](https://github.com/Fission-AI/OpenSpec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/@fission-ai/openspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@fission-ai/openspec)
[![Contributors](https://img.shields.io/github/contributors/Fission-AI/OpenSpec?style=flat-square&label=Contributors)](https://github.com/Fission-AI/OpenSpec/graphs/contributors)

</details>
<p></p>
Наша философия:

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

<p align="center">
  Следите за <a href="https://x.com/0xTab">@0xTab в X</a> за обновлениями · Присоединяйтесь к <a href="https://discord.gg/YctCnvvshC">Discord-серверу OpenSpec</a> за помощью и ответами на вопросы.
</p>

<!-- TODO: Add GIF demo of /opsx:propose → /opsx:archive workflow -->

## Посмотрите, как это работает

```text
You: /opsx:explore
AI:  What would you like to explore?
You: I want dark mode but I'm not sure how to do it cleanly.
AI:  Let me look at your styling setup...
     Cleanest path here: CSS variables + a small theme context,
     with system-preference detection. No new dependencies. Scope it?
You: Yes, let's do it.

You: /opsx:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /opsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /opsx:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>Как на самом деле выглядят спецификации?</strong></summary>

Обычный Markdown — требования с конкретными сценариями, без специального синтаксиса. Вот что попадает в папку `specs/`, созданную выше:

```markdown
## ADDED Requirements

### Requirement: Theme selection
The app SHALL let users switch between light and dark themes,
defaulting to the system preference.

#### Scenario: User toggles dark mode
- **WHEN** the user clicks the theme toggle
- **THEN** the app switches to dark mode and persists the choice
```

Их пишет ваш ИИ; вы проверяете план до написания какого-либо кода.

OpenSpec создан с помощью OpenSpec — изучите живые [спецификации](openspec/specs) и текущие [изменения](openspec/changes) этого репозитория, чтобы увидеть реальные примеры в масштабе.

</details>

<details>
<summary><strong>Дашборд OpenSpec</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

</details>

## Почему команды выбирают OpenSpec

В соло-режиме OpenSpec помогает вам и вашему ИИ оставаться последовательными в одном репозитории. В команде сложность перемещается: одна функция затрагивает API-сервер, веб-приложение и общую библиотеку; требования принадлежат одной команде, а используют их другие; планирование начинается до появления какого-либо кода.

**[Хранилища](https://openspec.dev/docs/stores)** — это ответ: планирование в отдельном репозитории. Знакомая вам структура `openspec/` (спецификации и изменения), передаваемая через `git push`, как и всё остальное. Единый источник истины, который доступен для чтения всей вашей команде и каждому агенту, работающему с кодом, во всех репозиториях.

- **Кросс-репозиторные функции** — одно изменение, один план, даже если код попадает в три репозитория.
- **Общие требования** — платформенная команда владеет спецификациями; продуктовые команды используют их в режиме «только чтение» — прямо там, где их агент, работающий с кодом, может их прочитать. Никакой дрейфующей вики.
- **План до кода** — зафиксируйте план в хранилище сейчас; репозитории с кодом подтянутся позже.

> Хранилища находятся в **бете**. Начните с [руководства по хранилищам](https://openspec.dev/docs/stores).

## Быстрый старт

Установите OpenSpec. Это один файл, Node.js не нужен (в Alpine Linux сначала выполните `apk add libstdc++ libgcc`).

macOS и Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | iex
```

Предпочитаете пакетный менеджер? `npm install -g @fission-ai/openspec@latest` (требуется Node.js 20.19.0 или выше) или официальная [формула Homebrew](https://formulae.brew.sh/formula/openspec), `brew install openspec`.

Затем перейдите в каталог вашего проекта и выполните инициализацию:

```bash
cd your-project
openspec init
```

> **Хотите, чтобы это сделал ваш ИИ?** Вставьте [промпт для установки](https://openspec.dev/docs/installation#install-with-your-ai-assistant) в вашего ассистента для написания кода — он установит CLI, выполнит `openspec init` и проверит результат.

Теперь поговорите с вашим ИИ:

- **Ещё не знаете, что создать?** Начните с `/opsx:explore` — партнёр для размышлений без рисков: он читает ваш код, взвешивает варианты и формирует план до написания какого-либо кода. ([Быстрый старт](https://openspec.dev/docs/quickstart))
- **Уже знаете, что нужно?** Сразу переходите к `/opsx:propose <what-you-want-to-build>`.

Обе команды есть в профиле по умолчанию. Если нужен расширенный процесс (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive`, `/opsx:onboard`), выберите его командой `openspec config profile` и примените командой `openspec update`.

`/opsx:propose` — каноническое имя; ваш инструмент может писать его как `/opsx-propose` (Cursor, GitHub Copilot), `@opsx-propose` (Amazon Q) или `$openspec-propose` (Codex). Команда `openspec init` выводит правильную форму для выбранных вами инструментов — см. [Поддерживаемые инструменты](https://openspec.dev/docs/supported-tools).

> [!NOTE]
> Не уверены, поддерживается ли ваш инструмент? [Посмотрите полный список](https://openspec.dev/docs/supported-tools) — мы поддерживаем более 30 инструментов и продолжаем добавлять.
>
> Также работает с npm, Homebrew, pnpm, yarn, bun и Nix. [См. варианты установки](https://openspec.dev/docs/installation).

## Документация

Полная документация находится по адресу **[openspec.dev/docs](https://openspec.dev/docs)**.

→ **[Быстрый старт](https://openspec.dev/docs/quickstart)**: первое изменение от начала до конца<br>
→ **[Настройте проект](https://openspec.dev/docs/setup)**: что устанавливает `openspec init`<br>
→ **[CLI](https://openspec.dev/docs/cli)**: справочник по терминалу<br>
→ **[Поддерживаемые инструменты](https://openspec.dev/docs/supported-tools)**: интеграции с инструментами и пути установки<br>
→ **[Настройка](https://openspec.dev/docs/customize)**: профили, конфигурация проекта и схемы<br>
→ **[Хранилища](https://openspec.dev/docs/stores)**: планирование в отдельном репозитории, общее для команды (бета)<br>
→ **[Витрина сообщества](docs/community.md)**: проекты и ресурсы, созданные с помощью и для OpenSpec


## Схемы сообщества

Сторонние наборы схем, распространяемые через отдельные репозитории, — они предоставляют процессы с готовыми соглашениями, интегрирующие OpenSpec с другими инструментами, аналогично тому, как [каталог расширений сообщества github/spec-kit](https://github.com/github/spec-kit/tree/main/extensions) работает с интеграциями инструментов.

→ **[Просмотрите каталог](docs/customization.md#community-schemas)** в документации по настройке.


## Зачем нужен OpenSpec?

ИИ-ассистенты для написания кода мощны, но непредсказуемы, когда требования существуют только в истории чата. OpenSpec добавляет лёгкий слой спецификаций, чтобы вы согласовали, что создавать, до написания какого-либо кода.

- **Соглашайтесь до того, как строите** — человек и ИИ приходят к единому пониманию спецификаций до написания кода
- **Оставайтесь организованными** — каждое изменение получает собственную папку с предложением, спецификациями, дизайном и задачами
- **Работайте гибко** — обновляйте любой артефакт в любое время, без жёстких переходов между фазами
- **Используйте свои инструменты** — работает с более чем 30 ИИ-ассистентами через слэш-команды

### Сравнение с аналогами

**против [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Подробный, но тяжеловесный. Жёсткие переходы между фазами, много Markdown, настройка Python. OpenSpec легче и позволяет свободно итерировать.

**против [Kiro](https://kiro.dev)** (AWS) — Мощный, но вы привязаны к их IDE и ограничены моделями Claude. OpenSpec работает с инструментами, которые вы уже используете.

**против отсутствия решения** — написание кода с ИИ без спецификаций означает размытые промпты и непредсказуемые результаты. OpenSpec обеспечивает предсказуемость без избыточной церемонии.

## Обновление OpenSpec

**Обновите CLI**

При автономной установке выполните `openspec install`. Если установлено через npm:

```bash
npm install -g @fission-ai/openspec@latest
```

Если вы установили OpenSpec через Homebrew:

```bash
brew upgrade openspec
```

**Обновите инструкции для агентов**

Выполните эту команду в каждом проекте, чтобы пересоздать инструкции для ИИ и убедиться, что активны последние слэш-команды:

```bash
openspec update
```

## Примечания по использованию

**Выбор модели**: OpenSpec лучше всего работает с моделями с развитыми рассуждениями. Мы рекомендуем Codex 5.5 и Opus 4.7 как для планирования, так и для реализации.

**Гигиена контекста**: OpenSpec выигрывает от чистого контекстного окна. Очищайте контекст перед началом реализации и поддерживайте хорошую гигиену контекста на протяжении всей сессии.

## Участие в разработке

Каждое изменение начинается с issue. Мы обсуждаем его там, и если договариваемся продолжить, сопровождающий реализует изменение или приглашает вас создать его вместе с нами.

→ **[CONTRIBUTING.md](CONTRIBUTING.md)**: весь процесс — от первого issue до влитого PR

## Прочее

<details>
<summary><strong>Телеметрия</strong></summary>

OpenSpec собирает анонимную статистику использования.

Мы собираем только имена команд и версию, чтобы понимать паттерны использования. Никаких аргументов, путей, содержимого или PII. В CI автоматически отключено.

**Отказ (достаточно одного из вариантов):**
- `openspec config set telemetry.enabled false` (глобальная конфигурация; если не задано — включено)
- `export OPENSPEC_TELEMETRY=0` или `export DO_NOT_TRACK=1` (переменные окружения имеют приоритет над конфигурацией)

</details>

<details>
<summary><strong>Сопровождающие и консультанты</strong></summary>

Список основных сопровождающих и консультантов, помогающих направлять проект, см. в [MAINTAINERS.md](MAINTAINERS.md).

</details>



## Лицензия

MIT
