# Установка openspec-ru

> Точная последовательность: от пустого проекта до русского OpenSpec за четыре шага. Команды закреплены на версии OpenSpec 1.15.x.

> [!NOTE]
> Страница проекта openspec_ru, не апстрима. Официальная инструкция по OpenSpec — [в разделе «Установка»](/docs/installation).

## Быстрый старт: всё одним блоком

Предусловия: в корне проекта инициализирован git (если нет — сначала `git init`) и установлен Node.js 20.19+.

```bash
# 1. Установите CLI OpenSpec один раз на компьютер
#    macOS/Linux:
curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh
#    Windows (PowerShell):
#    irm https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | iex

# 2. Перейдите в корень вашего git-проекта
cd ~/projects/my-project

# 3. Установите openspec-ru: выполнит openspec init сам и накатит русские артефакты
npx --yes github:OnePro/openspec_ru#v1.15.0 init
```

После выполнения проверьте результат (шаг 3 ниже). Пояснения к каждому шагу и разбор ошибок — далее.

## Шаг 0. Подготовьте проект

Перейдите в корень вашего проекта. Патчеру нужен git-репозиторий: без него установка заблокируется.

```bash
cd ~/projects/my-project
git rev-parse --is-inside-work-tree
```

- Вывелось `true` — переходите к шагу 1.
- Вывелось ошибку — выполните `git init`, затем повторите проверку.

Также понадобятся Node.js с npm (для `npx`): версия 20.19.0 или новее. Проверка: `node --version`.

## Шаг 1. Установите CLI OpenSpec

Выполните один раз на компьютере (вне зависимости от числа проектов).

**macOS и Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | iex
```

Чтобы установщик взял именно версию 1.15.x (к которой привязан перевод), задайте переменную до выполнения команды:

```bash
export OPENSPEC_VERSION=v1.15.0   # macOS/Linux
# Windows PowerShell:
# $env:OPENSPEC_VERSION = "v1.15.0"
```

**Проверка:**

```bash
openspec --version
```

Должно вывестись `1.15.x`. Если команда не найдена — перезапустите терминал или добавьте `~/.local/bin` в PATH (установщик напечатает инструкцию). Если версия другая — не продолжайте: обновите или переустановите OpenSpec до 1.15.x.

## Шаг 2. Установите openspec-ru

В корне проекта (там, где `.git`):

```bash
npx --yes github:OnePro/openspec_ru#v1.15.0 init
```

Команда выполнит штатный `openspec init` сама: выберите в меню ИИ-инструменты проекта (или передайте сразу, например `--tools claude`). Затем патчер накатит русские skills и slash-команды и установит команду `openspec-ru` в ваш PATH.

Неинтерактивный вариант для CI или скриптов:

```bash
npx --yes github:OnePro/openspec_ru#v1.15.0 init --tools claude
```

## Шаг 3. Проверьте результат

1. В корне проекта появился `openspec/` с русским конфигом — откройте `openspec/config.yaml`, там должно быть `Language: Russian`.
2. В каталоге выбранного инструмента появились русские skills: например, `.claude/skills/openspec-propose/SKILL.md` (Claude Code) или `.cursor/commands/openspec/...` (Cursor).

Если skills появились не у всех выбранных инструментов — выполните `npx --yes github:OnePro/openspec_ru#v1.15.0 apply`.

## Обновление

```bash
npx --yes github:OnePro/openspec_ru#v1.15.0 update
```

Команда обновляет штатный OpenSpec до текущего и накатывает свежий русский бандл. Требует OpenSpec 1.15.x.

## Если что-то пошло не так

- **«В каталоге не инициализирован Git»** — вернитесь к шагу 0: патчер намеренно не работает вне git-репозитория.
- **«не обнаружено установленных артефактов OpenSpec»** (при `apply`) — сначала выполните `init`, `apply` работает только поверх установленного OpenSpec.
- **Предупреждение о расхождении версий** — версия вашего OpenSpec отличается от 1.15: обновите OpenSpec или возьмите другой тег openspec_ru из [релизов](https://github.com/OnePro/openspec_ru/releases).
