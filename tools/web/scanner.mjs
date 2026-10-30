// Сканер каталога openspec/ для веб-панели OpenSpec RU (design D1).
// Работает строго в режиме только чтения: никогда не изменяет файлы в openspec/.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, posix, resolve } from 'node:path';
import { DEFAULT_BUNDLE_DIR, readBundleMeta } from '../apply/index.mjs';
import { parseYaml } from '../lib/yaml.mjs';

const ARCHIVE_FOLDER_RE = /^(\d{4}-\d{2}-\d{2})-(.+)$/;

function isDir(absPath) {
  try {
    return statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(absPath) {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function readUtf8OrNull(absPath) {
  if (!isFile(absPath)) return null;
  return readFileSync(absPath, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Рекурсивно находит все файлы `spec.md` внутри `specsRootDir`
 * и возвращает отсортированный массив `{ cap, path, src }`,
 * где `cap` всегда нормализован через POSIX `/`.
 */
export function scanSpecFiles(specsRootDir, pathPrefix = 'openspec/specs') {
  if (!isDir(specsRootDir)) return [];
  const results = [];

  function walk(relParts) {
    const currentAbs = resolve(specsRootDir, ...relParts);
    let entries;
    try {
      entries = readdirSync(currentAbs).sort();
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const entryAbs = resolve(currentAbs, entry);
      if (isDir(entryAbs)) {
        walk([...relParts, entry]);
      } else if (entry === 'spec.md' && relParts.length > 0 && isFile(entryAbs)) {
        const cap = relParts.join('/').replace(/\\/g, '/');
        const relFilePath = posix.join(pathPrefix.replace(/\\/g, '/'), cap, 'spec.md');
        const src = readFileSync(entryAbs, 'utf8').replace(/\r\n/g, '\n');
        results.push({ cap, path: relFilePath, src });
      }
    }
  }

  walk([]);
  return results.sort((a, b) => a.cap.localeCompare(b.cap));
}

/**
 * Подсчитывает выполненные и общие задачи из содержимого `tasks.md`.
 */
export function summarizeTasksMarkdown(tasksSrc) {
  if (!tasksSrc) {
    return { done: 0, total: 0, pct: 0 };
  }
  let total = 0;
  let done = 0;
  for (const line of tasksSrc.split('\n')) {
    const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+/);
    if (m) {
      total++;
      if (m[1] !== ' ') done++;
    }
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

/**
 * Читает метаданные `.openspec.yaml` внутри папки изменения.
 */
function readChangeMeta(changeDirAbs) {
  const metaAbs = resolve(changeDirAbs, '.openspec.yaml');
  if (!isFile(metaAbs)) {
    return { hasMetaFile: false, schema: 'spec-driven', created: null };
  }
  const raw = readFileSync(metaAbs, 'utf8');
  try {
    const parsed = parseYaml(raw);
    const schema =
      parsed && typeof parsed === 'object' && typeof parsed.schema === 'string' && parsed.schema.trim()
        ? parsed.schema.trim()
        : 'spec-driven';
    const created =
      parsed && typeof parsed === 'object' && parsed.created !== undefined && parsed.created !== null
        ? String(parsed.created).trim()
        : null;
    return { hasMetaFile: true, schema, created };
  } catch {
    const schemaMatch = raw.match(/^schema:\s*([^\r\n#]+)/m);
    const createdMatch = raw.match(/^created:\s*([^\r\n#]+)/m);
    return {
      hasMetaFile: true,
      schema: schemaMatch ? schemaMatch[1].trim() : 'spec-driven',
      created: createdMatch ? createdMatch[1].trim() : null,
    };
  }
}

/**
 * Читает одну папку изменения (активную или архивную).
 * Возвращает `null`, если папка не содержит ни `.openspec.yaml`, ни артефактов OpenSpec.
 */
function readChangeDirectory(changeDirAbs, folderName, { isArchive = false, usedIds = new Set() } = {}) {
  const meta = readChangeMeta(changeDirAbs);
  const proposal = readUtf8OrNull(resolve(changeDirAbs, 'proposal.md'));
  const design = readUtf8OrNull(resolve(changeDirAbs, 'design.md'));
  const tasks = readUtf8OrNull(resolve(changeDirAbs, 'tasks.md'));
  const specsDirAbs = resolve(changeDirAbs, 'specs');
  const hasSpecsDir = isDir(specsDirAbs);

  const dirPath = isArchive
    ? posix.join('openspec/changes/archive', folderName.replace(/\\/g, '/'))
    : posix.join('openspec/changes', folderName.replace(/\\/g, '/'));

  const specFiles = scanSpecFiles(specsDirAbs, posix.join(dirPath, 'specs'));

  const isChangeFolder =
    meta.hasMetaFile ||
    proposal !== null ||
    design !== null ||
    tasks !== null ||
    hasSpecsDir ||
    specFiles.length > 0;

  if (!isChangeFolder) return null;

  let id = folderName;
  let archived = null;

  if (isArchive) {
    const m = folderName.match(ARCHIVE_FOLDER_RE);
    if (m) {
      archived = m[1];
      const canonical = m[2];
      id = usedIds.has(canonical) ? folderName : canonical;
    } else {
      archived = 'archive';
    }
  }

  usedIds.add(id);

  const { done, total, pct } = summarizeTasksMarkdown(tasks);
  const status = archived
    ? 'archive'
    : !tasks
      ? 'draft'
      : done === 0
        ? 'todo'
        : done < total
          ? 'progress'
          : 'done';

  return {
    id,
    folder: folderName,
    dirPath,
    schema: meta.schema,
    created: meta.created,
    archived,
    status,
    done,
    total,
    pct,
    files: {
      proposal,
      design,
      tasks,
    },
    specs: specFiles.map((s) => s.cap),
    specFiles,
  };
}

/**
 * Сканирует проект OpenSpec и возвращает полный снимок состояния для веб-панели.
 *
 * @param {string} projectDir Путь к корню проекта
 * @param {object} [options]
 * @param {string} [options.bundleDir] Путь к каталогу dist-ru
 */
export function scanOpenspecProject(projectDir, options = {}) {
  const targetDir = resolve(projectDir ?? process.cwd());
  const openspecDir = resolve(targetDir, 'openspec');

  if (!isDir(openspecDir)) {
    const err = new Error(
      'В текущем каталоге не найден проект OpenSpec (папка openspec/ отсутствует). Сначала инициализируйте проект: npx github:OnePro/openspec_ru init',
    );
    err.code = 'NO_OPENSPEC_DIR';
    err.exitCode = 1;
    throw err;
  }

  let bundleVersion = 'v1.15.0';
  try {
    const meta = readBundleMeta(options.bundleDir ?? DEFAULT_BUNDLE_DIR);
    bundleVersion = meta?.upstream?.tag ?? (meta?.openspecVersion ? `v${meta.openspecVersion}` : 'v1.15.0');
  } catch {
    // Используем дефолтную версию, если метаданные бандла недоступны
  }

  const repoName = basename(targetDir) || 'openspec';
  const specs = scanSpecFiles(resolve(openspecDir, 'specs'), 'openspec/specs');

  const changesDir = resolve(openspecDir, 'changes');
  const changes = [];
  const usedIds = new Set();

  if (isDir(changesDir)) {
    const entries = readdirSync(changesDir).sort();
    for (const entry of entries) {
      if (entry === 'archive' || entry.startsWith('.')) continue;
      const entryAbs = resolve(changesDir, entry);
      if (!isDir(entryAbs)) continue;
      const item = readChangeDirectory(entryAbs, entry, { isArchive: false, usedIds });
      if (item) changes.push(item);
    }

    const archiveDir = resolve(changesDir, 'archive');
    if (isDir(archiveDir)) {
      const archiveEntries = readdirSync(archiveDir).sort().reverse();
      for (const entry of archiveEntries) {
        if (entry.startsWith('.')) continue;
        const entryAbs = resolve(archiveDir, entry);
        if (!isDir(entryAbs)) continue;
        const item = readChangeDirectory(entryAbs, entry, { isArchive: true, usedIds });
        if (item) changes.push(item);
      }
    }
  }

  return {
    repoName,
    bundleVersion,
    changes,
    specs,
  };
}
