#!/usr/bin/env node
// Гейт выпуска релиза openspec-ru (design D2): согласованность версий,
// MAJOR.MINOR с апстримом, запись в CHANGELOG.md и разделы CONTRIBUTING.md.
//
// Использование: node tools/release-check.mjs [--tag vX.Y.Z]
// npm: npm run release:check -- --tag vX.Y.Z

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { majorMinor } from './apply/index.mjs';
import { ROOT } from './lib/manifest.mjs';

/**
 * Чистая проверка состояния релиза. Все данные передаются аргументами.
 *
 * @param {object} options
 * @param {{version: string}} options.packageJson       корневой package.json
 * @param {{version: string}} options.applyPackageJson  tools/apply/package.json
 * @param {{bundleVersion?: string}} options.bundleMeta dist-ru/bundle-meta.json
 * @param {{tag: string}} options.upstream              upstream.json
 * @param {string} options.changelog                    текст CHANGELOG.md
 * @param {string} options.contributing                 текст CONTRIBUTING.md
 * @param {string|null} [options.tag]                   проверяемый тег (например, v1.15.0)
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateReleaseState(options) {
  const errors = [];
  const version = options.packageJson.version;

  if (version !== options.applyPackageJson.version) {
    errors.push(
      `версии не совпадают: package.json (${version}) и tools/apply/package.json (${options.applyPackageJson.version})`,
    );
  }

  if (options.bundleMeta && options.bundleMeta.bundleVersion !== `v${version}`) {
    errors.push(
      `bundleVersion в dist-ru/bundle-meta.json (${options.bundleMeta.bundleVersion}) не равен v${version}`,
    );
  }

  const upstreamMM = majorMinor(options.upstream.tag);
  if (majorMinor(version) !== upstreamMM) {
    errors.push(
      `MAJOR.MINOR версии ${version} (${majorMinor(version)}) не совпадает с MAJOR.MINOR апстрима ${options.upstream.tag} (${upstreamMM})`,
    );
  }

  const hasSection = options.changelog
    .split(/\r?\n/)
    .some((line) => line.startsWith(`## [${version}]`));
  if (!hasSection) {
    errors.push(`в CHANGELOG.md нет секции «## [${version}]»`);
  }

  if (!/^#{1,6} .*CHANGELOG\.md/m.test(options.contributing)) {
    errors.push('в CONTRIBUTING.md нет раздела про CHANGELOG.md');
  }
  if (!/^#{1,6} .*MAJOR\.MINOR/m.test(options.contributing)) {
    errors.push('в CONTRIBUTING.md нет раздела про схему MAJOR.MINOR');
  }

  if (options.tag !== undefined && options.tag !== null && options.tag !== `v${version}`) {
    errors.push(`тег ${options.tag} не равен v${version}`);
  }

  return { ok: errors.length === 0, errors };
}

/** Читает состояние репозитория из каталога root. */
export function loadReleaseState(root = ROOT) {
  const readJson = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
  const readText = (rel) => (existsSync(resolve(root, rel)) ? readFileSync(resolve(root, rel), 'utf8') : '');
  return {
    packageJson: readJson('package.json'),
    applyPackageJson: readJson('tools/apply/package.json'),
    bundleMeta: readJson('dist-ru/bundle-meta.json'),
    upstream: readJson('upstream.json'),
    changelog: readText('CHANGELOG.md'),
    contributing: readText('CONTRIBUTING.md'),
  };
}

/** Разбирает аргументы CLI: поддерживаются `--tag vX.Y.Z` и `--tag=vX.Y.Z`. */
export function parseTagArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tag') return argv[i + 1] ?? null;
    if (argv[i].startsWith('--tag=')) return argv[i].slice('--tag='.length);
  }
  return undefined;
}

function main(argv) {
  const tag = parseTagArg(argv);
  const state = loadReleaseState();
  const { ok, errors } = validateReleaseState({ ...state, tag });
  if (!ok) {
    console.error('release-check: проверка не пройдена:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  const version = state.packageJson.version;
  console.log(`release-check: версия ${version} (апстрим ${state.upstream.tag}) — проверка пройдена${tag ? `, тег ${tag}` : ''}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}
