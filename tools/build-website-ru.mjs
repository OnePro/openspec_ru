#!/usr/bin/env node
// Сборка русского статического сайта (change ru-website, design D1–D4):
// клон апстрима на pinned-commit → копия website/ → overlay ru/website-strings/**
// (пары манифеста зоны website) → website-ru-patches/** → ru/docs-lab/** в docs-lab/
// → pnpm install && pnpm build → out/ → dist-website/.
//
// Использование: node tools/build-website-ru.mjs [--skip-build]
//   --skip-build  собрать только дерево .cache/website-ru/site (без install/build)
//
// Env:
//   RU_UPSTREAM_CACHE  каталог кэша клона (default .cache/upstream, общий с build-ru)
//   RU_UPSTREAM_SEED   локальный репозиторий-донор для быстрого первого клона
//   RU_WEBSITE_WORK    рабочий каталог (default .cache/website-ru)

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT, readManifest } from './lib/manifest.mjs';
import { readUpstream } from './lib/github.mjs';

const UPSTREAM_URL = 'https://github.com/Fission-AI/OpenSpec.git';
const SITE_PREFIX = 'website/';

/**
 * Собирает рабочее дерево сайта (без сети и без сборки).
 * Порядок: копия website/ апстрима → строки → патчи; docs-lab/ рядом с site/
 * (docs.sync.config.mjs читает его как '../docs-lab').
 * node_modules в site/ сохраняется для инкрементального install.
 */
export function buildTree({ upstreamRoot, workDir, manifest, root = ROOT, log = () => {} }) {
  const siteDir = join(workDir, 'site');
  const labDir = join(workDir, 'docs-lab');

  mkdirSync(siteDir, { recursive: true });
  for (const name of readdirSync(siteDir)) {
    if (name !== 'node_modules') rmSync(join(siteDir, name), { recursive: true, force: true });
  }
  rmSync(labDir, { recursive: true, force: true });

  cpSync(join(upstreamRoot, 'website'), siteDir, {
    recursive: true,
    filter: (src) => !src.split(/[\\/]/).includes('node_modules'),
  });
  // Апстримовый манифест публикации сохраняем под отдельным именем:
  // RU-конфиг (патч) импортирует его и добавляет свою секцию, поэтому
  // новые апстрим-страницы не исчезают молча — им не хватит RU-source и сборка упадёт.
  cpSync(
    join(upstreamRoot, 'website/docs.sync.config.mjs'),
    join(siteDir, 'docs.sync.upstream.mjs'),
  );

  const overlaid = [];
  for (const entry of manifest.entries) {
    if (entry.area !== 'website' || !entry.en.startsWith(SITE_PREFIX)) continue;
    const ruAbs = resolve(root, entry.ru);
    if (!existsSync(ruAbs)) continue;
    const dest = join(siteDir, entry.en.slice(SITE_PREFIX.length));
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(ruAbs, dest);
    overlaid.push(entry.en);
    log(`строки: ${entry.ru} -> ${entry.en}`);
  }

  const patchesDir = resolve(root, 'website-ru-patches');
  if (existsSync(patchesDir)) {
    cpSync(patchesDir, siteDir, { recursive: true });
    log(`патчи: ${patchesDir} -> site/`);
  }

  const labSrc = resolve(root, 'ru/docs-lab');
  if (existsSync(labSrc)) {
    cpSync(labSrc, labDir, { recursive: true });
    log('docs-lab: ru/docs-lab -> docs-lab/');
  }
  // Собственные страницы openspec_ru (namespace /docs/ru) живут вне ru/,
  // чтобы не ломать drift-check файлами без EN-пары.
  const ownSrc = resolve(root, 'website-ru-content');
  if (existsSync(ownSrc)) {
    cpSync(ownSrc, labDir, { recursive: true });
    log('docs-lab: website-ru-content -> docs-lab/');
  }

  return { siteDir, labDir, overlaid };
}

function git(cache, args, { allowFail = false } = {}) {
  const res = spawnSync('git', args, { cwd: cache, encoding: 'utf8' });
  if (res.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')}: код ${res.status}\n${res.stderr ?? ''}`);
  }
  return res;
}

function ensureClone(cache, upstream) {
  if (!existsSync(resolve(cache, '.git'))) {
    mkdirSync(dirname(cache), { recursive: true });
    const seed = process.env.RU_UPSTREAM_SEED
      ?? (existsSync('/tmp/openspec-upstream/.git') ? '/tmp/openspec-upstream' : null);
    const from = seed ?? UPSTREAM_URL;
    console.log(`build-website-ru: клонирую апстрим в ${cache} (источник: ${from})`);
    const res = spawnSync('git', ['clone', '--quiet', from, cache], { encoding: 'utf8' });
    if (res.status !== 0) throw new Error(`git clone: ${res.stderr}`);
    git(cache, ['remote', 'set-url', 'origin', UPSTREAM_URL]);
  }
  const have = git(cache, ['cat-file', '-t', upstream.commit], { allowFail: true }).status === 0;
  if (!have) {
    console.log(`build-website-ru: fetch тега ${upstream.tag}`);
    git(cache, ['fetch', '--quiet', 'origin', 'tag', upstream.tag]);
  }
  git(cache, ['checkout', '--quiet', '--force', '--detach', upstream.commit]);
  git(cache, ['clean', '-fdxq', '-e', 'node_modules']);
}

function run(cmd, args, cwd, label) {
  console.log(`\n=== ${label}: ${cmd} ${args.join(' ')} ===`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.error) {
    throw new Error(`шаг «${label}»: ${res.error.message}. Для сборки сайта нужен pnpm (npm i -g pnpm или corepack enable).`);
  }
  if (res.status !== 0) throw new Error(`шаг «${label}» завершился с кодом ${res.status} (вывод выше)`);
}

function detectPnpm() {
  const probe = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' }).status === 0;
  if (probe('pnpm', ['--version'])) return { cmd: 'pnpm', pre: [] };
  if (probe('corepack', ['pnpm', '--version'])) return { cmd: 'corepack', pre: ['pnpm'] };
  throw new Error('pnpm не найден (ни pnpm, ни corepack pnpm). Установите: npm i -g pnpm или corepack enable.');
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build');
  const upstream = readUpstream();
  const cache = resolve(ROOT, process.env.RU_UPSTREAM_CACHE ?? '.cache/upstream');
  const workDir = resolve(ROOT, process.env.RU_WEBSITE_WORK ?? '.cache/website-ru');
  console.log(`build-website-ru: апстрим ${upstream.repo} @ ${upstream.tag} (${upstream.commit.slice(0, 12)})`);

  ensureClone(cache, upstream);
  const { siteDir, overlaid } = buildTree({
    upstreamRoot: cache,
    workDir,
    manifest: readManifest(),
    log: (m) => console.log(`  ${m}`),
  });
  console.log(`build-website-ru: дерево собрано в ${siteDir} (строк наложено: ${overlaid.length})`);
  if (skipBuild) return;

  const pm = detectPnpm();
  run(pm.cmd, [...pm.pre, 'install'], siteDir, 'install');
  run(pm.cmd, [...pm.pre, 'build'], siteDir, 'build');

  const out = join(siteDir, 'out');
  if (!existsSync(join(out, 'index.html'))) {
    throw new Error(`сборка не создала ${out}/index.html`);
  }
  const dist = resolve(ROOT, 'dist-website');
  rmSync(dist, { recursive: true, force: true });
  cpSync(out, dist, { recursive: true });
  console.log(`\nbuild-website-ru: готово, сайт в ${dist}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\nbuild-website-ru: ${err.message}`);
    process.exit(1);
  });
}
