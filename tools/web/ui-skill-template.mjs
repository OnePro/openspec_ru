// Генератор русского скилла openspec-ui и slash-команды ui (/opsx:ui, /opsx-ui).
// Выход — файлы бандла dist-ru/ (design D5/D6); патчер tools/apply/index.mjs
// ставит их в проекты с инициализированным OpenSpec рядом с остальными артефактами.
// Codex не имеет команд: для него только skill.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { TOOL_LAYOUTS, commandPath, skillPath } from '../lib/tool-layouts.mjs';

export const UI_SKILL_DIR = 'openspec-ui';
export const UI_COMMAND_ID = 'ui';

const SKILL_DESCRIPTION =
  'Открыть или остановить локальную веб-панель OpenSpec RU со спецификациями и канбан-доской изменений. Используйте, когда пользователь просит «открой спеки», «открой панель со спецификациями», «покажи доску изменений», «запусти веб-панель», «открой openspec ui», «закрой панель», «останови веб-сервер» или вызывает «opsx ui».';

const COMMAND_DESCRIPTION =
  'Открыть или остановить веб-панель OpenSpec RU (спецификации и доска изменений)';

const BODY = [
  'Откройте локальную веб-панель OpenSpec RU (спецификации и канбан-доску изменений) или остановите её.',
  '',
  '**Выберите действие по запросу пользователя:**',
  '- открыть или запустить панель («открой спеки», «покажи доску изменений», «запусти веб-панель», «открой openspec ui», «opsx ui») — раздел «Открыть панель»;',
  '- закрыть или остановить панель («закрой панель», «закрой спеки», «останови веб-сервер») — раздел «Остановить панель».',
  '',
  'Если действие не названо, открывайте панель.',
  '',
  'Если пользователь передал `--port <N>`, добавьте `--port <N>` к команде запуска.',
  '',
  '## Открыть панель',
  '',
  '1. Выполните в корне репозитория команду запуска в фоновом режиме (`--detach`), чтобы не блокировать сессию:',
  '   - если в репозитории есть `tools/apply/cli.mjs`: `node tools/apply/cli.mjs start web --detach`;',
  '   - иначе: `npx --yes github:OnePro/openspec_ru start web --detach`.',
  '2. Команда завершается сразу. Сообщите пользователю URL из её вывода (например, `http://localhost:3000`) и PID процесса.',
  '3. Напомните, что остановить панель можно кнопкой выключения в шапке браузера или попросив «закрой спеки».',
  '',
  'Если каталога `openspec/` нет, команда завершится с кодом 1. Сообщите об этом и предложите выполнить `openspec init`; не создавайте `openspec/` вручную.',
  '',
  '## Остановить панель',
  '',
  'Выполните в корне репозитория:',
  '- `node tools/apply/cli.mjs stop web`, либо',
  '- `npx --yes github:OnePro/openspec_ru stop web`.',
  '',
  'Сообщите результат: сервер остановлен или запущенный сервер для этого репозитория не найден.',
].join('\n');

/** Полный текст SKILL.md для openspec-ui. */
export function renderUiSkill() {
  return [
    '---',
    `name: ${UI_SKILL_DIR}`,
    `description: ${SKILL_DESCRIPTION}`,
    'allowed-tools: Bash(npx:*), Bash(openspec-ru:*), Bash(node:*)',
    'license: MIT',
    'compatibility: Requires Node.js 20+.',
    'metadata:',
    '  author: openspec-ru',
    '  version: "1.0"',
    '  generatedBy: "1.15.0"',
    '---',
    '',
    BODY,
    '',
  ].join('\n');
}

/**
 * Текст команды ui в формате инструмента; null, если у инструмента нет команд.
 */
export function renderUiCommand(toolId) {
  switch (toolId) {
    case 'claude':
      return [
        '---',
        'name: "OPSX: UI"',
        `description: "${COMMAND_DESCRIPTION}"`,
        'allowed-tools: Bash(npx:*), Bash(openspec-ru:*), Bash(node:*)',
        'category: "Инструменты"',
        'tags: ["ui", "web", "dashboard"]',
        '---',
        '',
        BODY,
        '',
      ].join('\n');
    case 'cursor':
      return [
        '---',
        'name: "/opsx-ui"',
        'id: "opsx-ui"',
        'category: "Инструменты"',
        `description: "${COMMAND_DESCRIPTION}"`,
        '---',
        '',
        BODY,
        '',
      ].join('\n');
    case 'github-copilot':
      return ['---', `description: "${COMMAND_DESCRIPTION}"`, '---', '', BODY, ''].join('\n');
    case 'gemini':
      return [`description = "${COMMAND_DESCRIPTION}"`, '', 'prompt = """', BODY, '"""', ''].join('\n');
    default:
      return null;
  }
}

/**
 * Все UI-файлы относительно корня dist-ru/ (раскладка бандла):
 *   skills/openspec-ui/SKILL.md
 *   tool-skills/<tool>/<skillsDir>/openspec-ui/SKILL.md   (все топ-5)
 *   commands/<tool>/<commandPath>                          (инструменты с командами)
 */
export function buildUiArtifacts() {
  const files = [{ path: `skills/${UI_SKILL_DIR}/SKILL.md`, content: renderUiSkill() }];
  for (const layout of TOOL_LAYOUTS) {
    files.push({
      path: `tool-skills/${layout.id}/${skillPath(layout.id, UI_SKILL_DIR)}`,
      content: renderUiSkill(),
    });
    if (!layout.commandPattern) continue;
    files.push({
      path: `commands/${layout.id}/${commandPath(layout.id, UI_COMMAND_ID)}`,
      content: renderUiCommand(layout.id),
    });
  }
  return files;
}

/** Записывает UI-артефакты в каталог бандла (dist-ru/). Возвращает относительные пути. */
export function writeUiArtifacts(distDir) {
  const written = [];
  for (const file of buildUiArtifacts()) {
    const dest = resolve(distDir, file.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file.content, 'utf8');
    written.push(file.path);
  }
  return written;
}
