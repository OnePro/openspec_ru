// Программное ядро патчера openspec-ru (design D4, D5, D6).
// Детектирует установленные OpenSpec-артефакты в проекте пользователя и
// идемпотентно заменяет skills и slash-команды топ-5 инструментов русскими
// версиями из собранного бандла dist-ru/.

import { accessSync, chmodSync, constants, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { delimiter, dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  SKILL_FILE,
  TOOL_IDS,
  TOOL_LAYOUTS,
  commandPath,
  skillPath,
} from '../lib/tool-layouts.mjs';
import { UI_COMMAND_ID, UI_SKILL_DIR } from '../web/ui-skill-template.mjs';

const APPLY_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(APPLY_DIR, '../..');
export const DEFAULT_BUNDLE_DIR = resolve(REPO_ROOT, 'dist-ru');
export const GITHUB_REPO_URL = 'https://github.com/OnePro/openspec_ru.git';

export const TOP5_TOOLS = TOOL_LAYOUTS;
export const OPENSPEC_MARKERS = Object.freeze({
  start: '<!-- OPENSPEC:START -->',
  end: '<!-- OPENSPEC:END -->',
});

const TOP5_SKILLS_DIRS = new Set(TOOL_LAYOUTS.map((t) => t.skillsDir));
const TOP5_COMMANDS_DIRS = new Set(
  TOOL_LAYOUTS.map((t) => t.commandsDir).filter(Boolean),
);

/**
 * Известные каталоги инструментов вне топ-5 (из src/core/config.ts и адаптеров апстрима).
 * Используются для человекочитаемых предупреждений при обнаружении неподдерживаемых артефактов.
 */
const KNOWN_UNSUPPORTED_DIRS = Object.freeze({
  '.amazonq': { id: 'amazon-q', name: 'Amazon Q Developer' },
  '.amp': { id: 'amp', name: 'Amp' },
  '.agent': { id: 'antigravity', name: 'Antigravity' },
  '.atomcode': { id: 'atomcode', name: 'AtomCode' },
  '.augment': { id: 'auggie', name: 'Auggie (Augment CLI)' },
  '.bob': { id: 'bob', name: 'IBM Bob' },
  '.cline': { id: 'cline', name: 'Cline' },
  '.clinerules': { id: 'cline', name: 'Cline' },
  '.commandcode': { id: 'command-code', name: 'Command Code' },
  '.codeartsdoer': { id: 'codeartsagent', name: 'CodeArts' },
  '.codex': { id: 'codex-legacy', name: 'Codex (legacy .codex)' },
  '.dsh': { id: 'dsh', name: 'DeepSeek Harness' },
  '.devin': { id: 'devin', name: 'Devin Desktop' },
  '.windsurf': { id: 'windsurf', name: 'Windsurf' },
  '.forge': { id: 'forgecode', name: 'ForgeCode' },
  '.codebuddy': { id: 'codebuddy', name: 'CodeBuddy Code' },
  '.codestudio': { id: 'codestudio', name: 'Code Studio' },
  '.continue': { id: 'continue', name: 'Continue' },
  '.cospec': { id: 'costrict', name: 'CoStrict' },
  '.crush': { id: 'crush', name: 'Crush' },
  '.easycode': { id: 'easycode', name: 'EasyCode' },
  '.factory': { id: 'factory', name: 'Factory Droid' },
  '.gigacode': { id: 'gigacode', name: 'GigaCode' },
  '.grok': { id: 'grok', name: 'Grok Build' },
  '.gsd': { id: 'gsd', name: 'GSD' },
  '.hermes': { id: 'hermes', name: 'Hermes Agent' },
  '.iflow': { id: 'iflow', name: 'iFlow' },
  '.junie': { id: 'junie', name: 'Junie' },
  '.kilocode': { id: 'kilocode', name: 'Kilo Code' },
  '.kilo': { id: 'kilocode', name: 'Kilo Code' },
  '.kimi-code': { id: 'kimi', name: 'Kimi Code' },
  '.kimi': { id: 'kimi', name: 'Kimi Code' },
  '.kiro': { id: 'kiro', name: 'Kiro' },
  '.lingma': { id: 'lingma', name: 'Lingma' },
  '.minimax': { id: 'minimax-code', name: 'MiniMax Code' },
  '.vibe': { id: 'vibe', name: 'Mistral Vibe' },
  '.omp': { id: 'oh-my-pi', name: 'Oh My Pi' },
  '.opencode': { id: 'opencode', name: 'OpenCode' },
  '.pi': { id: 'pi', name: 'Pi' },
  '.codeassistant': { id: 'codeassistant', name: 'SourceCraft Code Assistant' },
  '.qoder': { id: 'qoder', name: 'Qoder' },
  '.qwen': { id: 'qwen', name: 'Qwen Code' },
  '.rovodev': { id: 'rovodev', name: 'Rovo Dev CLI' },
  '.roo': { id: 'roocode', name: 'Roo Code' },
  '.trae': { id: 'trae', name: 'Trae' },
  '.veai': { id: 'veai', name: 'Veai' },
  '.warp': { id: 'warp', name: 'Warp' },
  '.zed': { id: 'zed', name: 'Zed Agent' },
  '.zcode': { id: 'zcode', name: 'ZCode' },
});

const IGNORED_DOT_DIRS = new Set(['.git', '.cache', '.vscode', '.idea']);

export function normalizeLf(text) {
  return text.replace(/\r\n/g, '\n');
}

function isFile(absPath) {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function isDir(absPath) {
  try {
    return statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

/** Читает метаданные бандла dist-ru/bundle-meta.json. */
export function readBundleMeta(bundleDir = DEFAULT_BUNDLE_DIR) {
  const metaPath = resolve(bundleDir, 'bundle-meta.json');
  if (!isFile(metaPath)) {
    throw new Error(`Не найден файл метаданных бандла: ${metaPath}`);
  }
  return JSON.parse(readFileSync(metaPath, 'utf8'));
}

function quoteWinArg(arg) {
  const s = String(arg);
  if (!/[\s"&|<>^()]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Ищет исполняемый файл `openspec` в PATH (кроссплатформенно: Windows/macOS/Linux).
 */
export function findOpenspecInPath(envPath = process.env.PATH, platform = process.platform) {
  const sep = platform === 'win32' ? ';' : delimiter;
  const dirs = (envPath || '').split(sep).filter(Boolean);
  const exts = platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const d of dirs) {
    for (const ext of exts) {
      const candidate = join(d, `openspec${ext}`);
      if (isFile(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Вызывает `openspec` без использования `shell: true` с массивом аргументов
 * (устраняет Node.js DEP0190 DeprecationWarning на Windows, macOS и Linux).
 */
export function spawnOpenspec(args = [], options = {}) {
  if (process.platform === 'win32') {
    const bin = findOpenspecInPath();
    if (!bin) {
      return { status: 127, stdout: '', stderr: 'openspec not found in PATH' };
    }
    if (/\.(cmd|bat)$/i.test(bin)) {
      const comspec = process.env.ComSpec || 'cmd.exe';
      const cmdLine = `"${[bin, ...args].map(quoteWinArg).join(' ')}"`;
      return spawnSync(comspec, ['/d', '/s', '/c', cmdLine], {
        ...options,
        shell: false,
        windowsVerbatimArguments: true,
      });
    }
    return spawnSync(bin, args, { ...options, shell: false });
  }
  return spawnSync('openspec', args, { ...options, shell: false });
}

/**
 * Определяет установленную версию openspec CLI (или возвращает null, если CLI недоступен).
 */
export function detectInstalledOpenspecVersion() {
  try {
    const res = spawnOpenspec(['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    if (res.status !== 0 || !res.stdout) return null;
    const match = res.stdout.trim().match(/v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Подтягивает свежий коммит `OnePro/openspec_ru` с GitHub прямо в `~/.openspec-ru/runtime/`,
 * чтобы команда `update` никогда не зависела от закэшированной папки `_npx`.
 */
export function pullLatestRuntimeFromGithub(options = {}) {
  const homeDir = options.homeDir ?? os.homedir();
  const repoUrl = options.repoUrl ?? GITHUB_REPO_URL;
  const runtimeDir = resolve(homeDir, '.openspec-ru', 'runtime');

  try {
    mkdirSync(dirname(runtimeDir), { recursive: true });
    if (isDir(resolve(runtimeDir, '.git'))) {
      const fetchRes = spawnSync('git', ['-C', runtimeDir, 'fetch', '--depth', '1', 'origin', 'main'], {
        encoding: 'utf8',
        timeout: 20000,
      });
      if (fetchRes.status === 0) {
        spawnSync('git', ['-C', runtimeDir, 'reset', '--hard', 'origin/main'], {
          encoding: 'utf8',
          timeout: 10000,
        });
        return { updated: true, runtimeDir, bundleDir: resolve(runtimeDir, 'dist-ru') };
      }
    }

    // Если в runtime ещё нет git-клона — клонируем с GitHub во временную папку и заменяем
    const tmpClone = resolve(homeDir, '.openspec-ru', `runtime-tmp-${Date.now()}`);
    const cloneRes = spawnSync('git', ['clone', '--depth', '1', repoUrl, tmpClone], {
      encoding: 'utf8',
      timeout: 30000,
    });
    if (cloneRes.status === 0 && isDir(resolve(tmpClone, 'dist-ru'))) {
      cpSync(tmpClone, runtimeDir, { recursive: true, force: true });
      spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'rm', process.platform === 'win32' ? ['/d', '/s', '/c', `rmdir /s /q "${tmpClone}"`] : ['-rf', tmpClone]);
      return { updated: true, runtimeDir, bundleDir: resolve(runtimeDir, 'dist-ru') };
    }
  } catch {
    // При отсутствии сети продолжаем с локальным бандлом
  }

  return { updated: false, runtimeDir, bundleDir: null };
}
 * в доступной на запись директории из PATH (на Windows, macOS и Linux), чтобы после
 * первого запуска через `npx` команда `openspec-ru start web` работала напрямую.
 */
export function installGlobalCliShim(options = {}) {
  const homeDir = options.homeDir ?? os.homedir();
  const platform = options.platform ?? process.platform;
  const envPath = options.envPath ?? process.env.PATH ?? '';
  const sourceRoot = options.sourceRoot ?? REPO_ROOT;

  const runtimeDir = resolve(homeDir, '.openspec-ru', 'runtime');
  try {
    mkdirSync(runtimeDir, { recursive: true });
    if (resolve(sourceRoot) !== runtimeDir) {
      for (const item of ['tools', 'dist-ru', 'package.json', 'upstream.json']) {
        const src = resolve(sourceRoot, item);
        if (existsSync(src)) {
          cpSync(src, resolve(runtimeDir, item), { recursive: true, force: true });
        }
      }
    }
  } catch {
    return { installed: false, binDir: null, runtimeDir };
  }

  const sep = platform === 'win32' ? ';' : ':';
  const pathDirs = envPath.split(sep).map((d) => d.trim()).filter(Boolean);
  const candidates = [];

  const openspecBin = findOpenspecInPath(envPath, platform);
  if (openspecBin) {
    candidates.push(dirname(openspecBin));
  }
  if (platform === 'win32' && process.env.APPDATA) {
    candidates.push(join(process.env.APPDATA, 'npm'));
  } else {
    candidates.push(join(homeDir, '.local', 'bin'));
  }
  for (const d of pathDirs) {
    if (d.startsWith(homeDir) && !candidates.includes(d)) {
      candidates.push(d);
    }
  }

  let targetBinDir = null;
  for (const dir of candidates) {
    try {
      if (!isDir(dir)) continue;
      accessSync(dir, constants.W_OK);
      targetBinDir = dir;
      break;
    } catch {
      // Переходим к следующему кандидату
    }
  }

  if (!targetBinDir) {
    return { installed: false, binDir: null, runtimeDir };
  }

  const cliEntryPosix = '$HOME/.openspec-ru/runtime/tools/apply/cli.mjs';
  const shContent = `#!/usr/bin/env sh\nexec node "${cliEntryPosix}" "$@"\n`;

  try {
    const shPath = join(targetBinDir, 'openspec-ru');
    writeFileSync(shPath, shContent, 'utf8');
    try {
      chmodSync(shPath, 0o755);
    } catch {
      // На Windows chmod может игнорироваться
    }

    if (platform === 'win32') {
      const cmdContent = `@echo off\r\nnode "%USERPROFILE%\\.openspec-ru\\runtime\\tools\\apply\\cli.mjs" %*\r\n`;
      const ps1Content = `#!/usr/bin/env pwsh\r\n& node "$HOME/.openspec-ru/runtime/tools/apply/cli.mjs" @args\r\nexit $LASTEXITCODE\r\n`;
      writeFileSync(join(targetBinDir, 'openspec-ru.cmd'), cmdContent, 'utf8');
      writeFileSync(join(targetBinDir, 'openspec-ru.ps1'), ps1Content, 'utf8');
    }
    return { installed: true, binDir: targetBinDir, runtimeDir };
  } catch {
    return { installed: false, binDir: null, runtimeDir };
  }
}

/**
 * Обновляет содержимое между маркерами <!-- OPENSPEC:START --> и <!-- OPENSPEC:END -->,
 * сохраняя сами маркеры и весь текст вне их байт-в-байт.
 */
export function replaceBetweenMarkers(fileContent, ruTemplateContent) {
  const { start, end } = OPENSPEC_MARKERS;
  const startIdx = fileContent.indexOf(start);
  if (startIdx === -1) return null;
  const endIdx = fileContent.indexOf(end, startIdx + start.length);
  if (endIdx === -1) return null;

  let ruInner;
  const tplStart = ruTemplateContent.indexOf(start);
  const tplEnd = tplStart !== -1 ? ruTemplateContent.indexOf(end, tplStart + start.length) : -1;
  if (tplStart !== -1 && tplEnd !== -1) {
    ruInner = ruTemplateContent.slice(tplStart + start.length, tplEnd);
  } else {
    ruInner = `\n${normalizeLf(ruTemplateContent).trim()}\n`;
  }

  return (
    fileContent.slice(0, startIdx + start.length) +
    ruInner +
    fileContent.slice(endIdx)
  );
}

/**
 * Сканирует проект на наличие OpenSpec-артефактов инструментов вне топ-5.
 * Ничего не изменяет; возвращает список неподдерживаемых инструментов и их файлов.
 */
export function detectUnsupportedTools(projectDir) {
  if (!isDir(projectDir)) return [];
  const byId = new Map();

  function addArtifact(dirName, relFile, overrideInfo = null) {
    const info = overrideInfo ?? KNOWN_UNSUPPORTED_DIRS[dirName] ?? {
      id: dirName.replace(/^\./, ''),
      name: dirName,
    };
    let entry = byId.get(info.id);
    if (!entry) {
      entry = { id: info.id, name: info.name, dirs: new Set(), files: [] };
      byId.set(info.id, entry);
    }
    entry.dirs.add(dirName);
    if (!entry.files.includes(relFile)) {
      entry.files.push(relFile);
    }
  }

  const rootEntries = readdirSync(projectDir).sort();
  for (const dirName of rootEntries) {
    if (!dirName.startsWith('.') || IGNORED_DOT_DIRS.has(dirName)) continue;
    const dirAbs = resolve(projectDir, dirName);
    if (!isDir(dirAbs)) continue;

    // 1. Проверяем <dirName>/skills/openspec-*/SKILL.md, если это не skillsDir топ-5
    const relSkillsDir = posix.join(dirName, 'skills');
    if (!TOP5_SKILLS_DIRS.has(relSkillsDir)) {
      const skillsAbs = resolve(dirAbs, 'skills');
      if (isDir(skillsAbs)) {
        for (const skillEntry of readdirSync(skillsAbs).sort()) {
          if (!skillEntry.startsWith('openspec-')) continue;
          const skillFileAbs = resolve(skillsAbs, skillEntry, SKILL_FILE);
          if (isFile(skillFileAbs)) {
            addArtifact(dirName, posix.join(relSkillsDir, skillEntry, SKILL_FILE));
          }
        }
      }
    }

    // 2. Проверяем подкаталоги команд/воркфлоу/промптов
    const subDirs = ['commands', 'command', 'prompts', 'workflows', 'openspec/commands'];
    for (const sub of subDirs) {
      const relSub = posix.join(dirName, sub);
      if (TOP5_COMMANDS_DIRS.has(relSub)) continue;
      const subAbs = resolve(projectDir, relSub);
      if (!isDir(subAbs)) continue;

      const relOpsxSub = posix.join(relSub, 'opsx');
      if (!TOP5_COMMANDS_DIRS.has(relOpsxSub)) {
        const opsxAbs = resolve(subAbs, 'opsx');
        if (isDir(opsxAbs)) {
          for (const f of readdirSync(opsxAbs).sort()) {
            if (!/\.(md|toml|prompt)$/i.test(f)) continue;
            const fileAbs = resolve(opsxAbs, f);
            if (isFile(fileAbs)) {
              addArtifact(dirName, posix.join(relOpsxSub, f));
            }
          }
        }
      }

      for (const f of readdirSync(subAbs).sort()) {
        if (!f.startsWith('opsx-')) continue;
        const fileAbs = resolve(subAbs, f);
        if (isFile(fileAbs)) {
          const override =
            dirName === '.agents' && sub === 'workflows'
              ? { id: 'antigravity', name: 'Antigravity' }
              : null;
          addArtifact(dirName, posix.join(relSub, f), override);
        }
      }
    }
  }

  return [...byId.values()].map((e) => ({
    id: e.id,
    name: e.name,
    dirs: [...e.dirs],
    files: e.files.sort(),
  }));
}

/**
 * Применяет русскоязычные артефакты OpenSpec к проекту пользователя.
 *
 * @param {string} projectDir Целевой каталог проекта
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false] Не записывать изменения на диск
 * @param {string} [options.bundleDir] Путь к бандлу dist-ru/
 * @param {string|null} [options.openspecVersion] Явная версия установленного openspec CLI (для тестов)
 */
export function applyRuPatch(projectDir, options = {}) {
  const targetDir = resolve(projectDir ?? process.cwd());
  const dryRun = Boolean(options.dryRun);
  const bundleDir = resolve(options.bundleDir ?? DEFAULT_BUNDLE_DIR);
  const meta = readBundleMeta(bundleDir);

  const bundleTag = meta.upstream?.tag ?? `v${meta.openspecVersion}`;
  const expectedVersion = meta.openspecVersion ?? bundleTag.replace(/^v/, '');

  const installedVersion =
    options.openspecVersion !== undefined
      ? options.openspecVersion
      : detectInstalledOpenspecVersion();

  const warnings = [];
  const messages = [];
  let versionMismatch = null;

  if (installedVersion && installedVersion.replace(/^v/, '') !== expectedVersion) {
    const cleanInstalled = installedVersion.replace(/^v/, '');
    versionMismatch = {
      installed: cleanInstalled,
      bundle: expectedVersion,
      bundleTag,
    };
    warnings.push(
      `Предупреждение: версия установленного OpenSpec CLI (v${cleanInstalled}) отличается от версии бандла (${bundleTag}).`,
    );
  }

  if (!isDir(targetDir)) {
    const msg = `Каталог проекта не найден: ${targetDir}. Сначала создайте проект и выполните «openspec init».`;
    messages.push(msg);
    return {
      ok: false,
      exitCode: 1,
      projectDir: targetDir,
      dryRun,
      bundleVersion: bundleTag,
      openspecVersion: expectedVersion,
      installedOpenspecVersion: installedVersion,
      versionMismatch,
      detectedTools: [],
      markers: { updated: [], unchanged: [] },
      unsupportedTools: [],
      totalUpdated: 0,
      totalUnchanged: 0,
      allUpToDate: false,
      warnings,
      messages,
      report: [
        `openspec-ru: бандл ${bundleTag} (OpenSpec ${expectedVersion})`,
        ...warnings,
        msg,
      ].join('\n'),
    };
  }

  if (!existsSync(resolve(targetDir, '.git'))) {
    const msg =
      'В каталоге не инициализирован Git (.git не найден). Инициализация и применение OpenSpec заблокированы — запускайте команду только в корне Git-репозитория («git init»).';
    messages.push(msg);
    return {
      ok: false,
      exitCode: 1,
      projectDir: targetDir,
      dryRun,
      bundleVersion: bundleTag,
      openspecVersion: expectedVersion,
      installedOpenspecVersion: installedVersion,
      versionMismatch,
      detectedTools: [],
      markers: { updated: [], unchanged: [] },
      unsupportedTools: [],
      totalUpdated: 0,
      totalUnchanged: 0,
      allUpToDate: false,
      warnings,
      messages,
      report: [
        `openspec-ru: бандл ${bundleTag} (OpenSpec ${expectedVersion})`,
        ...warnings,
        msg,
      ].join('\n'),
    };
  }

  const detectedTools = [];

  for (const layout of TOOL_LAYOUTS) {
    const updated = [];
    const unchanged = [];
    let skillsUpdated = 0;
    let skillsUnchanged = 0;
    let commandsUpdated = 0;
    let commandsUnchanged = 0;

    // 1. Skills: проверяем только существующие <skillsDir>/openspec-*/SKILL.md
    const projectSkillsAbs = resolve(targetDir, layout.skillsDir);
    if (isDir(projectSkillsAbs)) {
      const skillEntries = readdirSync(projectSkillsAbs).sort();
      for (const dirName of skillEntries) {
        if (!dirName.startsWith('openspec-')) continue;
        const relPath = skillPath(layout.id, dirName);
        const targetFile = resolve(targetDir, relPath);
        if (!isFile(targetFile)) continue;

        const ruToolSkill = resolve(bundleDir, 'tool-skills', layout.id, relPath);
        const ruFallbackSkill = resolve(bundleDir, 'skills', dirName, SKILL_FILE);
        const ruFile = isFile(ruToolSkill)
          ? ruToolSkill
          : isFile(ruFallbackSkill)
            ? ruFallbackSkill
            : null;
        if (!ruFile) continue;

        const currentContent = readFileSync(targetFile, 'utf8');
        const ruContent = readFileSync(ruFile, 'utf8');
        if (normalizeLf(currentContent) === normalizeLf(ruContent)) {
          unchanged.push(relPath);
          skillsUnchanged++;
        } else {
          if (!dryRun) {
            writeFileSync(targetFile, normalizeLf(ruContent), 'utf8');
          }
          updated.push(relPath);
          skillsUpdated++;
        }
      }
    }

    // 2. Commands: проверяем только существующие файлы команд opsx
    if (layout.commandPattern) {
      const knownCommandIds = new Set(meta.commands ?? []);
      const bundleCmdDir = resolve(bundleDir, 'commands', layout.id, layout.commandsDir);
      if (isDir(bundleCmdDir)) {
        for (const f of readdirSync(bundleCmdDir)) {
          if (layout.commandExt && f.endsWith(layout.commandExt)) {
            const base = f.slice(0, -layout.commandExt.length);
            const id = base.startsWith('opsx-') ? base.slice('opsx-'.length) : base;
            if (id) knownCommandIds.add(id);
          }
        }
      }

      for (const cmdId of [...knownCommandIds].sort()) {
        const relPath = commandPath(layout.id, cmdId);
        if (!relPath) continue;
        const targetFile = resolve(targetDir, relPath);
        if (!isFile(targetFile)) continue;

        const ruFile = resolve(bundleDir, 'commands', layout.id, relPath);
        if (!isFile(ruFile)) continue;

        const currentContent = readFileSync(targetFile, 'utf8');
        const ruContent = readFileSync(ruFile, 'utf8');
        if (normalizeLf(currentContent) === normalizeLf(ruContent)) {
          unchanged.push(relPath);
          commandsUnchanged++;
        } else {
          if (!dryRun) {
            writeFileSync(targetFile, normalizeLf(ruContent), 'utf8');
          }
          updated.push(relPath);
          commandsUpdated++;
        }
      }
    }

    if (updated.length > 0 || unchanged.length > 0) {
      detectedTools.push({
        id: layout.id,
        name: layout.name,
        updated,
        unchanged,
        skillsUpdated,
        skillsUnchanged,
        commandsUpdated,
        commandsUnchanged,
      });
    }
  }

  // 3. Маркерные блоки в AGENTS.md / CLAUDE.md / openspec/AGENTS.md (если в бандле есть шаблон)
  const markers = { updated: [], unchanged: [] };
  const markerCandidates = ['AGENTS.md', 'CLAUDE.md', 'openspec/AGENTS.md'];
  for (const relCandidate of markerCandidates) {
    const targetFile = resolve(targetDir, relCandidate);
    if (!isFile(targetFile)) continue;
    const currentContent = readFileSync(targetFile, 'utf8');
    if (
      !currentContent.includes(OPENSPEC_MARKERS.start) ||
      !currentContent.includes(OPENSPEC_MARKERS.end)
    ) {
      continue;
    }
    const ruCandidate = resolve(bundleDir, relCandidate);
    const ruMarkerFallback = resolve(bundleDir, 'markers', relCandidate);
    const ruFile = isFile(ruCandidate)
      ? ruCandidate
      : isFile(ruMarkerFallback)
        ? ruMarkerFallback
        : null;
    if (!ruFile) continue;

    const ruTemplate = readFileSync(ruFile, 'utf8');
    const patched = replaceBetweenMarkers(currentContent, ruTemplate);
    if (patched === null) continue;

    if (normalizeLf(currentContent) === normalizeLf(patched)) {
      markers.unchanged.push(relCandidate);
    } else {
      if (!dryRun) {
        writeFileSync(targetFile, normalizeLf(patched), 'utf8');
      }
      markers.updated.push(relCandidate);
    }
  }

  // 4. Неподдерживаемые инструменты (вне топ-5)
  const unsupportedTools = detectUnsupportedTools(targetDir);
  for (const u of unsupportedTools) {
    warnings.push(
      `Предупреждение: инструмент «${u.name}» (${u.dirs.join(', ')}) не поддерживается (поддерживаются топ-5: ${TOOL_IDS.join(', ')}). Его файлы (${u.files.length}) не изменены.`,
    );
  }

  const totalUpdated =
    detectedTools.reduce((acc, t) => acc + t.updated.length, 0) + markers.updated.length;
  const totalUnchanged =
    detectedTools.reduce((acc, t) => acc + t.unchanged.length, 0) + markers.unchanged.length;
  const hasSupportedArtifacts = detectedTools.length > 0 || markers.updated.length + markers.unchanged.length > 0;

  // 5. Русские схемы (openspec/schemas/spec-driven) и языковой контекст в openspec/config.yaml
  const schemas = { updated: [], unchanged: [] };
  let configUpdated = false;
  let configUnchanged = false;
  const configRel = 'openspec/config.yaml';
  const configAbs = resolve(targetDir, configRel);
  const bundleSchemasDir = resolve(bundleDir, 'schemas');

  if (hasSupportedArtifacts && isFile(configAbs) && isDir(bundleSchemasDir)) {
    function syncSchemaDir(relDir) {
      const srcDir = resolve(bundleSchemasDir, relDir);
      for (const entry of readdirSync(srcDir).sort()) {
        const relSub = relDir ? posix.join(relDir, entry) : entry;
        const srcAbs = resolve(bundleSchemasDir, relSub);
        if (isDir(srcAbs)) {
          syncSchemaDir(relSub);
        } else if (isFile(srcAbs)) {
          const destRel = posix.join('openspec/schemas', relSub);
          const destAbs = resolve(targetDir, destRel);
          const ruContent = readFileSync(srcAbs, 'utf8');
          if (isFile(destAbs) && normalizeLf(readFileSync(destAbs, 'utf8')) === normalizeLf(ruContent)) {
            schemas.unchanged.push(destRel);
          } else {
            if (!dryRun) {
              mkdirSync(dirname(destAbs), { recursive: true });
              writeFileSync(destAbs, normalizeLf(ruContent), 'utf8');
            }
            schemas.updated.push(destRel);
          }
        }
      }
    }
    syncSchemaDir('');

    const cfgContent = normalizeLf(readFileSync(configAbs, 'utf8'));
    const langSnippet = 'context: |\n  Language: Russian\n  All artifacts must be written in Russian.\n';
    if (/^context\s*:/m.test(cfgContent)) {
      configUnchanged = true;
    } else {
      const updatedCfg = cfgContent.replace(/^(schema:\s*[^\n]+\n)/m, `$1\n${langSnippet}`);
      const finalCfg = updatedCfg !== cfgContent ? updatedCfg : `${langSnippet}\n${cfgContent}`;
      if (!dryRun) {
        writeFileSync(configAbs, finalCfg, 'utf8');
      }
      configUpdated = true;
    }
  }

  // 5b. Скилл openspec-ui и команда ui веб-панели: только в инициализированном проекте (есть openspec/config.yaml)
  //      для инструментов из detectedTools, где есть каталог skills или команд. В totalUpdated не входят.
  const bonus = { updated: [], unchanged: [] };
  if (isFile(configAbs)) {
    const syncBonusFile = (relPath, srcAbs) => {
      if (!isFile(srcAbs)) return;
      const targetAbs = resolve(targetDir, relPath);
      const ruContent = normalizeLf(readFileSync(srcAbs, 'utf8'));
      if (isFile(targetAbs) && normalizeLf(readFileSync(targetAbs, 'utf8')) === ruContent) {
        bonus.unchanged.push(relPath);
        return;
      }
      if (!dryRun) {
        mkdirSync(dirname(targetAbs), { recursive: true });
        writeFileSync(targetAbs, ruContent, 'utf8');
      }
      bonus.updated.push(relPath);
    };

    for (const detected of detectedTools) {
      const layout = TOOL_LAYOUTS.find((t) => t.id === detected.id);
      const uiSkillRel = skillPath(layout.id, UI_SKILL_DIR);
      if (isDir(resolve(targetDir, layout.skillsDir))) {
        syncBonusFile(uiSkillRel, resolve(bundleDir, 'tool-skills', layout.id, uiSkillRel));
      }
      if (layout.commandPattern && isDir(resolve(targetDir, layout.commandsDir))) {
        const uiCmdRel = commandPath(layout.id, UI_COMMAND_ID);
        syncBonusFile(uiCmdRel, resolve(bundleDir, 'commands', layout.id, uiCmdRel));
      }
    }
  }

  if (!hasSupportedArtifacts && unsupportedTools.length === 0) {
    const noArtifactsMsg =
      'В проекте не обнаружено установленных артефактов OpenSpec. Сначала выполните «openspec init» в каталоге проекта.';
    messages.push(noArtifactsMsg);
    const reportLines = [
      `openspec-ru: бандл ${bundleTag} (OpenSpec ${expectedVersion})${dryRun ? ' [dry-run]' : ''}`,
      ...warnings,
      noArtifactsMsg,
    ];
    return {
      ok: false,
      exitCode: 1,
      projectDir: targetDir,
      dryRun,
      bundleVersion: bundleTag,
      openspecVersion: expectedVersion,
      installedOpenspecVersion: installedVersion,
      versionMismatch,
      detectedTools,
      markers,
      schemas,
      configUpdated,
      unsupportedTools,
      totalUpdated: 0,
      totalUnchanged: 0,
      allUpToDate: false,
      warnings,
      messages,
      report: reportLines.join('\n'),
    };
  }

  const allUpToDate =
    hasSupportedArtifacts &&
    totalUpdated === 0 &&
    schemas.updated.length === 0 &&
    bonus.updated.length === 0 &&
    !configUpdated;
  const reportLines = [
    `openspec-ru: бандл ${bundleTag} (OpenSpec ${expectedVersion})${dryRun ? ' [режим --dry-run, без записи на диск]' : ''}`,
    ...warnings,
  ];

  if (detectedTools.length > 0) {
    reportLines.push('Обнаруженные инструменты:');
    for (const tool of detectedTools) {
      const actionLabel = dryRun ? 'будет обновлено' : 'обновлено';
      reportLines.push(
        `  - ${tool.name} (${tool.id}): ${actionLabel} ${tool.updated.length} (skills: ${tool.skillsUpdated}, команды: ${tool.commandsUpdated}), уже актуально ${tool.unchanged.length}`,
      );
    }
  }

  if (schemas.updated.length > 0 || schemas.unchanged.length > 0) {
    const actionLabel = dryRun ? 'будет обновлено' : 'обновлено';
    const cfgStatus = configUpdated
      ? `, config.yaml: ${actionLabel}`
      : configUnchanged
        ? ', config.yaml: уже настроен'
        : '';
    reportLines.push(
      `  - Схемы OpenSpec (openspec/schemas): ${actionLabel} ${schemas.updated.length}, уже актуально ${schemas.unchanged.length}${cfgStatus}`,
    );
  }

  if (markers.updated.length > 0 || markers.unchanged.length > 0) {
    const actionLabel = dryRun ? 'будет обновлено' : 'обновлено';
    reportLines.push(
      `  - Маркерные блоки (AGENTS.md/CLAUDE.md): ${actionLabel} ${markers.updated.length}, уже актуально ${markers.unchanged.length}`,
    );
  }

  if (bonus.updated.length > 0 || bonus.unchanged.length > 0) {
    const actionLabel = dryRun ? 'будет обновлено' : 'обновлено';
    reportLines.push(
      `  - Скилл и команда веб-панели (openspec-ui, ui): ${actionLabel} ${bonus.updated.length}, уже актуально ${bonus.unchanged.length}`,
    );
  }

  if (allUpToDate) {
    const msg = `Все артефакты OpenSpec уже актуальны (проверено файлов: ${totalUnchanged}).`;
    messages.push(msg);
    reportLines.push(msg);
  } else if (hasSupportedArtifacts) {
    const msg = dryRun
      ? `Итого (dry-run): было бы обновлено файлов: ${totalUpdated}, уже актуально: ${totalUnchanged}. Файлы на диске не изменены.`
      : `Итого: обновлено файлов: ${totalUpdated}, уже актуально: ${totalUnchanged}.`;
    messages.push(msg);
    reportLines.push(msg);
  }

  return {
    ok: true,
    exitCode: 0,
    projectDir: targetDir,
    dryRun,
    bundleVersion: bundleTag,
    openspecVersion: expectedVersion,
    installedOpenspecVersion: installedVersion,
    versionMismatch,
    detectedTools,
    markers,
    bonus,
    unsupportedTools,
    totalUpdated,
    totalUnchanged,
    allUpToDate,
    warnings,
    messages,
    report: reportLines.join('\n'),
  };
}
