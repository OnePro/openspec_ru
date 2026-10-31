#!/usr/bin/env node
// Сборочный гейт слоя templates (design D5): кэшированный клон апстрима на
// pinned-commit, overlay ru/** поверх исходников, install + build + generate:skills.
// Падение сборки = отказ валидации слоя templates с выводом компилятора.
// Побочный продукт: RU-артефакты (skills) в dist-ru/ для overlay-патчера (change 3).
//
// Использование: node tools/build-ru.mjs [--skip-generate]
//
// Env:
//   RU_UPSTREAM_CACHE  каталог кэша клона (default .cache/upstream)
//   RU_UPSTREAM_SEED   локальный репозиторий-донор для быстрого первого клона
//                      (default /tmp/openspec-upstream, если существует)
//   RU_PM              принудительный менеджер пакетов: pnpm | corepack | npm

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT, readManifest } from './lib/manifest.mjs';
import { readUpstream } from './lib/github.mjs';
import { TOOL_LAYOUTS, commandPath, skillPath } from './lib/tool-layouts.mjs';
import { UI_COMMAND_ID, UI_SKILL_DIR, writeUiArtifacts } from './web/ui-skill-template.mjs';

const CACHE = resolve(ROOT, process.env.RU_UPSTREAM_CACHE ?? '.cache/upstream');
const DIST_RU = resolve(ROOT, 'dist-ru');
const UPSTREAM_URL = 'https://github.com/Fission-AI/OpenSpec.git';

function git(args, { allowFail = false } = {}) {
  const res = spawnSync('git', args, { cwd: CACHE, encoding: 'utf8' });
  if (res.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')}: код ${res.status}\n${res.stderr ?? ''}`);
  }
  return res;
}

function run(cmd, args, label) {
  console.log(`\n=== ${label}: ${cmd} ${args.join(' ')} ===`);
  const res = spawnSync(cmd, args, {
    cwd: CACHE,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (res.error) throw res.error;
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status !== 0) {
    console.error(`\nbuild-ru: шаг «${label}» завершился с кодом ${res.status} (вывод компилятора выше).`);
    process.exit(1);
  }
}

function which(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [cmd], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return res.status === 0;
}

/** Менеджер пакетов: pnpm → corepack pnpm → npm (фолбэк фиксируется в выводе). */
function detectPm() {
  const pm = process.env.RU_PM;
  if (pm === 'pnpm' || (!pm && which('pnpm'))) {
    return { cmd: 'pnpm', install: ['install'], run: (s) => ['run', s] };
  }
  if (pm === 'corepack' || (!pm && which('corepack'))) {
    console.log('build-ru: pnpm недоступен, используется «corepack pnpm» (зафиксировать в отчёте).');
    return { cmd: 'corepack', install: ['pnpm', 'install'], run: (s) => ['pnpm', 'run', s] };
  }
  if (pm === 'npm' || !pm) {
    console.log('build-ru: pnpm и corepack недоступны, используется npm (зафиксировать в отчёте).');
    return { cmd: 'npm', install: ['install'], run: (s) => ['run', s] };
  }
  throw new Error(`RU_PM: допустимы pnpm | corepack | npm, получено ${pm}`);
}

function ensureClone(upstream) {
  if (!existsSync(resolve(CACHE, '.git'))) {
    mkdirSync(dirname(CACHE), { recursive: true });
    const seed = process.env.RU_UPSTREAM_SEED
      ?? (existsSync('/tmp/openspec-upstream/.git') ? '/tmp/openspec-upstream' : null);
    const from = seed ?? UPSTREAM_URL;
    console.log(`build-ru: клонирую апстрим в ${CACHE} (источник: ${from})`);
    const res = spawnSync('git', ['clone', '--quiet', from, CACHE], { encoding: 'utf8' });
    if (res.status !== 0) throw new Error(`git clone: ${res.stderr}`);
    git(['remote', 'set-url', 'origin', UPSTREAM_URL]);
  }
  // Тег мог появиться после первого клона; офлайн-повтор допустим, если commit уже есть.
  const have = git(['cat-file', '-t', upstream.commit], { allowFail: true }).status === 0;
  if (!have) {
    console.log(`build-ru: fetch тега ${upstream.tag}`);
    git(['fetch', '--quiet', 'origin', 'tag', upstream.tag]);
  }
  git(['checkout', '--quiet', '--force', '--detach', upstream.commit]);
  // Чистим overlay предыдущего прогона, кроме node_modules (инкрементальный install).
  git(['clean', '-fdxq', '-e', 'node_modules']);
}

function overlay() {
  const manifest = readManifest();
  let count = 0;
  for (const entry of manifest.entries) {
    const ruAbs = resolve(ROOT, entry.ru);
    if (!existsSync(ruAbs)) continue;
    const dest = resolve(CACHE, entry.en);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(ruAbs, dest);
    count++;
    console.log(`overlay: ${entry.ru} -> ${entry.en}`);
  }
  console.log(`build-ru: наложено RU-файлов: ${count}`);
  if (count === 0) {
    console.log('build-ru: переводов нет, сборка проверяет чистый апстрим.');
  }
}

function collectArtifacts() {
  const skillsDir = resolve(CACHE, 'skills');
  if (!existsSync(skillsDir)) {
    console.error('build-ru: каталог skills/ не найден после generate:skills.');
    process.exit(1);
  }
  rmSync(DIST_RU, { recursive: true, force: true });
  mkdirSync(DIST_RU, { recursive: true });
  cpSync(skillsDir, resolve(DIST_RU, 'skills'), { recursive: true });
  console.log(`build-ru: RU-артефакты собраны в ${DIST_RU}/skills`);
}

const CYRILLIC = /[А-Яа-яЁё]/;

async function loadDist(rel) {
  return import(pathToFileURL(resolve(CACHE, 'dist', rel)).href);
}

/**
 * Пререндер skills и slash-команд топ-5 инструментов генераторами самого апстрима
 * (D3): адаптеры command-generation + getTransformerForTool, как в `openspec init`
 * (delivery=both, все workflow). Результат ключуется путём от корня проекта:
 *   dist-ru/commands/<tool>/<путь команды>      (у codex команд нет)
 *   dist-ru/tool-skills/<tool>/<skillsDir>/<skill>/SKILL.md
 * Корневых шаблонов AGENTS.md/CLAUDE.md (маркеры OPENSPEC:START) в v1.15.0 нет.
 */
async function renderTools(upstream) {
  const gen = await loadDist('core/command-generation/index.js');
  const shared = await loadDist('core/shared/skill-generation.js');
  const refs = await loadDist('utils/command-references.js');
  const surface = await loadDist('core/command-surface.js');
  const version = JSON.parse(readFileSync(resolve(CACHE, 'package.json'), 'utf8')).version;

  const skills = shared.getSkillTemplates();
  const contents = shared.getCommandContents();
  const problems = [];
  let commandCount = 0;
  let skillCount = 0;

  for (const layout of TOOL_LAYOUTS) {
    const capability = surface.resolveCommandSurfaceCapability(layout.id);
    const adapter = gen.CommandAdapterRegistry.get(layout.id);
    const transformer = refs.getTransformerForTool(
      layout.id, 'both', capability, surface.resolveCommandInvocation(layout.id),
    );

    for (const { template, dirName } of skills) {
      const text = shared.generateSkillContent(template, version, transformer);
      if (!CYRILLIC.test(text)) problems.push(`skill ${layout.id}/${dirName}: нет русского текста`);
      const dest = resolve(DIST_RU, 'tool-skills', layout.id, skillPath(layout.id, dirName));
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, text);
      skillCount++;
    }

    if (!adapter) {
      if (layout.commandPattern) problems.push(`${layout.id}: адаптер команд не найден`);
      continue;
    }
    if (!layout.commandPattern) {
      problems.push(`${layout.id}: у апстрима есть адаптер, а в tool-layouts нет раскладки команд`);
      continue;
    }
    for (const content of contents) {
      const cmd = gen.generateCommand(content, adapter);
      const rel = cmd.path.replaceAll('\\', '/');
      if (rel !== commandPath(layout.id, content.id)) {
        problems.push(`${layout.id}/${content.id}: путь апстрима ${rel} расходится с tool-layouts`);
      }
      if (!CYRILLIC.test(cmd.fileContent)) problems.push(`${rel}: нет русского текста`);
      if (!/opsx[:-]/.test(cmd.fileContent)) problems.push(`${rel}: нет имени команды opsx`);
      const dest = resolve(DIST_RU, 'commands', layout.id, rel);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, cmd.fileContent);
      commandCount++;
    }
  }
  if (problems.length) {
    console.error(`build-ru: пререндер не прошёл проверку:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }

  const schemasSrc = resolve(CACHE, 'schemas');
  if (existsSync(schemasSrc)) cpSync(schemasSrc, resolve(DIST_RU, 'schemas'), { recursive: true });

  // Скилл и команда веб-панели (openspec-ui, ui) — собственные, не из апстрима
  const uiFiles = writeUiArtifacts(DIST_RU);

  const rootPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const meta = {
    bundleVersion: 'v' + rootPkg.version,
    upstream: { repo: upstream.repo, tag: upstream.tag, commit: upstream.commit },
    openspecVersion: version,
    tools: TOOL_LAYOUTS.map((t) => ({ ...t })),
    skills: [...skills.map((s) => s.dirName), UI_SKILL_DIR],
    commands: [...contents.map((c) => c.id), UI_COMMAND_ID],
  };
  writeFileSync(resolve(DIST_RU, 'bundle-meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`build-ru: пререндер: ${skillCount} tool-skills, ${commandCount} команд, ${uiFiles.length} UI-файлов, schemas, bundle-meta.json`);
}

async function main() {

  const skipGenerate = process.argv.includes('--skip-generate');
  const upstream = readUpstream();
  console.log(`build-ru: апстрим ${upstream.repo} @ ${upstream.tag} (${upstream.commit.slice(0, 12)})`);

  ensureClone(upstream);
  overlay();

  const pm = detectPm();
  run(pm.cmd, pm.install, 'install');
  run(pm.cmd, pm.run('build'), 'build');
  if (!skipGenerate) {
    run(pm.cmd, pm.run('generate:skills'), 'generate:skills');
    collectArtifacts();
    await renderTools(upstream);
  }
  console.log('\nbuild-ru: сборочный гейт пройден.');
}

await main();
