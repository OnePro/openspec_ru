import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib/manifest.mjs';
import { loadReleaseState, parseTagArg, validateReleaseState } from './release-check.mjs';

const CHANGELOG_OK = '# Журнал\n\n## [1.15.0] — 2026-10-29\n\n### Добавлено\n';
const CONTRIBUTING_OK = '# Вклад\n\n## Версионирование MAJOR.MINOR.PATCH\n\n## Ведение CHANGELOG.md\n';

function validState(overrides = {}) {
  return {
    packageJson: { version: '1.15.0' },
    applyPackageJson: { version: '1.15.0' },
    bundleMeta: { bundleVersion: 'v1.15.0' },
    upstream: { tag: 'v1.15.0' },
    changelog: CHANGELOG_OK,
    contributing: CONTRIBUTING_OK,
    tag: undefined,
    ...overrides,
  };
}

test('2.2 release-check: текущий репозиторий проходит проверку (с --tag v1.15.0)', () => {
  const state = loadReleaseState(ROOT);
  const res = validateReleaseState({ ...state, tag: 'v1.15.0' });
  assert.deepEqual(res.errors, []);
  assert.equal(res.ok, true);
});

test('2.2 release-check: валидное состояние без тега проходит', () => {
  assert.equal(validateReleaseState(validState()).ok, true);
});

test('2.2 release-check: разные версии в package.json и tools/apply/package.json -> ошибка', () => {
  const res = validateReleaseState(validState({ applyPackageJson: { version: '1.15.1' } }));
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /версии не совпадают/);
});

test('2.2 release-check: bundleVersion, не совпадающий с версией пакета -> ошибка', () => {
  const res = validateReleaseState(validState({ bundleMeta: { bundleVersion: 'v1.15.1' } }));
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /bundleVersion/);
});

test('2.2 release-check: MAJOR.MINOR не совпадает с upstream.json -> ошибка', () => {
  const res16 = validateReleaseState(validState({ packageJson: { version: '1.16.0' }, applyPackageJson: { version: '1.16.0' }, bundleMeta: { bundleVersion: 'v1.16.0' } }));
  assert.equal(res16.ok, false);
  assert.match(res16.errors.join('\n'), /MAJOR\.MINOR/);

  const res01 = validateReleaseState(validState({ packageJson: { version: '0.1.0' }, applyPackageJson: { version: '0.1.0' }, bundleMeta: { bundleVersion: 'v0.1.0' } }));
  assert.equal(res01.ok, false);
  assert.match(res01.errors.join('\n'), /MAJOR\.MINOR/);
});

test('2.2 release-check: PATCH внутри 1.15 допустим (1.15.3 при апстриме v1.15.0)', () => {
  const res = validateReleaseState(validState({ packageJson: { version: '1.15.3' }, applyPackageJson: { version: '1.15.3' }, bundleMeta: { bundleVersion: 'v1.15.3' } }));
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /нет секции «## \[1\.15\.3\]»/);
});

test('2.2 release-check: нет секции версии в CHANGELOG.md -> ошибка', () => {
  const res = validateReleaseState(validState({ changelog: '# Журнал\n\n## [1.14.0] — 2026-01-01\n' }));
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /нет секции «## \[1\.15\.0\]»/);
});

test('2.2 release-check: CONTRIBUTING.md без разделов про CHANGELOG.md и MAJOR.MINOR -> ошибка', () => {
  const res = validateReleaseState(validState({ contributing: '# Вклад\n\nТекст без разделов.\n' }));
  assert.equal(res.ok, false);
  assert.equal(res.errors.length, 2);
  assert.match(res.errors.join('\n'), /CHANGELOG\.md/);
  assert.match(res.errors.join('\n'), /MAJOR\.MINOR/);
});

test('2.2 release-check: --tag, не равный v<версии>, -> ошибка', () => {
  const res = validateReleaseState(validState({ tag: 'v1.15.1' }));
  assert.equal(res.ok, false);
  assert.match(res.errors.join('\n'), /тег v1\.15\.1 не равен v1\.15\.0/);
});

test('2.2 release-check: --tag v1.15.0 при версии 1.15.0 проходит', () => {
  assert.equal(validateReleaseState(validState({ tag: 'v1.15.0' })).ok, true);
});

test('2.2 release-check: parseTagArg читает --tag в обеих формах', () => {
  assert.equal(parseTagArg(['--tag', 'v1.15.0']), 'v1.15.0');
  assert.equal(parseTagArg(['--tag=v1.15.0']), 'v1.15.0');
  assert.equal(parseTagArg([]), undefined);
});

test('2.2 release-check: CHANGELOG.md и CONTRIBUTING.md в репозитории содержат нужные разделы', () => {
  const contributing = readFileSync(resolve(ROOT, 'CONTRIBUTING.md'), 'utf8');
  assert.match(contributing, /^#{1,6} .*CHANGELOG\.md/m);
  assert.match(contributing, /^#{1,6} .*MAJOR\.MINOR/m);
});
