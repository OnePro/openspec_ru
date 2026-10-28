// Единый источник правды: раскладки топ-5 AI-инструментов (OpenSpec v1.15.0).
// Источники апстрима: src/core/config.ts (AI_TOOLS.skillsDir),
// src/core/command-generation/adapters/*.ts (getFilePath).
// Используется tools/build-ru.mjs и будущим патчером tools/apply/.
// Codex не имеет адаптера команд (skills-invocable): только skills в .agents/skills.

import { posix } from 'node:path';

/** Имена каталогов skills (skills/<dirName>/SKILL.md) совпадают с апстримом. */
export const SKILL_FILE = 'SKILL.md';

export const TOOL_LAYOUTS = Object.freeze([
  {
    id: 'claude',
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    commandsDir: '.claude/commands/opsx',
    commandPattern: '.claude/commands/opsx/<id>.md',
    commandExt: '.md',
    invocation: '/opsx:<id>',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    commandsDir: '.cursor/commands',
    commandPattern: '.cursor/commands/opsx-<id>.md',
    commandExt: '.md',
    invocation: '/opsx-<id>',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    skillsDir: '.github/skills',
    commandsDir: '.github/prompts',
    commandPattern: '.github/prompts/opsx-<id>.prompt.md',
    commandExt: '.prompt.md',
    invocation: '/opsx-<id>',
  },
  {
    id: 'codex',
    name: 'Codex',
    skillsDir: '.agents/skills',
    commandsDir: null,
    commandPattern: null,
    commandExt: null,
    invocation: null,
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    skillsDir: '.gemini/skills',
    commandsDir: '.gemini/commands/opsx',
    commandPattern: '.gemini/commands/opsx/<id>.toml',
    commandExt: '.toml',
    invocation: '/opsx:<id>',
  },
]);

export const TOOL_IDS = Object.freeze(TOOL_LAYOUTS.map((t) => t.id));

export function getLayout(id) {
  const layout = TOOL_LAYOUTS.find((t) => t.id === id);
  if (!layout) throw new Error(`tool-layouts: неизвестный инструмент ${id}`);
  return layout;
}

/** Путь файла команды от корня проекта (posix) или null, если у инструмента нет команд. */
export function commandPath(toolId, commandId) {
  const { commandPattern } = getLayout(toolId);
  return commandPattern ? commandPattern.replace('<id>', commandId) : null;
}

/** Путь SKILL.md от корня проекта (posix). */
export function skillPath(toolId, skillDirName) {
  return posix.join(getLayout(toolId).skillsDir, skillDirName, SKILL_FILE);
}
