// Unit-тесты идемпотентного seed (задача 1.1): re-seed не сбрасывает статусы
// и sha существующих записей, добавляет только новые EN-пути как pending.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  globToRegExp,
  isTracked,
  mergeSeedEntries,
  ZONES,
} from './lib/manifest.mjs';

const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);
const SHA3 = 'c'.repeat(40);

function treeOf(paths) {
  return new Map(paths.map((p, i) => [p, SHA.slice(0, 39) + i]));
}

test('re-seed не сбрасывает статусы и sha существующих записей', () => {
  const existing = [
    { en: 'README.md', ru: 'ru/meta/README.md', base_blob_sha: SHA, status: 'machine', area: 'meta', latest_blob_sha: SHA2 },
    { en: 'docs-lab/index.md', ru: 'ru/docs-lab/index.md', base_blob_sha: SHA2, status: 'reviewed', area: 'docs-lab' },
  ];
  const tree = treeOf(['README.md', 'docs-lab/index.md', 'schemas/spec-driven/schema.yaml']);
  const { entries, added } = mergeSeedEntries(existing, tree);
  // Существующие записи сохранены байт-в-байт (включая latest_blob_sha).
  assert.deepEqual(entries.find((e) => e.en === 'README.md'), existing[0]);
  assert.deepEqual(entries.find((e) => e.en === 'docs-lab/index.md'), existing[1]);
  // Новый путь добавлен как pending.
  assert.equal(added.length, 1);
  assert.deepEqual(added[0], {
    en: 'schemas/spec-driven/schema.yaml',
    ru: 'ru/schemas/spec-driven/schema.yaml',
    base_blob_sha: tree.get('schemas/spec-driven/schema.yaml'),
    status: 'pending',
    area: 'schemas',
  });
});

test('re-seed по неизменному дереву ничего не добавляет (полная идемпотентность)', () => {
  const tree = treeOf(['README.md', 'schemas/spec-driven/schema.yaml']);
  const first = mergeSeedEntries([], tree);
  const second = mergeSeedEntries(first.entries, tree);
  assert.equal(second.added.length, 0);
  assert.deepEqual(second.entries, first.entries);
});

test('неотслеживаемые пути не попадают в манифест', () => {
  const tree = treeOf(['src/commands/init.ts', 'CONTRIBUTING.md', 'schemas/README.txt']);
  const { added } = mergeSeedEntries([], tree);
  assert.equal(added.length, 0);
});

test('результат слияния отсортирован по en-пути', () => {
  const existing = [
    { en: 'website/app/page.tsx', ru: 'ru/website-strings/app/page.tsx', base_blob_sha: SHA, status: 'machine', area: 'website' },
  ];
  const tree = treeOf(['website/app/page.tsx', 'schemas/spec-driven/schema.yaml']);
  const { entries } = mergeSeedEntries(existing, tree);
  assert.deepEqual(entries.map((e) => e.en), [
    'schemas/spec-driven/schema.yaml',
    'website/app/page.tsx',
  ]);
});

test('зоны покрывают glob-паттернами schemas: yaml, yml и md', () => {
  assert.ok(isTracked('schemas/spec-driven/schema.yaml'));
  assert.ok(isTracked('schemas/spec-driven/templates/proposal.md'));
  assert.ok(isTracked('schemas/x/y.yml'));
  assert.ok(!isTracked('schemas/spec-driven/schema.json')); // json вне D1
  assert.ok(!isTracked('schemas/spec-driven/readme.txt'));
});

test('globToRegExp: ** матчит ноль и более сегментов, * — внутри сегмента', () => {
  assert.ok(globToRegExp('schemas/**/*.md').test('schemas/a.md'));
  assert.ok(globToRegExp('schemas/**/*.md').test('schemas/a/b/c.md'));
  assert.ok(!globToRegExp('schemas/**/*.md').test('schemas/a/b/c.ts'));
  assert.ok(globToRegExp('website/{app,lib}/**/*.{ts,tsx}').test('website/app/x.tsx'));
  assert.ok(globToRegExp('website/{app,lib}/**/*.{ts,tsx}').test('website/lib/x.ts'));
  assert.ok(!globToRegExp('website/{app,lib}/**/*.{ts,tsx}').test('website/scripts/x.ts'));
});

test('таблица ZONES покрывает все зоны переводческой поверхности', () => {
  const areas = ZONES.map((z) => z.area).sort();
  assert.deepEqual(areas, ['docs-lab', 'schemas', 'templates', 'website']);
});
