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

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readManifest } from './lib/manifest.mjs';
import { readUpstream } from './lib/github.mjs';

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

function main() {
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
  }
  console.log('\nbuild-ru: сборочный гейт пройден.');
}

main();
