// Чтение/запись/валидация manifest.json — единственного источника правды
// о состоянии перевода каждого файла (см. design.md, решение D1).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const MANIFEST_PATH = resolve(ROOT, 'manifest.json');

export const STATUSES = ['pending', 'machine', 'reviewed'];
export const AREAS = ['templates', 'schemas', 'docs-lab', 'website', 'meta'];

const SHA_RE = /^[0-9a-f]{40}$/;

/**
 * Валидирует одну запись манифеста. Возвращает список ошибок (пустой = ок).
 * Запись: { en, ru, base_blob_sha, status, area, latest_blob_sha? }.
 */
export function validateEntry(entry) {
  const errors = [];
  if (typeof entry !== 'object' || entry === null) {
    return ['запись должна быть объектом'];
  }
  if (typeof entry.en !== 'string' || entry.en.length === 0) {
    errors.push('en: непустой строковый путь обязателен');
  }
  if (typeof entry.ru !== 'string' || entry.ru.length === 0) {
    errors.push('ru: непустой строковый путь обязателен');
  }
  if (typeof entry.base_blob_sha !== 'string' || !SHA_RE.test(entry.base_blob_sha)) {
    errors.push('base_blob_sha: требуется git blob sha (40 hex-символов)');
  }
  if (!STATUSES.includes(entry.status)) {
    errors.push(`status: должен быть одним из ${STATUSES.join(', ')}`);
  }
  if (!AREAS.includes(entry.area)) {
    errors.push(`area: должна быть одной из ${AREAS.join(', ')}`);
  }
  if (entry.latest_blob_sha !== undefined && !SHA_RE.test(entry.latest_blob_sha)) {
    errors.push('latest_blob_sha: если задан, должен быть git blob sha (40 hex-символов)');
  }
  return errors;
}

/**
 * Валидирует манифест целиком. Бросает Error с перечнем ошибок.
 * Формат: { upstream: { repo, tag, commit }, entries: [...] }.
 */
export function validateManifest(manifest) {
  const errors = [];
  if (typeof manifest !== 'object' || manifest === null) {
    errors.push('манифест должен быть объектом');
  } else {
    if (typeof manifest.upstream !== 'object' || manifest.upstream === null
      || typeof manifest.upstream.repo !== 'string'
      || typeof manifest.upstream.tag !== 'string'
      || typeof manifest.upstream.commit !== 'string') {
      errors.push('upstream: требуется { repo, tag, commit }');
    }
    if (!Array.isArray(manifest.entries)) {
      errors.push('entries: требуется массив записей');
    } else {
      const seen = new Set();
      manifest.entries.forEach((entry, i) => {
        for (const err of validateEntry(entry)) {
          errors.push(`entries[${i}] (${entry?.en ?? '?'}): ${err}`);
        }
        if (typeof entry?.en === 'string') {
          if (seen.has(entry.en)) errors.push(`entries[${i}]: дубликат en-пути ${entry.en}`);
          seen.add(entry.en);
        }
      });
    }
  }
  if (errors.length > 0) {
    throw new Error(`Невалидный манифест:\n  - ${errors.join('\n  - ')}`);
  }
  return manifest;
}

/** Читает и валидирует manifest.json. */
export function readManifest(path = MANIFEST_PATH) {
  const raw = readFileSync(path, 'utf8');
  return validateManifest(JSON.parse(raw));
}

/** Сериализует и записывает манифест (с валидацией перед записью). */
export function writeManifest(manifest, path = MANIFEST_PATH) {
  validateManifest(manifest);
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/**
 * Преобразует EN-путь в апстриме в RU-путь в дереве-зеркале ru/.
 * Корневые meta-файлы (README.md, install.md) ложатся в ru/meta/.
 */
export function ruPathFor(enPath) {
  if (enPath.startsWith('src/core/templates/')) return `ru/${enPath}`;
  if (enPath.startsWith('docs-lab/')) return `ru/${enPath}`;
  if (enPath.startsWith('schemas/')) return `ru/${enPath}`;
  if (enPath.startsWith('website/')) return `ru/website-strings/${enPath.slice('website/'.length)}`;
  return `ru/meta/${enPath}`;
}

/** Определяет зону (area) по EN-пути. */
export function areaFor(enPath) {
  if (enPath.startsWith('src/core/templates/')) return 'templates';
  if (enPath.startsWith('schemas/')) return 'schemas';
  if (enPath.startsWith('docs-lab/')) return 'docs-lab';
  if (enPath.startsWith('website/')) return 'website';
  return 'meta';
}

/** Корневые meta-файлы, включаемые в манифест. */
export const META_FILES = ['README.md', 'install.md'];

/**
 * Таблица зон с glob-паттернами переводческой поверхности (design D1).
 * Поддерживаемый подмножественный синтаксис glob: `*` (внутри сегмента),
 * `**` (любое число сегментов), `{a,b}` (альтернативы).
 */
export const ZONES = [
  { area: 'templates', patterns: ['src/core/templates/**/*.ts'] },
  { area: 'schemas', patterns: ['schemas/**/*.{yaml,yml,md}'] },
  { area: 'docs-lab', patterns: ['docs-lab/**/*.md'] },
  { area: 'website', patterns: ['website/{app,lib}/**/*.{ts,tsx}'] },
];

/** Компилирует glob-паттерн в RegExp (якоренный на весь путь). */
export function globToRegExp(glob) {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:[^/]+/)*';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end < 0) throw new Error(`glob: незакрытая '{' в паттерне ${glob}`);
      const alts = glob.slice(i + 1, end).split(',').map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      re += `(?:${alts.join('|')})`;
      i = end + 1;
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

const ZONE_REGEXES = ZONES.map((z) => ({
  area: z.area,
  regexes: z.patterns.map(globToRegExp),
}));

/** Входит ли путь дерева апстрима в переводческую поверхность. */
export function isTracked(enPath) {
  if (META_FILES.includes(enPath)) return true;
  return ZONE_REGEXES.some((z) => z.regexes.some((re) => re.test(enPath)));
}

/**
 * Идемпотентное слияние дерева апстрима с существующим манифестом (design D1):
 * существующие записи не трогаются (статусы, base_blob_sha, latest_blob_sha
 * сохраняются), добавляются только новые отслеживаемые EN-пути со статусом
 * pending. Возвращает { entries, added } — entries отсортирован по en.
 */
export function mergeSeedEntries(existingEntries, tree) {
  const known = new Set(existingEntries.map((e) => e.en));
  const added = [];
  for (const [path, sha] of [...tree.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!isTracked(path) || known.has(path)) continue;
    added.push({
      en: path,
      ru: ruPathFor(path),
      base_blob_sha: sha,
      status: 'pending',
      area: areaFor(path),
    });
  }
  const entries = [...existingEntries, ...added].sort((a, b) => a.en.localeCompare(b.en));
  return { entries, added };
}
