// HTTP + SSE сервер веб-панели OpenSpec RU (design D1, D2).
// Только чтение openspec/: единственная запись — файл состояния процесса.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, watch, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanOpenspecProject } from './scanner.mjs';

const HOST = '127.0.0.1';
const UI_HTML_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'ui.html');
const DEFAULT_PORT = 3000;
const LAST_PORT = 3015;
const DEBOUNCE_MS = 200;
const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../apply/cli.mjs');
const DETACH_TIMEOUT_MS = 4000;
const DETACH_POLL_MS = 80;

function isDirectory(absPath) {
  try {
    return statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Путь к файлу состояния запущенного сервера для данного проекта.
 */
export function getStateFilePath(projectDir) {
  const root = resolve(projectDir);
  if (isDirectory(resolve(root, '.git'))) {
    return resolve(root, '.git/openspec-ru-web.json');
  }
  const hash = createHash('sha1').update(root).digest('hex').slice(0, 12);
  return resolve(os.tmpdir(), `openspec-ru-web-${hash}.json`);
}

function removeFile(absPath) {
  try {
    unlinkSync(absPath);
  } catch {
    // Файла уже нет
  }
}

function sendText(res, status, contentType, body) {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function sendJson(res, status, data, onFinish) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body, onFinish);
}

function listenOn(server, port) {
  return new Promise((resolvePromise, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolvePromise(server.address().port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, HOST);
  });
}

async function listenWithPort(server, requestedPort) {
  if (requestedPort !== undefined) {
    return listenOn(server, requestedPort);
  }
  for (let port = DEFAULT_PORT; port <= LAST_PORT; port++) {
    try {
      return await listenOn(server, port);
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
    }
  }
  throw new Error(`Не удалось занять свободный порт в диапазоне ${DEFAULT_PORT}–${LAST_PORT}.`);
}

function openInBrowser(url) {
  let command;
  let args;
  if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsVerbatimArguments: process.platform === 'win32',
    });
    child.on('error', () => {});
    child.unref();
  } catch {
    // Открытие браузера необязательно
  }
}

/**
 * Запускает веб-панель для проекта. Бросает ошибку с `code` и `exitCode`,
 * если в проекте нет каталога openspec/.
 *
 * @param {string} projectDir
 * @param {object} [options]
 * @param {number} [options.port] Явный порт (0 — любой свободный)
 * @param {boolean} [options.openBrowser=true] Открыть браузер
 */
export async function startWebServer(projectDir, options = {}) {
  const root = resolve(projectDir);
  // Бросает NO_OPENSPEC_DIR (exitCode 1), если openspec/ отсутствует
  scanOpenspecProject(root);

  const openspecDir = resolve(root, 'openspec');
  const clients = new Set();
  let watcher = null;
  let debounceTimer = null;
  let closePromise = null;

  const broadcastUpdate = () => {
    const payload = `event: update\ndata: {"ts":${Date.now()}}\n\n`;
    for (const client of clients) client.write(payload);
  };

  const scheduleUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(broadcastUpdate, DEBOUNCE_MS);
  };

  const handleRequest = (req, res) => {
    const pathname = new URL(req.url ?? '/', `http://${HOST}`).pathname;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      sendText(res, 200, 'text/html; charset=utf-8', readFileSync(UI_HTML_PATH, 'utf8'));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/state') {
      try {
        sendJson(res, 200, scanOpenspecProject(root));
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/shutdown') {
      sendJson(res, 200, { ok: true }, () => {
        void close();
      });
      return;
    }

    sendText(res, 404, 'text/plain; charset=utf-8', 'Not found');
  };

  const server = createServer(handleRequest);
  const port = await listenWithPort(server, options.port);
  const url = `http://localhost:${port}`;
  const stateFile = getStateFilePath(root);

  try {
    watcher = watch(openspecDir, { recursive: true }, scheduleUpdate);
    watcher.on('error', () => {});
  } catch {
    watcher = null;
  }

  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(
    stateFile,
    `${JSON.stringify(
      {
        pid: process.pid,
        port,
        host: HOST,
        projectDir: root,
        url,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const close = () => {
    if (!closePromise) {
      closePromise = (async () => {
        clearTimeout(debounceTimer);
        if (watcher) watcher.close();
        for (const client of clients) client.end();
        clients.clear();
        const closed = new Promise((resolveClose) => server.close(() => resolveClose()));
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
        await closed;
        removeFile(stateFile);
      })();
    }
    return closePromise;
  };

  if (options.openBrowser !== false) {
    openInBrowser(url);
  }

  return { server, port, url, stateFile, close };
}

function readStateFile(stateFile) {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Проверяет, что по адресу состояния отвечает веб-панель (GET /api/state → 200).
 */
async function isServerAlive(port) {
  try {
    const res = await fetch(`http://${HOST}:${port}/api/state`, { signal: AbortSignal.timeout(500) });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Запускает веб-панель в отвязанном фоновом процессе и ждёт готовности по state-файлу.
 * Если сервер для проекта уже жив, возвращает его данные без повторного запуска.
 *
 * @param {string} projectDir
 * @param {object} [options]
 * @param {number} [options.port] Явный порт (0 — любой свободный)
 * @param {boolean} [options.openBrowser=true] Открыть браузер
 */
export async function startDetachedWebServer(projectDir, options = {}) {
  const root = resolve(projectDir);
  // Бросает NO_OPENSPEC_DIR (exitCode 1), если openspec/ отсутствует
  scanOpenspecProject(root);

  const stateFile = getStateFilePath(root);
  const previous = readStateFile(stateFile);
  if (previous?.port && (await isServerAlive(previous.port))) {
    return {
      alreadyRunning: true,
      port: previous.port,
      pid: previous.pid,
      url: previous.url || `http://localhost:${previous.port}`,
      stateFile,
    };
  }
  removeFile(stateFile);

  const args = [
    CLI_PATH,
    'start',
    'web',
    root,
    ...(options.port !== undefined ? ['--port', String(options.port)] : []),
    ...(options.openBrowser === false ? ['--no-open'] : []),
  ];
  const child = spawn(process.execPath, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => {});
  child.unref();

  const deadline = Date.now() + DETACH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = readStateFile(stateFile);
    if (state?.port && (await isServerAlive(state.port))) {
      return {
        alreadyRunning: false,
        port: state.port,
        pid: state.pid,
        url: state.url,
        stateFile,
      };
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, DETACH_POLL_MS));
  }
  const err = new Error('Фоновый веб-сервер OpenSpec RU не ответил в отведённое время.');
  err.exitCode = 1;
  throw err;
}

/**
 * Останавливает веб-панель, запущенную для проекта, через POST /api/shutdown.
 */
export async function stopWebServer(projectDir) {
  const stateFile = getStateFilePath(projectDir);
  const notFound = {
    ok: false,
    exitCode: 1,
    message: 'Запущенный веб-сервер OpenSpec RU в этом репозитории не найден.',
  };
  if (!existsSync(stateFile)) return notFound;

  let state;
  try {
    state = JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    state = null;
  }
  if (!state?.port) {
    removeFile(stateFile);
    return notFound;
  }

  await fetch(`http://${HOST}:${state.port}/api/shutdown`, { method: 'POST' }).catch(() => {});
  removeFile(stateFile);
  return {
    ok: true,
    exitCode: 0,
    port: state.port,
    pid: state.pid,
    message: `Веб-сервер OpenSpec RU (порт ${state.port}) остановлен.`,
  };
}
