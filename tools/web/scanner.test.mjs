import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { REPO_ROOT } from '../apply/index.mjs';
import { scanOpenspecProject, summarizeTasksMarkdown } from './scanner.mjs';

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-scanner-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixture(root, relPath, content) {
  const abs = resolve(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return abs;
}

test('1.1 scanner: выбрасывает ошибку с кодом NO_OPENSPEC_DIR, если папки openspec/ нет', () => {
  withTempDir((dir) => {
    assert.throws(
      () => scanOpenspecProject(dir),
      (err) => {
        assert.equal(err.code, 'NO_OPENSPEC_DIR');
        assert.equal(err.exitCode, 1);
        assert.match(err.message, /openspec/i);
        return true;
      },
    );
  });
});

test('1.1 scanner: читает пустой черновик с .openspec.yaml, вложенные спецификации и архивные изменения с нормализацией путей /', () => {
  withTempDir((dir) => {
    mkdirSync(resolve(dir, 'openspec'), { recursive: true });

    // Основные спецификации (включая вложенный путь identity/user-auth)
    writeFixture(
      dir,
      'openspec/specs/auth-core/spec.md',
      '# auth-core\r\n\r\n## Purpose\r\nБазовая авторизация.\r\n\r\n## Requirements\r\n\r\n### Requirement: Вход по токену\r\nСистема SHALL проверять токен.\r\n',
    );
    writeFixture(
      dir,
      'openspec/specs/identity/user-auth/spec.md',
      '# user-auth\n\n## Purpose\nВложенная спецификация.\n',
    );

    // 1) Пустой черновик только с .openspec.yaml (без proposal.md и tasks.md)
    writeFixture(dir, 'openspec/changes/empty-draft/.openspec.yaml', 'schema: spec-driven\ncreated: 2026-10-29\n');

    // 2) Изменение в работе с вложенной дельта-спецификацией
    writeFixture(dir, 'openspec/changes/active-feature/.openspec.yaml', 'schema: spec-driven\n');
    writeFixture(dir, 'openspec/changes/active-feature/proposal.md', '# Предложение\n\nОписание фичи.\n');
    writeFixture(
      dir,
      'openspec/changes/active-feature/specs/identity/user-auth/spec.md',
      '## ADDED Requirements\n\n### Requirement: OAuth\nПоддержка OAuth.\n',
    );
    writeFixture(
      dir,
      'openspec/changes/active-feature/tasks.md',
      '## 1. Задачи\n\n- [x] 1.1 Первая задача\n- [ ] 1.2 Вторая задача\n',
    );

    // 3) Архивное изменение с префиксом даты
    writeFixture(
      dir,
      'openspec/changes/archive/2026-10-20-old-change/.openspec.yaml',
      'schema: spec-driven\n',
    );
    writeFixture(
      dir,
      'openspec/changes/archive/2026-10-20-old-change/proposal.md',
      '# Старое предложение\n',
    );
    writeFixture(
      dir,
      'openspec/changes/archive/2026-10-20-old-change/tasks.md',
      '## 1. Задачи\n\n- [x] 1.1 Готово\n',
    );

    // Посторонняя пустая папка без .openspec.yaml и артефактов должна игнорироваться
    mkdirSync(resolve(dir, 'openspec/changes/random-empty-folder'), { recursive: true });

    const state = scanOpenspecProject(dir);
    assert.equal(state.bundleVersion, 'v1.15.0');

    // Проверка спецификаций и POSIX-путей
    assert.deepEqual(
      state.specs.map((s) => s.cap),
      ['auth-core', 'identity/user-auth'],
    );
    for (const s of state.specs) {
      assert.equal(s.cap.includes('\\'), false, 'cap не должен содержать обратных слэшей');
      assert.equal(s.path.includes('\\'), false, 'path не должен содержать обратных слэшей');
      assert.equal(s.src.includes('\r'), false, 'CRLF должен быть нормализован в LF');
    }

    // Проверка изменений
    assert.equal(state.changes.length, 3);

    const draft = state.changes.find((c) => c.id === 'empty-draft');
    assert.ok(draft, 'Пустой черновик с .openspec.yaml должен присутствовать');
    assert.equal(draft.status, 'draft');
    assert.equal(draft.schema, 'spec-driven');
    assert.equal(draft.created, '2026-10-29');
    assert.equal(draft.files.proposal, null);
    assert.equal(draft.files.design, null);
    assert.equal(draft.files.tasks, null);
    assert.deepEqual(draft.specFiles, []);

    const active = state.changes.find((c) => c.id === 'active-feature');
    assert.ok(active);
    assert.equal(active.status, 'progress');
    assert.equal(active.done, 1);
    assert.equal(active.total, 2);
    assert.equal(active.pct, 50);
    assert.equal(active.dirPath, 'openspec/changes/active-feature');
    assert.equal(active.specFiles.length, 1);
    assert.equal(active.specFiles[0].cap, 'identity/user-auth');
    assert.equal(active.specFiles[0].path, 'openspec/changes/active-feature/specs/identity/user-auth/spec.md');

    const archived = state.changes.find((c) => c.id === 'old-change');
    assert.ok(archived);
    assert.equal(archived.status, 'archive');
    assert.equal(archived.archived, '2026-10-20');
    assert.equal(archived.folder, '2026-10-20-old-change');
    assert.equal(archived.dirPath, 'openspec/changes/archive/2026-10-20-old-change');
    assert.equal(archived.done, 1);
    assert.equal(archived.total, 1);
    assert.equal(archived.pct, 100);
  });
});

test('1.1 summarizeTasksMarkdown: корректно считает чекбоксы [ ], [x], [X]', () => {
  assert.deepEqual(summarizeTasksMarkdown(null), { done: 0, total: 0, pct: 0 });
  assert.deepEqual(
    summarizeTasksMarkdown('- [ ] 1.1 Первая\n- [x] 1.2 Вторая\n* [X] 1.3 Третья\n'),
    { done: 2, total: 3, pct: 67 },
  );
});

test('1.2 scanner на реальном репозитории openspec_ru: возвращает все основные спецификации и изменения (включая архив)', () => {
  const state = scanOpenspecProject(REPO_ROOT);

  assert.equal(state.repoName, 'openspec_ru');
  assert.equal(state.bundleVersion, 'v1.15.0');

  const specCaps = state.specs.map((s) => s.cap);
  assert.ok(specCaps.includes('upstream-version-tracking'));
  assert.ok(specCaps.includes('translation-glossary'));
  assert.ok(specCaps.includes('llm-translation-pipeline'));
  for (const s of state.specs) {
    assert.equal(s.cap.includes('\\'), false);
    assert.equal(s.path, `openspec/specs/${s.cap}/spec.md`);
    assert.match(s.src, /### Requirement:/);
  }

  const changeIds = state.changes.map((c) => c.id);
  assert.ok(changeIds.includes('openspec-ru-ui'), 'Должно быть активное изменение openspec-ru-ui');
  assert.ok(changeIds.includes('layer-1-ru'), 'Должно быть активное изменение layer-1-ru');
  assert.ok(
    changeIds.includes('bootstrap-ru-translation'),
    'Должно быть архивное изменение bootstrap-ru-translation',
  );
  assert.ok(
    changeIds.includes('translation-pipeline'),
    'Должно быть архивное изменение translation-pipeline',
  );

  const uiChange = state.changes.find((c) => c.id === 'openspec-ru-ui');
  assert.equal(uiChange.archived, null);
  assert.equal(uiChange.dirPath, 'openspec/changes/openspec-ru-ui');
  assert.ok(uiChange.files.proposal.includes('# Предложение'));
  assert.ok(uiChange.files.design.includes('# Дизайн'));
  assert.ok(uiChange.files.tasks.includes('# Задачи'));
  assert.deepEqual(
    uiChange.specFiles.map((f) => f.cap),
    ['web-ui-dashboard'],
  );

  const archivedBootstrap = state.changes.find((c) => c.id === 'bootstrap-ru-translation');
  assert.equal(archivedBootstrap.status, 'archive');
  assert.equal(archivedBootstrap.archived, '2026-10-28');
  assert.equal(
    archivedBootstrap.dirPath,
    'openspec/changes/archive/2026-10-28-bootstrap-ru-translation',
  );
});
