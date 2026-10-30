import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStateFilePath, startWebServer, stopWebServer } from './server.mjs';

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../apply/cli.mjs');

function withTempProject(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-web-'));
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }));
}

function writeFixture(root, relPath, content) {
  const abs = resolve(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return abs;
}

function createOpenspecFixture(root) {
  writeFixture(
    root,
    'openspec/specs/project-patcher/spec.md',
    '# project-patcher\n\n## Purpose\n\nПатчер проектов пользователя.\n\n## Requirements\n\n### Requirement: Идемпотентность\n\nПовторный запуск SHALL NOT менять файлы.\n\n#### Scenario: Повторный запуск\n\n- **WHEN** патчер запускается второй раз\n- **THEN** файлы не меняются\n',
  );
  writeFixture(root, 'openspec/specs/nested/cap/spec.md', '# nested-cap\n\n## Purpose\n\nВложенная спецификация.\n');
  writeFixture(root, 'openspec/changes/draft-change/proposal.md', '## Зачем\n\nЧерновик без задач.\n');
}

const baseUrl = (port) => `http://127.0.0.1:${port}`;

test('4.1: start web в каталоге без openspec/ завершается кодом 1 и не создаёт state-файл', async () => {
  await withTempProject((dir) => {
    const result = spawnSync(process.execPath, [CLI_PATH, 'start', 'web', dir, '--no-open'], {
      encoding: 'utf8',
      timeout: 20000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /openspec/);
    assert.equal(existsSync(getStateFilePath(dir)), false);
  });
});

test('4.1: GET / отдаёт HTML, GET /api/state отдаёт черновик без tasks.md и вложенные спецификации', async () => {
  await withTempProject(async (dir) => {
    createOpenspecFixture(dir);
    const web = await startWebServer(dir, { port: 0, openBrowser: false });
    try {
      assert.equal(existsSync(web.stateFile), true);
      const state = JSON.parse(readFileSync(web.stateFile, 'utf8'));
      assert.equal(state.port, web.port);

      const html = await fetch(`${baseUrl(web.port)}/`);
      assert.equal(html.status, 200);
      assert.equal(html.headers.get('content-type'), 'text/html; charset=utf-8');
      assert.match(await html.text(), /<title>OpenSpec RU/);

      const res = await fetch(`${baseUrl(web.port)}/api/state`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
      const snapshot = await res.json();

      const draft = snapshot.changes.find((c) => c.id === 'draft-change');
      assert.equal(draft.status, 'draft');
      assert.equal(draft.files.tasks, null);

      const nested = snapshot.specs.find((s) => s.cap === 'nested/cap');
      assert.equal(nested.path, 'openspec/specs/nested/cap/spec.md');

      const patcher = snapshot.specs.find((s) => s.cap === 'project-patcher');
      assert.match(patcher.src, /Патчер проектов пользователя/);
    } finally {
      await web.close();
    }
  });
});

test('4.1: GET /api/events шлёт event: update при изменении файла в openspec/', { timeout: 15000 }, async () => {
  await withTempProject(async (dir) => {
    createOpenspecFixture(dir);
    const web = await startWebServer(dir, { port: 0, openBrowser: false });
    const controller = new AbortController();
    try {
      const res = await fetch(`${baseUrl(web.port)}/api/events`, { signal: controller.signal });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'text/event-stream; charset=utf-8');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const readUntil = async (needle) => {
        while (!buffer.includes(needle)) {
          const { value, done } = await reader.read();
          if (done) throw new Error(`SSE закрыт до получения «${needle}»`);
          buffer += decoder.decode(value, { stream: true });
        }
      };

      await readUntil(': connected');
      writeFixture(dir, 'openspec/changes/draft-change/proposal.md', '## Зачем\n\nОбновлённый черновик.\n');
      await readUntil('event: update');
      assert.match(buffer, /event: update\ndata: \{"ts":\d+\}/);
    } finally {
      controller.abort();
      await web.close();
    }
  });
});

test('4.1: stopWebServer останавливает сервер и удаляет state-файл', async () => {
  await withTempProject(async (dir) => {
    createOpenspecFixture(dir);
    const web = await startWebServer(dir, { port: 0, openBrowser: false });
    try {
      const closed = once(web.server, 'close');
      const result = await stopWebServer(dir);
      assert.equal(result.ok, true);
      assert.equal(result.exitCode, 0);
      assert.equal(result.port, web.port);
      await closed;
      assert.equal(existsSync(web.stateFile), false);

      const again = await stopWebServer(dir);
      assert.equal(again.ok, false);
      assert.equal(again.exitCode, 1);
    } finally {
      await web.close();
    }
  });
});

test('4.1: POST /api/shutdown закрывает сервер и удаляет state-файл', async () => {
  await withTempProject(async (dir) => {
    createOpenspecFixture(dir);
    const web = await startWebServer(dir, { port: 0, openBrowser: false });
    try {
      const closed = once(web.server, 'close');
      const res = await fetch(`${baseUrl(web.port)}/api/shutdown`, { method: 'POST' });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
      await closed;
      assert.equal(existsSync(web.stateFile), false);
    } finally {
      await web.close();
    }
  });
});
