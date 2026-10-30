#!/usr/bin/env node
// Детерминированная валидация RU-переводов (design D3). LLM не участвует.
//
// Использование:
//   node tools/validate-translation.mjs <en-файл> <ru-файл>   — парная валидация
//   node tools/validate-translation.mjs --lint <пути...>      — только глоссарий-линт
//   node tools/validate-translation.mjs --all                 — все RU-файлы из манифеста
//                                                               (EN-блобы по base_blob_sha)

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readManifest } from './lib/manifest.mjs';
import { fetchBlob, readUpstream } from './lib/github.mjs';
import { loadGlossary, lintGlossaryText } from './lib/glossary.mjs';
import { parseYaml } from './lib/yaml.mjs';

const TS_EXTS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const MD_EXTS = new Set(['.md', '.markdown']);
const YAML_EXTS = new Set(['.yaml', '.yml']);

export function isTs(path) { return TS_EXTS.has(extname(path)); }
export function isMd(path) { return MD_EXTS.has(extname(path)); }
export function isYaml(path) { return YAML_EXTS.has(extname(path)); }

// ---------------------------------------------------------------------------
// Markdown-зоны: fenced-код-блоки исключаются из структурных проверок.
// ---------------------------------------------------------------------------

/** Разбивает markdown на «вне кода» и число код-блоков. */
export function codeZones(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const outside = [];
  let inFence = false;
  let blocks = 0;
  for (const line of lines) {
    if (/^[ \t]*(```+|~~~+)/.test(line)) {
      if (inFence) {
        inFence = false;
      } else {
        inFence = true;
        blocks++;
      }
      outside.push('');
      continue;
    }
    outside.push(inFence ? '' : line);
  }
  return { outside: outside.join('\n'), blocks };
}

/** Последовательность уровней ATX-заголовков вне код-блоков. */
export function headingLevels(md) {
  const { outside } = codeZones(md);
  const levels = [];
  for (const line of outside.split('\n')) {
    const m = line.match(/^(#{1,6})\s/);
    if (m) levels.push(m[1].length);
  }
  return levels;
}

/** Множество целей ссылок (и картинок) вне код-блоков. */
export function linkTargets(md) {
  const { outside } = codeZones(md);
  const targets = [];
  for (const m of outside.matchAll(/!?\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    targets.push(m[1]);
  }
  return [...new Set(targets)].sort();
}

/** Ключи frontmatter верхнего уровня; null, если frontmatter нет. */
export function frontmatterKeys(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!m) return null;
  const keys = [];
  for (const line of m[1].split('\n')) {
    const k = line.match(/^([A-Za-z0-9_-]+):/);
    if (k) keys.push(k[1]);
  }
  return [...new Set(keys)].sort();
}

/** Идентификаторы /opsx:* и значения `name:` (по всему файлу, включая код). */
export function identifiers(text) {
  const opsx = [...text.matchAll(/\/opsx:[a-z0-9-]+/gi)].map((m) => m[0]);
  const names = [...text.matchAll(/^name:\s*(\S+)/gm)].map((m) => m[1]);
  return { opsx: [...new Set(opsx)].sort(), names: [...new Set(names)].sort() };
}

// ---------------------------------------------------------------------------
// Сравнение мультимножеств.
// ---------------------------------------------------------------------------

function diffMultiset(label, enItems, ruItems) {
  const errors = [];
  const count = (arr) => {
    const map = new Map();
    for (const x of arr) map.set(x, (map.get(x) ?? 0) + 1);
    return map;
  };
  const en = count(enItems);
  const ru = count(ruItems);
  for (const [item, n] of en) {
    const r = ru.get(item) ?? 0;
    if (r < n) errors.push(`${label}: отсутствует в RU (${n - r}×): ${JSON.stringify(item)}`);
  }
  for (const [item, n] of ru) {
    const e = en.get(item) ?? 0;
    if (e < n) errors.push(`${label}: лишний в RU (${n - e}×): ${JSON.stringify(item)}`);
  }
  return errors;
}

function diffSet(label, enItems, ruItems) {
  return diffMultiset(label, [...new Set(enItems)], [...new Set(ruItems)]);
}

// ---------------------------------------------------------------------------
// Парные проверки по типам файлов.
// ---------------------------------------------------------------------------

/** Markdown: код-блоки, заголовки, ссылки/якоря, frontmatter, идентификаторы. */
export function validateMarkdownPair(en, ru) {
  const errors = [];
  const enBlocks = codeZones(en).blocks;
  const ruBlocks = codeZones(ru).blocks;
  if (enBlocks !== ruBlocks) {
    errors.push(`код-блоки: в EN ${enBlocks}, в RU ${ruBlocks}`);
  }
  const enH = headingLevels(en);
  const ruH = headingLevels(ru);
  if (enH.join(',') !== ruH.join(',')) {
    errors.push(`заголовки: последовательность уровней EN [${enH}] != RU [${ruH}]`);
  }
  errors.push(...diffSet('ссылки/якоря', linkTargets(en), linkTargets(ru)));
  const enFm = frontmatterKeys(en);
  const ruFm = frontmatterKeys(ru);
  if (enFm === null && ruFm !== null) {
    errors.push('frontmatter: добавлен в RU, которого нет в EN');
  } else if (enFm !== null && ruFm === null) {
    errors.push('frontmatter: потерян в RU');
  } else if (enFm !== null) {
    errors.push(...diffSet('ключи frontmatter', enFm, ruFm));
  }
  const enId = identifiers(en);
  const ruId = identifiers(ru);
  errors.push(...diffSet('идентификаторы /opsx:*', enId.opsx, ruId.opsx));
  errors.push(...diffSet('идентификаторы name:', enId.names, ruId.names));
  return errors;
}

// ---------------------------------------------------------------------------
// TS-шаблоны: ${...}-токены, имена импортов/констант/экспортов.
// ---------------------------------------------------------------------------

export function tsTokens(ts) {
  return [...ts.matchAll(/\$\{([\s\S]*?)\}/g)].map((m) => m[1].trim());
}

export function tsImportNames(ts) {
  const names = [];
  for (const m of ts.matchAll(/import\s+(?:type\s+)?([^;]*?)\s+from\s+['"][^'"]+['"]/g)) {
    const clause = m[1];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (name) names.push(name);
      }
    }
    const def = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim();
    if (def && def !== 'type') {
      const star = def.match(/\*\s+as\s+([\w$]+)/);
      if (star) names.push(star[1]);
      else names.push(def);
    }
  }
  return [...new Set(names)].sort();
}

export function tsConstNames(ts) {
  return [...new Set([...ts.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
}

export function tsExportNames(ts) {
  const names = [];
  for (const m of ts.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.push(m[1]);
  }
  for (const m of ts.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim();
      if (name) names.push(name);
    }
  }
  if (/\bexport\s+default\b/.test(ts)) names.push('default');
  return [...new Set(names)].sort();
}

export function validateTsPair(en, ru) {
  const errors = [];
  errors.push(...diffMultiset('токены ${...}', tsTokens(en), tsTokens(ru)));
  errors.push(...diffSet('имена импортов', tsImportNames(en), tsImportNames(ru)));
  errors.push(...diffSet('имена констант', tsConstNames(en), tsConstNames(ru)));
  errors.push(...diffSet('имена экспортов', tsExportNames(en), tsExportNames(ru)));
  return errors;
}

// ---------------------------------------------------------------------------
// JSON (schemas): равенство множества путей ключей.
// ---------------------------------------------------------------------------

function keyPaths(value, prefix = '') {
  const paths = [];
  if (Array.isArray(value)) {
    for (const item of value) paths.push(...keyPaths(item, `${prefix}[]`));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const p = prefix ? `${prefix}.${k}` : k;
      paths.push(p);
      paths.push(...keyPaths(v, p));
    }
  }
  return paths;
}

/**
 * Ключи YAML, чьи значения — непереводимые идентификаторы (design D2):
 * id и имена артефактов, пути шаблонов/генерируемых файлов, версия.
 * Их значения обязаны совпасть с EN байт-в-байт.
 */
export const YAML_ID_KEYS = new Set([
  'id',
  'name',
  'version',
  'generates',
  'template',
  'tracks',
  'requires',
]);

/** Пары «путь=значение» для значений-идентификаторов (белый список ключей). */
function yamlIdValues(value, prefix = '', out = []) {
  if (Array.isArray(value)) {
    for (const item of value) yamlIdValues(item, `${prefix}[]`, out);
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (YAML_ID_KEYS.has(k) && (v === null || typeof v !== 'object')) {
        out.push(`${p}=${JSON.stringify(v)}`);
      } else if (YAML_ID_KEYS.has(k) && Array.isArray(v)) {
        for (const item of v) out.push(`${p}[]=${JSON.stringify(item)}`);
      } else {
        yamlIdValues(v, p, out);
      }
    }
  }
  return out;
}

/** Текстовые значения вне белого списка — кандидаты на перевод и глоссарий-линт. */
export function yamlTextValues(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) yamlTextValues(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (!YAML_ID_KEYS.has(k)) yamlTextValues(v, out);
    }
  } else if (typeof value === 'string') {
    out.push(value);
  }
  return out;
}

/** Длины массивов по путям — дополняет keyPaths, чей синтаксис `[]` без
 * индексов не отличает массив из 2 элементов от массива из 1. */
function yamlArrayLengths(value, prefix = '', out = []) {
  if (Array.isArray(value)) {
    out.push(`${prefix}[]=${value.length}`);
    for (const item of value) yamlArrayLengths(item, `${prefix}[]`, out);
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      yamlArrayLengths(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

/**
 * YAML: равенство множества путей ключей и длин массивов + неизменность
 * значений-идентификаторов из белого списка (design D2).
 * Текстовые значения линтуются в validatePair.
 */
export function validateYamlPair(en, ru) {
  let enObj, ruObj;
  try {
    enObj = parseYaml(en);
  } catch (e) {
    return [`EN: невалидный YAML: ${e.message}`];
  }
  try {
    ruObj = parseYaml(ru);
  } catch (e) {
    return [`RU: невалидный YAML: ${e.message}`];
  }
  const errors = diffSet('ключи YAML', keyPaths(enObj), keyPaths(ruObj));
  errors.push(...diffSet('длины массивов YAML', yamlArrayLengths(enObj), yamlArrayLengths(ruObj)));
  errors.push(...diffSet('идентификаторы YAML', yamlIdValues(enObj), yamlIdValues(ruObj)));
  return errors;
}

export function validateJsonPair(en, ru) {
  let enObj, ruObj;
  try {
    enObj = JSON.parse(en);
  } catch (e) {
    return [`EN: невалидный JSON: ${e.message}`];
  }
  try {
    ruObj = JSON.parse(ru);
  } catch (e) {
    return [`RU: невалидный JSON: ${e.message}`];
  }
  return diffSet('ключи JSON', keyPaths(enObj), keyPaths(ruObj));
}

// ---------------------------------------------------------------------------
// Точка входа парной валидации: структура + глоссарий-линт (для всех файлов).
// ---------------------------------------------------------------------------

export function validatePair(en, ru, enPath, { glossary = null, ruPath = null } = {}) {
  const errors = [];
  if (isMd(enPath)) errors.push(...validateMarkdownPair(en, ru));
  else if (isTs(enPath)) errors.push(...validateTsPair(en, ru));
  else if (isYaml(enPath)) errors.push(...validateYamlPair(en, ru));
  else if (extname(enPath) === '.json') errors.push(...validateJsonPair(en, ru));
  if (glossary) {
    let lintText = ru;
    let markdown = isMd(enPath);
    let detectUntranslated = isMd(enPath);
    if (isYaml(enPath)) {
      // Для YAML линтуются только текстовые значения (ключи и значения-
      // идентификаторы обязаны оставаться EN). detectUntranslated включён:
      // текстовые значения — переведённая проза с markdown-разметкой.
      try {
        lintText = yamlTextValues(parseYaml(ru)).join('\n\n');
        markdown = true;
        detectUntranslated = true;
      } catch {
        lintText = ''; // ошибки парсинга уже зафиксированы validateYamlPair
      }
    }
    const violations = lintGlossaryText(lintText, glossary, {
      file: ruPath ?? enPath,
      markdown,
      detectUntranslated,
    });
    errors.push(...violations.map((v) => v.message));
  }
  return errors;
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------

function collectLintFiles(paths) {
  const files = [];
  for (const p of paths) {
    const abs = resolve(ROOT, p);
    if (!existsSync(abs)) {
      console.error(`Путь не существует: ${p}`);
      process.exit(2);
    }
    const st = statSync(abs);
    if (st.isDirectory()) {
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else if (isMd(full) || isTs(full)) files.push(full);
        }
      };
      walk(abs);
    } else {
      files.push(abs);
    }
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const glossary = loadGlossary();

  if (args[0] === '--lint') {
    const files = collectLintFiles(args.slice(1));
    let failed = 0;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const rel = file.slice(ROOT.length + 1).split('\\').join('/');
      const violations = lintGlossaryText(text, glossary, {
        file: rel,
        markdown: isMd(file),
        detectUntranslated: isMd(file),
      });
      for (const v of violations) console.error(v.message);
      failed += violations.length;
    }
    if (failed > 0) {
      console.error(`Глоссарий-линт: ${failed} нарушений в ${files.length} файлах.`);
      process.exit(1);
    }
    console.log(`Глоссарий-линт: ${files.length} файлов, нарушений нет.`);
    return;
  }

  if (args[0] === '--all') {
    const manifest = readManifest();
    const upstream = readUpstream();
    const present = manifest.entries.filter((e) => existsSync(resolve(ROOT, e.ru)));
    let failed = 0;
    for (const entry of present) {
      const ru = readFileSync(resolve(ROOT, entry.ru), 'utf8');
      const en = await fetchBlob(upstream, entry.base_blob_sha);
      const errors = validatePair(en, ru, entry.en, { glossary, ruPath: entry.ru });
      if (errors.length > 0) {
        failed += errors.length;
        console.error(`✗ ${entry.ru}`);
        for (const e of errors) console.error(`    ${e}`);
      } else {
        console.log(`✓ ${entry.ru}`);
      }
    }
    if (failed > 0) {
      console.error(`validate:ru: ${failed} ошибок.`);
      process.exit(1);
    }
    console.log(`validate:ru: ${present.length} файлов валидны.`);
    return;
  }

  const [enFile, ruFile] = args;
  if (!enFile || !ruFile) {
    console.error('Использование: validate-translation.mjs <en> <ru> | --lint <пути...> | --all');
    process.exit(2);
  }
  const en = readFileSync(resolve(ROOT, enFile), 'utf8');
  const ru = readFileSync(resolve(ROOT, ruFile), 'utf8');
  const errors = validatePair(en, ru, enFile, { glossary, ruPath: ruFile });
  if (errors.length > 0) {
    console.error(`Валидация ${ruFile} не пройдена:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`Валидация ${ruFile} пройдена.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
