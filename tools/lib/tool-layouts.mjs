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

// Дополнительные 39 AI-инструментов OpenSpec v1.15.0 (skills-only / универсальные skillsDir).
// Используют базовые русские шаблоны из dist-ru/skills/<skill>/SKILL.md
// с сохранением generatedBy и учётом префикса вызова скилла (kimi, rovodev, codeassistant).
export const EXTRA_TOOL_LAYOUTS = Object.freeze([
  { id: 'amazon-q', name: 'Amazon Q Developer', skillsDir: '.amazonq/skills' },
  { id: 'atomcode', name: 'AtomCode', skillsDir: '.atomcode/skills' },
  { id: 'auggie', name: 'Auggie (Augment CLI)', skillsDir: '.augment/skills' },
  { id: 'bob', name: 'IBM Bob', skillsDir: '.bob/skills' },
  { id: 'cline', name: 'Cline', skillsDir: '.cline/skills' },
  { id: 'codeartsagent', name: 'CodeArts', skillsDir: '.codeartsdoer/skills' },
  { id: 'codeassistant', name: 'SourceCraft Code Assistant', skillsDir: '.codeassistant/skills', skillRefStyle: 'natural' },
  { id: 'codebuddy', name: 'CodeBuddy Code', skillsDir: '.codebuddy/skills' },
  { id: 'codestudio', name: 'Code Studio', skillsDir: '.codestudio/skills' },
  { id: 'command-code', name: 'Command Code', skillsDir: '.commandcode/skills' },
  { id: 'continue', name: 'Continue', skillsDir: '.continue/skills' },
  { id: 'costrict', name: 'CoStrict', skillsDir: '.cospec/skills' },
  { id: 'crush', name: 'Crush', skillsDir: '.crush/skills' },
  { id: 'devin', name: 'Devin Desktop', skillsDir: '.devin/skills' },
  { id: 'windsurf', name: 'Windsurf', skillsDir: '.windsurf/skills' },
  { id: 'dsh', name: 'DeepSeek Harness', skillsDir: '.dsh/skills' },
  { id: 'easycode', name: 'EasyCode', skillsDir: '.easycode/skills' },
  { id: 'factory', name: 'Factory Droid', skillsDir: '.factory/skills' },
  { id: 'forgecode', name: 'ForgeCode', skillsDir: '.forge/skills' },
  { id: 'gigacode', name: 'GigaCode', skillsDir: '.gigacode/skills' },
  { id: 'grok', name: 'Grok Build', skillsDir: '.grok/skills' },
  { id: 'gsd', name: 'GSD', skillsDir: '.gsd/skills', skillRefStyle: 'natural' },
  { id: 'hermes', name: 'Hermes Agent', skillsDir: '.hermes/skills' },
  { id: 'iflow', name: 'iFlow', skillsDir: '.iflow/skills' },
  { id: 'junie', name: 'Junie', skillsDir: '.junie/skills' },
  { id: 'kilocode', name: 'Kilo Code', skillsDir: '.kilocode/skills' },
  { id: 'kimi', name: 'Kimi Code', skillsDir: '.kimi-code/skills', skillRefStyle: 'kimi' },
  { id: 'kimi-legacy', name: 'Kimi Code (.kimi)', skillsDir: '.kimi/skills', skillRefStyle: 'kimi' },
  { id: 'kiro', name: 'Kiro', skillsDir: '.kiro/skills' },
  { id: 'lingma', name: 'Lingma', skillsDir: '.lingma/skills' },
  { id: 'minimax-code', name: 'MiniMax Code', skillsDir: '.minimax/skills' },
  { id: 'oh-my-pi', name: 'Oh My Pi', skillsDir: '.omp/skills' },
  { id: 'opencode', name: 'OpenCode', skillsDir: '.opencode/skills' },
  { id: 'pi', name: 'Pi', skillsDir: '.pi/skills' },
  { id: 'qoder', name: 'Qoder', skillsDir: '.qoder/skills' },
  { id: 'qwen', name: 'Qwen Code', skillsDir: '.qwen/skills' },
  { id: 'roocode', name: 'Roo Code', skillsDir: '.roo/skills' },
  { id: 'rovodev', name: 'Rovo Dev CLI', skillsDir: '.rovodev/skills', skillRefStyle: 'natural' },
  { id: 'trae', name: 'Trae', skillsDir: '.trae/skills' },
  { id: 'veai', name: 'Veai', skillsDir: '.veai/skills' },
  { id: 'vibe', name: 'Mistral Vibe', skillsDir: '.vibe/skills' },
  { id: 'warp', name: 'Warp', skillsDir: '.warp/skills' },
  { id: 'zcode', name: 'ZCode', skillsDir: '.zcode/skills' },
  { id: 'antigravity', name: 'Antigravity', skillsDir: '.agent/skills' },
  { id: 'codex-legacy', name: 'Codex (.codex)', skillsDir: '.codex/skills' },
].map((t) => ({
  ...t,
  commandsDir: null,
  commandPattern: null,
  commandExt: null,
  invocation: null,
  skillRefStyle: t.skillRefStyle ?? 'default',
})));

export const ALL_TOOL_LAYOUTS = Object.freeze([...TOOL_LAYOUTS, ...EXTRA_TOOL_LAYOUTS]);
export const ALL_TOOL_IDS = Object.freeze(ALL_TOOL_LAYOUTS.map((t) => t.id));

export function getLayout(id) {
  const layout = ALL_TOOL_LAYOUTS.find((t) => t.id === id);
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
