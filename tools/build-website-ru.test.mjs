// Тесты сборки сайта (без сети и без pnpm): дерево наложения, slugify, патч сайдбара.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { ROOT } from './lib/manifest.mjs';
import { buildTree } from './build-website-ru.mjs';

const SHA = 'a'.repeat(40);

function put(base, rel, text) {
  const file = join(base, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-site-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const up = join(dir, 'up');
  const root = join(dir, 'root');
  put(up, 'website/app/page.tsx', 'EN page');
  put(up, 'website/lib/shared.ts', 'EN shared');
  put(up, 'website/docs.sync.config.mjs', 'EN config');
  put(up, 'website/node_modules/x/index.js', 'junk');
  put(up, 'cli/other.ts', 'not site');
  put(root, 'ru/website-strings/app/page.tsx', 'RU page');
  put(root, 'ru/website-strings/extra.tsx', 'RU extra, нет в манифесте');
  put(root, 'ru/docs-lab/start/installation.md', 'RU doc');
  put(root, 'website-ru-patches/docs.sync.config.mjs', 'RU config');
  put(root, 'website-ru-patches/app/page.tsx', 'PATCHED page');
  put(root, 'website-ru-content/ru/index.md', 'own RU page');
  put(root, 'assets/openspec-ru-ui-kanban.png', 'PNGDATA');
  const manifest = {
    entries: [
      { en: 'website/app/page.tsx', ru: 'ru/website-strings/app/page.tsx', base_blob_sha: SHA, status: 'reviewed', area: 'website' },
      { en: 'website/lib/shared.ts', ru: 'ru/website-strings/lib/shared.ts', base_blob_sha: SHA, status: 'pending', area: 'website' },
      { en: 'docs-lab/start/installation.md', ru: 'ru/docs-lab/start/installation.md', base_blob_sha: SHA, status: 'reviewed', area: 'docs-lab' },
    ],
  };
  return { dir, up, root, manifest, work: join(dir, 'work') };
}

test('buildTree: порядок строки → патчи, docs-lab рядом с site, лишнее не тянется', (t) => {
  const f = fixture(t);
  const { siteDir, labDir, overlaid } = buildTree({
    upstreamRoot: f.up, workDir: f.work, manifest: f.manifest, root: f.root,
  });
  // строки наложены, затем патч перекрыл; апстримовый конфиг сохранён под отдельным именем
  assert.equal(readFileSync(join(siteDir, 'app/page.tsx'), 'utf8'), 'PATCHED page');
  assert.equal(readFileSync(join(siteDir, 'docs.sync.config.mjs'), 'utf8'), 'RU config');
  assert.equal(readFileSync(join(siteDir, 'docs.sync.upstream.mjs'), 'utf8'), 'EN config');
  // нет ru-файла в манифесте/на диске → остаётся EN
  assert.equal(readFileSync(join(siteDir, 'lib/shared.ts'), 'utf8'), 'EN shared');
  assert.deepEqual(overlaid, ['website/app/page.tsx']);
  // лишнее не тянется
  assert.equal(existsSync(join(siteDir, 'extra.tsx')), false);
  assert.equal(existsSync(join(siteDir, 'cli')), false);
  assert.equal(existsSync(join(siteDir, 'node_modules')), false);
  // docs-lab на месте, откуда ждёт sync-docs ('../docs-lab'); собственные страницы — рядом
  assert.equal(labDir, resolve(siteDir, '../docs-lab'));
  assert.equal(readFileSync(join(labDir, 'start/installation.md'), 'utf8'), 'RU doc');
  assert.equal(readFileSync(join(labDir, 'ru/index.md'), 'utf8'), 'own RU page');
  assert.equal(readFileSync(join(siteDir, 'public/assets/openspec-ru-ui-kanban.png'), 'utf8'), 'PNGDATA');
});

test('buildTree: повторный прогон сохраняет node_modules и убирает устаревшее', (t) => {
  const f = fixture(t);
  const first = buildTree({ upstreamRoot: f.up, workDir: f.work, manifest: f.manifest, root: f.root });
  put(first.siteDir, 'node_modules/keep/index.js', 'kept');
  put(first.siteDir, 'stale.txt', 'stale');
  buildTree({ upstreamRoot: f.up, workDir: f.work, manifest: f.manifest, root: f.root });
  assert.equal(existsSync(join(first.siteDir, 'node_modules/keep/index.js')), true);
  assert.equal(existsSync(join(first.siteDir, 'stale.txt')), false);
});

// Загружаем remarkFaq из TS-файла оверлея без сборки сайта и прогоняем
// трансформер по минимальному дереву, чтобы проверить id аккордеонов.
async function runRemarkFaq(t, headings) {
  const src = readFileSync(join(ROOT, 'ru/website-strings/lib/remark-faq.ts'), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-slug-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'remark-faq.mjs');
  writeFileSync(file, js);
  const { remarkFaq } = await import(pathToFileURL(file).href);
  const tree = {
    type: 'root',
    children: headings.map((h) => ({
      type: 'heading', depth: 2,
      children: [{ type: 'text', value: h }],
    })),
  };
  remarkFaq()(tree, { stem: 'faq' });
  const accordions = tree.children[0].children;
  return accordions.map((a) => a.attributes.find((at) => at.name === 'id').value);
}

test('slugify: латиница, пробелы и запрещённые символы как раньше', async (t) => {
  const ids = await runRemarkFaq(t, ['What is OpenSpec?', '  Foo   Bar  ', 'A/B (c) - d']);
  assert.deepEqual(ids, ['what-is-openspec', 'foo-bar', 'ab-c---d']);
});

test('slugify: кириллица сохраняется, регистр понижается', async (t) => {
  const ids = await runRemarkFaq(t, ['Что такое OpenSpec?', 'Ёжик и Ёлка']);
  assert.deepEqual(ids, ['что-такое-openspec', 'ёжик-и-ёлка']);
  assert.ok(ids.every((id) => id.length > 0));
});

test('патч сайдбара: русские label и те же slug, что у апстрима', async (t) => {
  // Конфиг импортирует апстримовый манифест как docs.sync.upstream.mjs —
  // кладём рядом минимальную фикстуру и импортируем из временного каталога.
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-syncconf-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  put(dir, 'docs.sync.upstream.mjs', `
export const docsDir = '../docs-lab';
export const sections = [
  { label: 'Start', pages: [{ source: 'start/installation.md', slug: 'installation' }] },
  { label: 'Customize', pages: [{ source: 'customize/overview.md', slug: 'customize' }] },
  { label: 'Multi-repo (beta)', pages: [{ source: 'multi-repo/stores.md', slug: 'stores' }] },
  { label: 'Reference', pages: [{ source: 'reference/cli.md', slug: 'cli' }] },
];
export const pages = sections.flatMap((s) => s.pages);
`);
  const patchSrc = readFileSync(join(ROOT, 'website-ru-patches/docs.sync.config.mjs'), 'utf8');
  writeFileSync(join(dir, 'docs.sync.config.mjs'), patchSrc);
  const mod = await import(pathToFileURL(join(dir, 'docs.sync.config.mjs')).href);
  assert.deepEqual(mod.sections.map((s) => s.label), ['OpenSpec RU', 'Начало', 'Настройка', 'Мультирепо (beta)', 'Справочник']);
  assert.deepEqual(mod.pages.map((p) => p.slug), ['installation', 'customize', 'stores', 'cli', 'ru/index', 'ru/install', 'ru/templates/proposal', 'ru/templates/design', 'ru/templates/tasks', 'ru/templates/spec']);
  assert.equal(mod.docsDir, '../docs-lab');
});
