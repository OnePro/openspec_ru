#!/usr/bin/env node
// Синтаксический гейт RU-файлов зоны website (design D6).
// Полная сборка сайта не требуется: TypeScript проверяет TS/TSX и JSX.
//
// Использование:
//   node tools/gate-website-ru.mjs [en-путь | ru-путь]

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { readManifest, ROOT } from './lib/manifest.mjs';

/** Возвращает syntax-диагностики TypeScript; пустой массив означает успех. */
export function gateFile(path) {
  const source = readFileSync(path, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  });
  return (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
}

/** Человекочитаемые строки диагностик с позицией в исходнике. */
export function formatGateDiagnostics(path, diagnostics) {
  return diagnostics.map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (diagnostic.file && diagnostic.start !== undefined) {
      const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      return `${path}:${pos.line + 1}:${pos.character + 1}: ${message}`;
    }
    return `${path}: ${message}`;
  });
}

/**
 * Проверяет все существующие RU-файлы зоны website либо одну запись.
 * Возвращает { checked, failures }; отсутствие переведённых файлов — честный skip.
 */
export function gateWebsiteRu(options = {}) {
  if (typeof options === 'string') options = { path: options };
  const { path, manifest = readManifest(), root = ROOT } = options;
  let entries = manifest.entries.filter((entry) => entry.area === 'website');
  if (path) {
    const needle = path.split('\\').join('/');
    const entry = entries.find((item) => item.en === needle || item.ru === needle);
    if (!entry) throw new Error(`Файл зоны website не найден в манифесте: ${needle}`);
    entries = [entry];
  } else {
    entries = entries.filter((entry) => existsSync(resolve(root, entry.ru)));
  }

  const failures = [];
  for (const entry of entries) {
    const file = resolve(root, entry.ru);
    if (!existsSync(file)) throw new Error(`RU-файл отсутствует на диске: ${entry.ru}`);
    const diagnostics = gateFile(file);
    if (diagnostics.length > 0) failures.push({ entry, file, diagnostics });
  }
  return { checked: entries.length, failures };
}

function main() {
  const result = gateWebsiteRu({ path: process.argv[2] });
  if (result.checked === 0) {
    console.log('Гейт website: RU-файлов нет, проверка пропущена.');
    return;
  }
  for (const failure of result.failures) {
    for (const line of formatGateDiagnostics(failure.entry.ru, failure.diagnostics)) {
      console.error(line);
    }
  }
  if (result.failures.length > 0) {
    console.error(`Гейт website: ошибки в ${result.failures.length} файлах из ${result.checked}.`);
    process.exit(1);
  }
  console.log(`Гейт website: синтаксис ${result.checked} файлов корректен.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
