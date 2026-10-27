# Установка

> Установите `openspec` CLI на своей машине, обновите и удалите его.


## Установка

OpenSpec устанавливается одним файлом `openspec`. Node.js не требуется.

В macOS или Linux в терминале:

```bash
curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.sh | sh
```

В Windows в PowerShell:

```powershell
irm https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/scripts/binary/install.ps1 | iex
```

- **Куда устанавливается**: `~/.local/bin`; в Windows — `%LOCALAPPDATA%\Programs\openspec`, который добавляется в пользовательский PATH.
- **Что проверяется**: выбирается файл для вашей машины и проверяется по `SHA256SUMS` релиза перед установкой.
- **Какой релиз**: самый новый, у которого все файлы уже прикреплены. В течение нескольких минут после публикации релиза, пока его файлы загружаются, устанавливается предыдущий, и об этом сообщается.
- **Alpine Linux**: сначала выполните `apk add libstdc++ libgcc`.
- **Параметры**: задайте `OPENSPEC_INSTALL_DIR`, чтобы установить в другую папку, или `OPENSPEC_VERSION=v1.15.0`, чтобы зафиксировать релиз.

Если установщик сообщает, что папки нет в PATH, добавьте её, как показано. Затем [проверьте, что всё работает](#check-it-worked).

Сам процесс выполняется в инструменте ИИ-разработки: Claude Code, Cursor или любом другом инструменте из [списка поддерживаемых](../reference/supported-tools.md).

### Скачайте вручную

Каждый [релиз](https://github.com/Fission-AI/OpenSpec/releases/latest) содержит по одному файлу на платформу:

| Платформа | Файл |
|---|---|
| macOS 13+ (Apple silicon / Intel) | `openspec-darwin-arm64` / `openspec-darwin-x64` |
| Linux, glibc 2.17+ (arm64 / x64) | `openspec-linux-arm64` / `openspec-linux-x64` |
| Alpine 3.17+ (arm64 / x64) | `openspec-linux-arm64-musl` / `openspec-linux-x64-musl` |
| Windows 10+ (arm64 / x64) | `openspec-windows-arm64.exe` / `openspec-windows-x64.exe` |

Переименуйте его в `openspec` (в Windows — `openspec.exe`), выполните `chmod +x openspec` в macOS или Linux и поместите в папку из PATH.

> [!NOTE]
> macOS блокирует файл, скачанный через браузер, пока вы не выполните `xattr -d com.apple.quarantine openspec`. Команде установки выше это не требуется.

### Проверьте загруженный файл

Каждый бинарный файл релиза сопровождается подписанной записью о запуске процесса, который его собрал. С [GitHub CLI](https://cli.github.com) в терминале:

```bash
gh attestation verify openspec-darwin-arm64 --repo Fission-AI/OpenSpec
```

Команда подтверждает, что файл — тот, который собрал процесс этого релиза, или завершается с ошибкой. Это необязательно: установщик уже проверяет каждую загрузку по `SHA256SUMS`.

## Установка с помощью ИИ-ассистента

Вставьте это в чат с ИИ:

```text
Fetch https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/install.md and follow it.
```

Или в терминале передайте его CLI-агенту через pipe (показан Claude Code):

```bash
curl -fsSL https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/install.md | claude
```

Это загружает [install.md в корне репозитория](https://github.com/Fission-AI/OpenSpec/blob/main/install.md), предложение, написанное для любого агента, умеющего выполнять команды оболочки (некоторые IDE-интеграции не умеют). Ожидайте, что ассистент:

1. Пропустит установку, если CLI уже есть на машине, и предложит обновить его тем способом, которым он был установлен. Если это был npm или Homebrew, один раз упомянет, что `openspec install` переключает на автономную установку, не настаивая на этом. Иначе покажет команду установки выше и дождётся вашего подтверждения перед запуском.
2. Использует npm только если вы попросите или установщик завершится с ошибкой, и остановится, если версия Node старше 20.19.0.
3. Проверит, что `openspec` есть в PATH.
4. Назовёт папку, которую, по его мнению, вы имеете в виду, предложит инструмент ИИ, с которым вы уже общаетесь, и спросит, какими ещё пользуетесь, затем выполнит там `openspec init` (шаг [настройки проекта](setup.md)).
5. Сообщит, что создал init, и точное написание для вызова OpenSpec в вашем инструменте.

Он останавливается перед любыми привилегированными действиями и никогда не редактирует файлы запуска оболочки. [Команда установки выше](#install) и [пакетные менеджеры ниже](#package-managers) — источник истины, и предложение выполняет их за вас.

Этот способ установки новый, и результат может отличаться в зависимости от используемой модели. Используйте его, только если готовы исправлять ошибки ИИ. В противном случае рекомендуем следовать стандартному способу ниже.

## Пакетные менеджеры

Они устанавливают OpenSpec как пакет Node.js, поэтому требуется Node.js 20.19.0 или новее (Homebrew и Nix приносят свою версию). В терминале:

```bash
node --version
```

Если выводится `v20.19.0` или выше, установите через npm:

```npm
npm install -g @fission-ai/openspec@latest
```

Если нет, установите более новую версию Node с [nodejs.org](https://nodejs.org) или через менеджер версий (nvm, fnm, asdf, volta), либо воспользуйтесь [автономной установкой](#install).

### Homebrew

Homebrew устанавливает OpenSpec и его зависимость Node.js в macOS или Linux. В терминале:

```bash
brew install openspec
```

Формула опубликована в [homebrew-core](https://formulae.brew.sh/formula/openspec), поэтому добавлять tap не нужно.

### Yarn

`yarn global add` работает только в Yarn Classic (1.x). Современный Yarn убрал глобальную установку, поэтому вместо него используйте npm, pnpm или bun. Глобальному CLI не обязательно совпадать с пакетным менеджером вашего проекта.

### Bun

Bun устанавливает OpenSpec, но не запускает его, поэтому Node всё равно нужен на машине (см. [Пакетные менеджеры](#package-managers)). Без него каждая команда завершается с ошибкой `env: node: No such file or directory`. Bun так обращается с [любым Node CLI](https://bun.com/docs/pm/bunx#shebangs).

### Deno

Deno устанавливает CLI из npm и требует явных флагов разрешений. В терминале:

```bash
deno install --global \
  --allow-read --allow-write --allow-env --allow-sys=cpus,homedir --allow-net=edge.openspec.dev \
  npm:@fission-ai/openspec@latest
```

Некоторые команды запускают другую программу: [`openspec config edit`](../reference/cli.md) открывает ваш редактор. Deno прерывает их запросом разрешения при каждом запуске. Чтобы запросы прекратились, добавьте в команду установки областной `--allow-run=<program>`.

> [!NOTE]
> Если Deno не может разрешить `@latest`, зафиксируйте диапазон версий: `npm:@fission-ai/openspec@^1.7.0`.

### Nix

Репозиторий OpenSpec содержит Nix flake. Установите его в свой профиль. В терминале:

```bash
nix profile install github:Fission-AI/OpenSpec
```

Или сначала выполните разовую команду без установки:

```bash
nix run github:Fission-AI/OpenSpec -- --version
```

В PATH при этом ничего не остаётся, поэтому проверять после этого нечего.

Чтобы вместо этого поместить OpenSpec в dev shell проекта, добавьте flake как input и используйте его пакет по умолчанию; выходы перечислены в [flake.nix](https://github.com/Fission-AI/OpenSpec/blob/main/flake.nix).

Nix-пакет поставляет скрипты автодополнения для Bash, Fish и Zsh в стандартных
местах (`share/bash-completion/completions`, `share/fish/vendor_completions.d`,
`share/zsh/site-functions`), поэтому они загружаются вместе с пакетом, и выполнять
`openspec completion install` не нужно.

## Проверьте, что всё работает

Каким бы способом вы ни воспользовались, в терминале:

```bash
openspec --version
```

Если выводится номер версии, CLI есть в PATH. Устанавливается он один раз на машину.

Далее [настройте проект](setup.md). Если ваш ассистент уже выполнил init, на той странице показано, что он записал, и как это изменить.

## Переход с npm на автономную установку

Переход необязателен; npm продолжает работать. Ваши настройки и проекты сохраняются; меняется только программа.

**1. Установите автономную копию.** В терминале:

```bash
openspec install
```

Устанавливается автономный `openspec` и выводится команда, удаляющая вашу копию из npm или Homebrew.

**2. Удалите старую копию.** Обычно она стоит первой в PATH, поэтому, пока она не удалена, запускается именно она. Выполните команду, которую вывел шаг 1, например:

```npm
npm uninstall -g @fission-ai/openspec
```

**3. Проверьте, какая копия запускается.** Откройте новый терминал:

```bash
openspec version
```

Должно вывестись `OpenSpec <version> (standalone)`. Если вместо этого указан пакетный менеджер, в PATH всё ещё есть другая копия: `which -a openspec` (Windows: `where.exe openspec`) перечисляет все копии — удалите остальные.

Проекты переинициализировать не нужно. Чтобы переключиться обратно, удалите файл и снова выполните установку через npm.

## Обновление

В терминале, в каждом проекте, где вы выполняли init:

```bash
openspec update
```

Когда выходит более новая версия CLI, [`openspec update`](../reference/cli.md#openspec-update) сообщает об этом и может установить её за вас; такое обновление выполняется один раз на машину. Каждый запуск обновляет сгенерированные в проекте skills и команды, которые сами по себе не обновляются. Актуальный проект выводит `✓ All 2 tool(s) up to date (v1.7.0)`.


> [!WARNING]
> При автономной установке выполните `openspec install`, чтобы заменить вашу копию на месте; `openspec update` сообщит, когда выйдет более новая версия. В Homebrew выполните `brew upgrade openspec`. В Deno повторите [установку через Deno](#deno) с `-f`; без него установленная команда не перезаписывается. В Nix используйте `nix profile upgrade openspec`.

> [!NOTE]
> Глобальная установка через npm привязана к одной установке Node. Переключите версии Node через nvm — команда `openspec` не переедет вместе с ней, поэтому установите её заново под новой версией.

## Удаление

Чтобы удалить OpenSpec, выполните шаги ниже; ни один из них не затрагивает исходный код. Можно также указать вашему агенту на этот раздел и доверить удаление ему.

**1. Удалите [автодополнения оболочки](../reference/cli.md#openspec-completion)**, если вы их настраивали, пока CLI ещё может это сделать. В терминале:

```bash
openspec completion uninstall
```

**2. Удалите CLI.** При автономной установке удалите `~/.local/bin/openspec` (Windows: `%LOCALAPPDATA%\Programs\openspec` и эту папку из пользовательского PATH). При npm в терминале:

```npm
npm uninstall -g @fission-ai/openspec
```

В Homebrew: `brew uninstall openspec`. В Deno: `deno uninstall --global openspec`. В Nix: `nix profile remove openspec`. После этого оболочка не должна находить `openspec`.

**3. Удалите остатки или оставьте их.**

- Сгенерированные файлы агентов: skills `openspec-*` и команды `opsx` в каталогах вроде `.claude/` или `.agents/` для каждого проекта. [Поддерживаемые инструменты](../reference/supported-tools.md) перечисляют пути для каждого инструмента; MiniMax Code хранит skills в `~/.minimax/skills`.
- Остатки старых версий: маркерные блоки в `CLAUDE.md` или `AGENTS.md` (удалите блок, файл оставьте) и предложения `opsx-*.md` в `~/.codex/prompts`.
- Папка `openspec/`: сначала остановитесь. `specs/` и `changes/archive/` — ваша история системы, обычный Markdown, который удобно читается и без OpenSpec.
- Состояние на машине: настройки и идентификатор телеметрии в `~/.config/openspec/`; переопределения схем, регистрации хранилищ и встроенные схемы автономной установки (`binary-schemas/`) в `~/.local/share/openspec/` (Windows: `%APPDATA%\openspec`, `%LOCALAPPDATA%\openspec`). Регистрации — это указатели; репозитории хранилищ, на которые они указывают, не затрагиваются.
