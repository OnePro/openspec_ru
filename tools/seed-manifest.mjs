#!/usr/bin/env node
// Генерирует manifest.json из дерева апстрима на пинned-теге.
// Все файлы переводческой поверхности получают статус pending (design.md, D1/D3).

import { fetchTree, readUpstream, verifyTagCommit } from './lib/github.mjs';
import {
  areaFor,
  isTracked,
  ruPathFor,
  writeManifest,
  MANIFEST_PATH,
} from './lib/manifest.mjs';

const upstream = readUpstream();
await verifyTagCommit(upstream);
console.log(`Привязка подтверждена: ${upstream.repo}@${upstream.tag} -> ${upstream.commit}`);

const tree = await fetchTree(upstream);
console.log(`Дерево тега получено: ${tree.size} файлов`);

const entries = [];
for (const [path, sha] of [...tree.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  if (!isTracked(path)) continue;
  entries.push({
    en: path,
    ru: ruPathFor(path),
    base_blob_sha: sha,
    status: 'pending',
    area: areaFor(path),
  });
}

const manifest = {
  upstream,
  entries,
};
writeManifest(manifest);

const counts = {};
for (const e of entries) counts[e.area] = (counts[e.area] ?? 0) + 1;
console.log(`Манифест записан: ${MANIFEST_PATH}`);
console.log(`Записей: ${entries.length}`);
for (const [area, n] of Object.entries(counts).sort()) {
  console.log(`  ${area}: ${n}`);
}

// Контроль: все EN-пути из манифеста реально существуют в дереве тега.
const missing = entries.filter((e) => !tree.has(e.en));
if (missing.length > 0) {
  console.error(`ОШИБКА: ${missing.length} EN-путей отсутствуют в дереве тега:`);
  for (const e of missing) console.error(`  ${e.en}`);
  process.exit(1);
}
console.log('Проверка: все EN-пути существуют в дереве тега.');
