#!/usr/bin/env node
// Дельта оригинала для устаревшего файла: unified diff между EN-версией
// на момент перевода (base_blob_sha) и текущей EN-версией на пинned-теге.
// Использование: node tools/drift-diff.mjs <en-путь | ru-путь>

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readManifest } from './lib/manifest.mjs';
import { fetchBlob, fetchTree, readUpstream, verifyTagCommit } from './lib/github.mjs';

const arg = process.argv[2];
if (!arg) {
  console.error('Использование: node tools/drift-diff.mjs <en-путь | ru-путь>');
  process.exit(2);
}
const needle = arg.split('\\').join('/');

const upstream = readUpstream();
const manifest = readManifest();
const entry = manifest.entries.find((e) => e.en === needle || e.ru === needle);
if (!entry) {
  console.error(`Файл не найден в манифесте: ${needle}`);
  process.exit(2);
}

await verifyTagCommit(upstream);
const tree = await fetchTree(upstream);
const latest = tree.get(entry.en);

if (latest === undefined) {
  console.log(`${entry.en}: файл удалён в апстриме, дельта недоступна.`);
  process.exit(0);
}
if (latest === entry.base_blob_sha) {
  console.log(`${entry.en}: файл актуален (base == latest, ${latest.slice(0, 12)}), diff не требуется.`);
  process.exit(0);
}

const [oldContent, newContent] = await Promise.all([
  fetchBlob(upstream, entry.base_blob_sha),
  fetchBlob(upstream, latest),
]);

// Кладём версии в temp-директорию под именами a/<имя> и b/<имя> и запускаем
// git из этой директории — заголовки diff получают читаемые пути.
const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-diff-'));
try {
  const base = entry.en.split('/').pop();
  mkdirSync(join(dir, 'a'));
  mkdirSync(join(dir, 'b'));
  writeFileSync(join(dir, 'a', base), oldContent, 'utf8');
  writeFileSync(join(dir, 'b', base), newContent, 'utf8');
  let diff;
  try {
    // Пустые префиксы: пути a/<файл> и b/<файл> попадают в заголовки как есть.
    diff = execFileSync('git', ['diff', '--no-index', '--src-prefix=', '--dst-prefix=', '--', 'a', 'b'], {
      encoding: 'utf8',
      cwd: dir,
    });
  } catch (err) {
    // git diff --no-index возвращает код 1 при наличии различий — это норма.
    if (err.status === 1 && typeof err.stdout === 'string') {
      diff = err.stdout;
    } else {
      throw err;
    }
  }
  console.log(`# ${entry.en}: base ${entry.base_blob_sha.slice(0, 12)} -> latest ${latest.slice(0, 12)}`);
  console.log(diff || '(различий в содержимом нет)');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
