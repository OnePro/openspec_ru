// Unit-тесты manifest.mjs: round-trip чтение/запись, валидация, маппинг путей.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateEntry,
  validateManifest,
  writeManifest,
  readManifest,
  ruPathFor,
  areaFor,
  isTracked,
} from './manifest.mjs';

const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);

function sampleManifest() {
  return {
    upstream: { repo: 'Fission-AI/OpenSpec', tag: 'v1.15.0', commit: SHA2 },
    entries: [
      { en: 'docs-lab/index.md', ru: 'ru/docs-lab/index.md', base_blob_sha: SHA, status: 'pending', area: 'docs-lab' },
      { en: 'README.md', ru: 'ru/meta/README.md', base_blob_sha: SHA, status: 'machine', area: 'meta', latest_blob_sha: SHA2 },
    ],
  };
}

test('round-trip: writeManifest -> readManifest возвращает эквивалентный манифест', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-test-'));
  try {
    const path = join(dir, 'manifest.json');
    const manifest = sampleManifest();
    writeManifest(manifest, path);
    const back = readManifest(path);
    assert.deepEqual(back, manifest);
    // Записывается читаемый JSON с переводом строки в конце.
    assert.ok(readFileSync(path, 'utf8').endsWith('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validateEntry принимает корректную запись', () => {
  assert.deepEqual(validateEntry(sampleManifest().entries[0]), []);
});

test('validateEntry отклоняет битые записи', () => {
  const bad = { en: '', ru: 5, base_blob_sha: 'xyz', status: 'outdated', area: 'nowhere' };
  const errors = validateEntry(bad);
  assert.equal(errors.length, 5);
  assert.ok(errors.some((e) => e.startsWith('status:')));
  assert.ok(errors.some((e) => e.startsWith('base_blob_sha:')));
});

test('validateManifest отклоняет дубликаты en-путей и битый upstream', () => {
  const m = sampleManifest();
  m.entries.push(m.entries[0]);
  assert.throws(() => validateManifest(m), /дубликат en-пути/);
  assert.throws(() => validateManifest({ entries: [] }), /upstream/);
});

test('validateEntry проверяет опциональный latest_blob_sha', () => {
  const e = { ...sampleManifest().entries[0], latest_blob_sha: 'nope' };
  assert.ok(validateEntry(e).some((err) => err.startsWith('latest_blob_sha:')));
});

test('ruPathFor раскладывает зоны по дереву-зеркалу', () => {
  assert.equal(ruPathFor('src/core/templates/x.ts'), 'ru/src/core/templates/x.ts');
  assert.equal(ruPathFor('docs-lab/guide.md'), 'ru/docs-lab/guide.md');
  assert.equal(ruPathFor('schemas/a.json'), 'ru/schemas/a.json');
  assert.equal(ruPathFor('website/app/page.tsx'), 'ru/website-strings/app/page.tsx');
  assert.equal(ruPathFor('README.md'), 'ru/meta/README.md');
});

test('areaFor определяет зону по пути', () => {
  assert.equal(areaFor('src/core/templates/x.ts'), 'templates');
  assert.equal(areaFor('schemas/a.json'), 'schemas');
  assert.equal(areaFor('docs-lab/guide.md'), 'docs-lab');
  assert.equal(areaFor('website/app/page.tsx'), 'website');
  assert.equal(areaFor('install.md'), 'meta');
});

test('isTracked фильтрует переводческую поверхность', () => {
  assert.ok(isTracked('src/core/templates/workflows/proposal.ts'));
  assert.ok(isTracked('docs-lab/index.md'));
  assert.ok(isTracked('schemas/project.schema.json'));
  assert.ok(isTracked('website/app/layout.tsx'));
  assert.ok(isTracked('website/lib/source.ts'));
  assert.ok(isTracked('README.md'));
  assert.ok(isTracked('install.md'));
  assert.ok(!isTracked('src/core/templates/style.css')); // не .ts
  assert.ok(!isTracked('src/commands/init.ts')); // вне зон
  assert.ok(!isTracked('website/scripts/sync-docs.mjs')); // вне app/ и lib/
  assert.ok(!isTracked('docs/old.md')); // старый docs/ не переводим
  assert.ok(!isTracked('CONTRIBUTING.md'));
});
