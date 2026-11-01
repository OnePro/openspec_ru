# Поддерживаемые инструменты

> Какие ИИ-инструменты для программирования поддерживает OpenSpec и синтаксис команд каждого из них.

Каждый инструмент в матрице запускает одни и те же процессы OpenSpec. Навык и его команда содержат одинаковые инструкции процесса. Единственное отличие — в том, что вы вводите. Какую форму устанавливает инициализация, определяется настройкой доставки, описанной в разделе [Настройка проекта](../start/setup.md#the-workflow-files-skills-and-commands).

## Матрица поддержки

Вызовы показаны для процесса применения. Каждый процесс имеет ту же форму. Идентификатор передаётся в `openspec init --tools <id>`, чтобы пропустить меню выбора ([CLI](cli.md)).

| Инструмент | `--tools` id | Навыки | Вызов навыка | Команды | Вызов команды |
|---|---|---|---|---|---|
| Amazon Q Developer | `amazon-q` | `.amazonq/skills/` | `/openspec-apply-change` | `.amazonq/prompts/` | `@opsx-apply` |
| Amp | `amp` | `.agents/skills/` | `/openspec-apply-change` | нет | нет |
| Antigravity | `antigravity` | `.agents/skills/` | `/openspec-apply-change` | `.agents/workflows/` | `/opsx-apply` |
| AtomCode | `atomcode` | `.atomcode/skills/` | `/openspec-apply-change` | `.atomcode/commands/` | `/opsx-apply` |
| Auggie (Augment CLI) | `auggie` | `.augment/skills/` | `/openspec-apply-change` | `.augment/commands/` | `/opsx-apply` |
| IBM Bob | `bob` | `.bob/skills/` | `/openspec-apply-change` | `.bob/commands/` | `/opsx-apply` |
| Claude Code | `claude` | `.claude/skills/` | `/openspec-apply-change` | `.claude/commands/opsx/` | `/opsx:apply` |
| Cline | `cline` | `.cline/skills/` | `/openspec-apply-change` | `.clinerules/workflows/` | `/opsx-apply` |
| CodeArts | `codeartsagent` | `.codeartsdoer/skills/` | `/openspec-apply-change` | нет | нет |
| CodeBuddy Code (CLI) | `codebuddy` | `.codebuddy/skills/` | `/openspec-apply-change` | `.codebuddy/commands/opsx/` | `/opsx:apply` |
| Code Studio | `codestudio` | `.codestudio/skills/` | `/openspec-apply-change` | `.codestudio/prompts/` | `/opsx-apply` |
| Codex | `codex` | `.agents/skills/` | `$openspec-apply-change` | нет | нет |
| Continue | `continue` | `.continue/skills/` | `/openspec-apply-change` | `.continue/prompts/` | `/opsx-apply` |
| CoStrict | `costrict` | `.cospec/skills/` | `/openspec-apply-change` | `.cospec/openspec/commands/` | `/opsx-apply` |
| Crush | `crush` | `.crush/skills/` | `/openspec-apply-change` | `.crush/commands/opsx/` | `/opsx:apply` |
| Cursor | `cursor` | `.cursor/skills/` | `/openspec-apply-change` | `.cursor/commands/` | `/opsx-apply` |
| DeepSeek Harness | `dsh` | `.dsh/skills/` | `/openspec-apply-change` | нет | нет |
| Devin Desktop (ранее Windsurf) | `devin` | `.devin/skills/` | `/openspec-apply-change` | `.devin/workflows/` | `/opsx-apply` |
| EasyCode | `easycode` | `.easycode/skills/` | `/openspec-apply-change` | `.easycode/commands/opsx/` | `/opsx:apply` |
| Factory Droid | `factory` | `.factory/skills/` | `/openspec-apply-change` | `.factory/commands/` | `/opsx-apply` |
| ForgeCode | `forgecode` | `.forge/skills/` | `/openspec-apply-change` | нет | нет |
| Gemini CLI | `gemini` | `.gemini/skills/` | `/openspec-apply-change` | `.gemini/commands/opsx/` | `/opsx:apply` |
| GigaCode | `gigacode` | `.gigacode/skills/` | `/openspec-apply-change` | `.gigacode/commands/` | `/opsx-apply` |
| GitHub Copilot | `github-copilot` | `.github/skills/` | `/openspec-apply-change` | `.github/prompts/` | `/opsx-apply` |
| Grok Build | `grok` | `.grok/skills/` | `/openspec-apply-change` | нет | нет |
| GSD | `gsd` | `.agents/skills/` | запросите `openspec-apply-change` | нет | нет |
| Hermes Agent | `hermes` | `.hermes/skills/` | `/openspec-apply-change` | нет | нет |
| iFlow | `iflow` | `.iflow/skills/` | `/openspec-apply-change` | `.iflow/commands/` | `/opsx-apply` |
| Junie | `junie` | `.junie/skills/` | `/openspec-apply-change` | `.junie/commands/` | `/opsx-apply` |
| Kilo Code | `kilocode` | `.kilocode/skills/` | `/openspec-apply-change` | `.kilo/command/` | `/opsx-apply` |
| Kimi Code | `kimi` | `.kimi-code/skills/` | `/skill:openspec-apply-change` | нет | нет |
| Kiro | `kiro` | `.kiro/skills/` | `/openspec-apply-change` | `.kiro/prompts/` | `/opsx-apply` |
| Lingma | `lingma` | `.lingma/skills/` | `/openspec-apply-change` | `.lingma/commands/opsx/` | `/opsx:apply` |
| MiniMax Code | `minimax-code` | `~/.minimax/skills/` (глобально) | `/openspec-apply-change` | нет | нет |
| Mistral Vibe | `vibe` | `.vibe/skills/` | `/openspec-apply-change` | нет | нет |
| Oh My Pi | `oh-my-pi` | `.omp/skills/` | `/openspec-apply-change` | `.omp/commands/` | `/opsx-apply` |
| OpenCode | `opencode` | `.opencode/skills/` | `/openspec-apply-change` | `.opencode/commands/` | `/opsx-apply` |
| Pi | `pi` | `.pi/skills/` | `/openspec-apply-change` | `.pi/prompts/` | `/opsx-apply` |
| Qoder | `qoder` | `.qoder/skills/` | `/openspec-apply-change` | `.qoder/commands/opsx/` | `/opsx:apply` |
| Qwen Code | `qwen` | `.qwen/skills/` | `/openspec-apply-change` | `.qwen/commands/` | `/opsx-apply` |
| Trae | `trae` | `.trae/skills/` | `/openspec-apply-change` | `.trae/commands/` | `/opsx-apply` |
| [Veai](https://veai.ru/docs/veai/download) | `veai` | `.veai/skills/` | `/openspec-apply-change` | нет | нет |
| Warp | `warp` | `.warp/skills/` | `/openspec-apply-change` | нет | нет |
| ZCode | `zcode` | `.zcode/skills/` | `/openspec-apply-change` | `.zcode/commands/opsx/` | `/opsx:apply` |
| Zoo Code | `roocode` | `.roo/skills/` | `/openspec-apply-change` | `.roo/commands/` | `/opsx-apply` |
| Другие / Универсальные | `agents` | `.agents/skills/` | `/openspec-apply-change` | нет | нет |

- **Вызов навыка**: регистрирует ли инструмент навыки как вводимые элементы, зависит от поведения самого инструмента. В столбце показано написание, которое OpenSpec использует в сгенерированных файлах и в подсказке, выводимой при инициализации. Если ввод ничего не даёт, обратитесь к документации вашего инструмента.
- **Форматы файлов команд**: большинство инструментов принимают файлы команд `.md`. EasyCode и Gemini CLI принимают `.toml`, Continue — `.prompt`, а Code Studio, Kiro и GitHub Copilot — `.prompt.md`. Написание при вводе остаётся одинаковым в любом случае.

## Примечания по инструментам

Инструменты, не перечисленные здесь, работают в точности так, как указано в их строке.

### Amp

- **Навыки проекта**: Amp читает навыки OpenSpec из `.agents/skills/`.
- **Без файлов команд**: Amp запускает навыки напрямую, поэтому инициализация пропускает генерацию команд.
- **Общая папка**: Amp разделяет `.agents/skills/` с Antigravity, Codex, Zed Agent и целью `agents`. OpenSpec записывает дерево навыков один раз.

### Antigravity

- **Текущая папка**: Antigravity v1.20.5 и новее читают навыки и процессы рабочей области из `.agents/`.
- **Устаревшая папка**: после того как OpenSpec записывает замены, он удаляет эквивалентные сгенерированные файлы из `.agent/`. Пользовательские файлы и изменённые сгенерированные файлы остаются в `.agent/` для вашей проверки.
- **Общие навыки**: Antigravity разделяет `.agents/skills/` с Amp, Codex, Zed Agent и целью `agents`. OpenSpec записывает это дерево навыков один раз, но при этом продолжает записывать команды Antigravity в `.agents/workflows/`.

### Cline

Cline читает команды из `.clinerules/workflows/`, а не из своей папки `.cline/`. Навыки остаются в `.cline/skills/`.

### Codex

- **CLI и расширение IDE**: упомяните `$openspec-propose` вместе с вашей идеей или запустите `/skills`, чтобы выбрать навык. Codex не распознаёт `/openspec-propose` ([проблема в основном репозитории](https://github.com/openai/codex/issues/11817)).
- **Настольное приложение**: откройте раздел навыков на боковой панели и выберите `openspec-propose`. В [документации по навыкам OpenAI](https://learn.chatgpt.com/docs/build-skills) описаны оба интерфейса.
- **Без файлов команд**: Codex запускает навыки напрямую, поэтому инициализация пропускает команды, даже если доставка включает их, и выводит `Commands skipped for: codex (uses skills)`.
- **Общая папка**: навыки Codex попадают в `.agents/skills/` — то же дерево, которое используют Amp, Antigravity, Zed Agent и цель `agents`. При выборе нескольких вариантов сохраняется единое совместимое дерево, а в его передачах управления указываются и `$openspec-*`, и `/openspec-*`, когда им владеет Codex.
- **Устаревший путь**: навыки, установленные в `.codex/skills/` старыми версиями, переносятся при следующем запуске `openspec update`.

### DeepSeek Harness

- **Корень проекта**: DSH использует ближайший родительский каталог, содержащий `.git`, или текущий каталог вне Git. Запустите `openspec init --tools dsh` там. Для вложенного проекта OpenSpec добавьте абсолютный путь к его каталогу `.dsh/skills/` в `customSkillDirs` в DSH. Навыки из корня Git по-прежнему имеют приоритет при совпадении имён ([правила обнаружения в основном репозитории](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/skill/skill-filesystem)).
- **Приоритет**: `.dsh/skills/` имеет приоритет над одноимёнными навыками в `.agents/skills/`.
- **Доставка**: используйте `skills` или `both`. При значении `commands` процессы DSH не устанавливаются. Измените доставку с помощью `openspec config profile`, а затем перезапустите `openspec init --tools dsh`.

### Devin Desktop (ранее Windsurf)

- **Два агента**: файлы команд в `.devin/workflows/` работают только в Devin Desktop. Devin Local запускает только навыки, поэтому сгенерированные навыки ссылаются на `/openspec-<skill>`, что работает в обоих вариантах.
- **Переименование**: `--tools windsurf` по-прежнему разрешается в `devin`. Проекту, содержащему файлы OpenSpec в устаревшей папке `.windsurf/`, при следующем запуске `openspec update` будет предложено перенести их.

### GitHub Copilot

- **Расширения IDE (доставка команд)**: VS Code, JetBrains и Visual Studio загружают `.github/prompts/opsx-<id>.prompt.md` как `/opsx-<id>`. Если команда исчезает, хотя её файл всё ещё существует, перезапустите IDE.
- **Copilot CLI (доставка навыков)**: CLI игнорирует `.github/prompts/` и вместо этого загружает `.github/skills/openspec-*/SKILL.md`. Вызывайте навык как `/openspec-<skill>`. Если навык исчезает, хотя его файл всё ещё существует, запустите `/skills reload`, а затем `/skills info openspec-propose`, чтобы подтвердить обнаружение.

### GSD

- **Навыки проекта**: GSD читает процессы OpenSpec из [`.agents/skills/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/skills.md).
- **Вызов**: попросите GSD использовать навык `openspec-<workflow>`. GSD также может выбрать подходящий навык через свою настройку обнаружения навыков.
- **Без файлов субагентов**: [`.gsd/agents/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/subagents.md) содержит определения субагентов GSD. OpenSpec не записывает туда навыки процессов.

### Hermes Agent

По умолчанию Hermes загружает навыки только из `~/.hermes/skills/`. Добавьте папку проекта `.hermes/skills/` в `skills.external_dirs` в файле `~/.hermes/config.yaml`; инициализация выводит это напоминание после установки.

### MiniMax Code

- **Только глобально**: навыки помещаются в `~/.minimax/skills/`. Внутри репозитория ничего не записывается.
- **Безопасность между проектами**: доставка только команд оставляет глобальные навыки на месте, поэтому настройка одного проекта не может удалить навыки, используемые другим проектом.

### Warp

- **Навыки всегда**: навыки помещаются в `.warp/skills/`, даже когда выбрана доставка `commands`, поскольку у Warp нет файлов команд и он вызывает навыки напрямую.
- **Что занимает OpenSpec**: только `.warp/skills/`. Настройки Warp и файл `WARP.md` не создаются и не редактируются.

### Другие / Универсальные (общие навыки `.agents`)

- **Когда подходит**: любой инструмент, который читает общую папку `.agents/skills/`, включая инструменты, не представленные отдельной строкой в матрице. Выбирайте этот вариант, если вашего ассистента нет в списке. Поле поиска в меню инициализации находит его по запросам `universal`, `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`, `vendor-neutral` или `agents.md`.
- **Совместно с другими целями**: Amp, Antigravity, Codex, Zed Agent и эта цель разделяют одно физическое дерево навыков. OpenSpec записывает одного владельца в `.openspec-target` и формирует дерево один раз за запуск. Отдельные файлы команд для каждого инструмента по-прежнему генерируются.
- **Что занимает OpenSpec**: только папки `openspec-*` и маркер `.openspec-target`. Всё остальное внутри `.agents/` остаётся нетронутым.
- **`AGENTS.md`**: не создаётся и не редактируется. Целью является папка `.agents/`, а не этот файл.
