#!/usr/bin/env node
// Обновляет manifest.json из дерева апстрима на пинned-теге (design.md, D1).
// Re-seed идемпотентен: существующие записи (статусы, base_blob_sha) не
// трогаются, добавляются только новые EN-пути со статусом pending.

import { existsSync } from 'node:fs';
import { fetchTree, readUpstream, verifyTagCommit } from './lib/github.mjs';
import {
  mergeSeedEntries,
  readManifest,
  writeManifest,
  MANIFEST_PATH,
} from './lib/manifest.mjs';

const upstream = readUpstream();
await verifyTagCommit(upstream);
console.log(`Привязка подтверждена: ${upstream.repo}@${upstream.tag} -> ${upstream.commit}`);

const tree = await fetchTree(upstream);
console.log(`Дерево тега получено: ${tree.size} файлов`);

const existing = existsSync(MANIFEST_PATH) ? readManifest().entries : [];
const { entries, added } = mergeSeedEntries(existing, tree);

const manifest = {
  upstream,
  entries,
};
writeManifest(manifest);

const counts = {};
for (const e of entries) counts[e.area] = (counts[e.area] ?? 0) + 1;
console.log(`Манифест записан: ${MANIFEST_PATH}`);
console.log(`Записей: ${entries.length} (добавлено новых: ${added.length}, сохранено: ${existing.length})`);
for (const [area, n] of Object.entries(counts).sort()) {
  console.log(`  ${area}: ${n}`);
}
for (const e of added) {
  console.log(`  + ${e.en} -> ${e.ru}`);
}

// Контроль: EN-пути манифеста, которых нет в дереве тега, — устаревшие записи.
// Они не удаляются автоматически (статусы перевода нельзя терять), но о них
// нужно знать.
const missing = entries.filter((e) => !tree.has(e.en));
if (missing.length > 0) {
  console.warn(`ВНИМАНИЕ: ${missing.length} EN-путей отсутствуют в дереве тега (записи сохранены):`);
  for (const e of missing) console.warn(`  ${e.en}`);
} else {
  console.log('Проверка: все EN-пути существуют в дереве тега.');
}
