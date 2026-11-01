// Синтаксический гейт website: валидные TS/TSX, сломанный JSX и выбор файлов.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { formatGateDiagnostics, gateFile, gateWebsiteRu } from './gate-website-ru.mjs';

const SHA = 'a'.repeat(40);

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-gate-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function entry(en, ru) {
  return { en, ru, base_blob_sha: SHA, status: 'machine', area: 'website' };
}

function writeRu(root, entry, content) {
  const file = join(root, entry.ru);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

test('gateFile: валидный TSX с React JSX проходит без диагностик', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'page.tsx');
  writeFileSync(file, 'export default function Page() { return <main><h1>Привет</h1></main>; }\n');
  assert.deepEqual(gateFile(file), []);
});

test('gateFile: сломанный JSX возвращает syntax-ошибку с файлом и сообщением', (t) => {
  const dir = tempDir(t);
  const file = join(dir, 'broken.tsx');
  writeFileSync(file, 'export default () => <section><h1>Сломано</section>;\n');
  const diagnostics = gateFile(file);
  assert.ok(diagnostics.length > 0);
  assert.ok(diagnostics.every((item) => item.category === 1));
  const output = formatGateDiagnostics('ru/website-strings/broken.tsx', diagnostics).join('\n');
  assert.match(output, /ru\/website-strings\/broken\.tsx:\d+:\d+/);
  assert.ok(output.length > 40);
});

test('gateFile: обычный не-TSX TypeScript тоже проверяется', (t) => {
  const dir = tempDir(t);
  const valid = join(dir, 'strings.ts');
  const broken = join(dir, 'broken.ts');
  writeFileSync(valid, 'export const label: string = "Привет";\n');
  writeFileSync(broken, 'export const label: = "Привет";\n');
  assert.deepEqual(gateFile(valid), []);
  assert.ok(gateFile(broken).length > 0);
});

test('gateWebsiteRu: без аргумента проверяются только существующие RU-файлы зоны', (t) => {
  const dir = tempDir(t);
  const present = entry('website/app/present.tsx', 'ru/website-strings/app/present.tsx');
  const absent = entry('website/app/absent.tsx', 'ru/website-strings/app/absent.tsx');
  const otherArea = { ...entry('docs-lab/x.md', 'ru/docs-lab/x.md'), area: 'docs-lab' };
  writeRu(dir, present, 'export default () => <p>Готово</p>;\n');
  const result = gateWebsiteRu({
    root: dir,
    manifest: { entries: [present, absent, otherArea] },
  });
  assert.equal(result.checked, 1);
  assert.deepEqual(result.failures, []);
});

test('gateWebsiteRu: один EN/RU-путь выбирает запись; ошибка JSX попадает в failures', (t) => {
  const dir = tempDir(t);
  const item = entry('website/app/page.tsx', 'ru/website-strings/app/page.tsx');
  writeRu(dir, item, 'export default () => <div>Ошибка</span>;\n');
  const manifest = { entries: [item] };
  assert.equal(gateWebsiteRu({ path: item.en, root: dir, manifest }).failures.length, 1);
  assert.equal(gateWebsiteRu({ path: item.ru, root: dir, manifest }).failures.length, 1);
  assert.throws(() => gateWebsiteRu({ path: 'website/app/none.tsx', root: dir, manifest }), /не найден/);
});

test('gateWebsiteRu: пустой набор RU-файлов — успешный skip', () => {
  const item = entry('website/app/page.tsx', 'ru/website-strings/app/page.tsx');
  const result = gateWebsiteRu({ root: tmpdir(), manifest: { entries: [item] } });
  assert.deepEqual(result, { checked: 0, failures: [] });
});
