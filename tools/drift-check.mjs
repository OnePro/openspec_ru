#!/usr/bin/env node
// Дрейф-чек: сверка blob sha манифеста с деревом апстрима на пинned-теге.
// Категории: актуален / изменён / удалён в апстриме / новый без перевода.
// Симметричная сверка манифест <-> диск (design.md, D3 и Risks).
//
// Зафиксированная интерпретация симметричной сверки: для записей со статусом
// `pending` отсутствующий RU-файл НЕ является ошибкой (перевод ещё не начат,
// файлы появятся в последующих change'ах); для `machine`/`reviewed` RU-файл
// обязан существовать на диске.

import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  isTracked,
  readManifest,
  writeManifest,
  ROOT,
} from './lib/manifest.mjs';
import { fetchTree, readUpstream, verifyTagCommit } from './lib/github.mjs';

const writeReport = process.argv.includes('--report');
const reportPath = resolve(ROOT, 'drift-report.md');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === '.gitkeep') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const upstream = readUpstream();
const manifest = readManifest();
await verifyTagCommit(upstream);
const tree = await fetchTree(upstream);

const actual = [];
const changed = [];
const deleted = [];
const errors = [];

const manifestEn = new Set();
const manifestRu = new Set();
let dirty = false;

for (const entry of manifest.entries) {
  manifestEn.add(entry.en);
  manifestRu.add(entry.ru);
  const latest = tree.get(entry.en);
  if (latest === undefined) {
    deleted.push(entry);
    if (entry.latest_blob_sha !== undefined) {
      delete entry.latest_blob_sha;
      dirty = true;
    }
    continue;
  }
  if (latest !== entry.base_blob_sha) {
    changed.push(entry);
    if (entry.latest_blob_sha !== latest) {
      entry.latest_blob_sha = latest;
      dirty = true;
    }
  } else {
    actual.push(entry);
    if (entry.latest_blob_sha !== undefined) {
      delete entry.latest_blob_sha;
      dirty = true;
    }
  }
}

// Новые файлы в отслеживаемых зонах апстрима, отсутствующие в манифесте.
const added = [];
for (const path of tree.keys()) {
  if (isTracked(path) && !manifestEn.has(path)) added.push(path);
}
added.sort();

// Симметричная сверка манифест <-> диск.
for (const entry of manifest.entries) {
  if (entry.status === 'pending') continue; // перевод ещё не начат, RU-файла может не быть
  if (!existsSync(resolve(ROOT, entry.ru))) {
    errors.push(`RU-файл записи (${entry.status}) отсутствует на диске: ${entry.ru}`);
  }
}
const ruDir = resolve(ROOT, 'ru');
if (existsSync(ruDir)) {
  for (const file of walk(ruDir)) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (!manifestRu.has(rel)) {
      errors.push(`Файл в ru/ без записи в манифесте: ${rel}`);
    }
  }
}

if (dirty) writeManifest(manifest);

const lines = [];
lines.push(`# Отчёт drift-check — ${upstream.repo}@${upstream.tag}`);
lines.push('');
lines.push(`- Актуальны: ${actual.length}`);
lines.push(`- Изменены в апстриме: ${changed.length}`);
lines.push(`- Удалены в апстриме: ${deleted.length}`);
lines.push(`- Новые без перевода: ${added.length}`);
lines.push(`- Ошибки симметричной сверки: ${errors.length}`);
lines.push('');
if (changed.length > 0) {
  lines.push('## Изменены в апстриме');
  for (const e of changed) lines.push(`- ${e.en} (${e.status})`);
  lines.push('');
}
if (deleted.length > 0) {
  lines.push('## Удалены в апстриме');
  for (const e of deleted) lines.push(`- ${e.en}`);
  lines.push('');
}
if (added.length > 0) {
  lines.push('## Новые без перевода');
  for (const p of added) lines.push(`- ${p}`);
  lines.push('');
}
if (errors.length > 0) {
  lines.push('## Ошибки симметричной сверки');
  for (const e of errors) lines.push(`- ${e}`);
  lines.push('');
}

const report = lines.join('\n');
console.log(report);

if (writeReport) {
  writeFileSync(reportPath, report, 'utf8');
  console.log(`Отчёт записан: ${reportPath}`);
}

if (errors.length > 0) process.exit(1);
if (changed.length === 0 && deleted.length === 0 && added.length === 0) {
  console.log('Дрейф отсутствует.');
}
