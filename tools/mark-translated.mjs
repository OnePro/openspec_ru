#!/usr/bin/env node
// Фиксирует (пере)перевод файла: поднимает base_blob_sha до актуального
// blob sha на пинned-теге (или до сохранённого latest_blob_sha) и выставляет
// статус. Использование:
//   node tools/mark-translated.mjs <en-путь | ru-путь> [machine|reviewed]

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readManifest, writeManifest, ROOT, STATUSES } from './lib/manifest.mjs';
import { fetchTree, readUpstream, verifyTagCommit } from './lib/github.mjs';

const [arg, status = 'machine'] = process.argv.slice(2);
if (!arg || !STATUSES.slice(1).includes(status)) {
  console.error('Использование: node tools/mark-translated.mjs <en-путь | ru-путь> [machine|reviewed]');
  process.exit(2);
}
const needle = arg.split('\\').join('/');

const manifest = readManifest();
const entry = manifest.entries.find((e) => e.en === needle || e.ru === needle);
if (!entry) {
  console.error(`Файл не найден в манифесте: ${needle}`);
  process.exit(2);
}
if (!existsSync(resolve(ROOT, entry.ru))) {
  console.error(`RU-файл отсутствует на диске: ${entry.ru} — сначала добавьте перевод.`);
  process.exit(1);
}

const upstream = readUpstream();
await verifyTagCommit(upstream);
const tree = await fetchTree(upstream);
const latest = tree.get(entry.en);
if (latest === undefined) {
  console.error(`EN-файл отсутствует в апстриме на теге ${upstream.tag}: ${entry.en}`);
  process.exit(1);
}

const prev = entry.base_blob_sha;
entry.base_blob_sha = latest;
delete entry.latest_blob_sha;
entry.status = status;
writeManifest(manifest);
console.log(
  `${entry.en}: base_blob_sha ${prev.slice(0, 12)} -> ${latest.slice(0, 12)}, статус '${status}'. Файл считается актуальным.`
);
