#!/usr/bin/env node
// CLI патчера openspec-ru.
// Использование:
//   openspec-ru apply [targetDir] [--dry-run]
//   openspec-ru start web [targetDir] [--port <port>] [--no-open]
//   openspec-ru stop web [targetDir]
//   node tools/apply/cli.mjs apply [targetDir] [--dry-run]
//   node tools/apply/ apply [targetDir] [--dry-run]

import { existsSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { TOOL_IDS } from '../lib/tool-layouts.mjs';
import { applyRuPatch, detectInstalledOpenspecVersion, readBundleMeta } from './index.mjs';
import { startWebServer, stopWebServer } from '../web/server.mjs';

const WEB_COMMANDS = new Set(['start', 'stop', 'ui']);

export function formatHelp(meta) {
  const tag = meta?.upstream?.tag ?? 'v1.15.0';
  return [
    `openspec-ru — патчер русскоязычных AI-артефактов OpenSpec (бандл ${tag})`,
    '',
    'Использование:',
    '  openspec-ru init [аргументы openspec init...]',
    '  openspec-ru update [каталог-проекта] [опции]',
    '  openspec-ru apply [каталог-проекта] [опции]',
    '  npx --yes github:OnePro/openspec_ru#main update',
    '',
    'Команды:',
    '  init [...]        Выполнить openspec init (только если в папке инициализирован Git) и сразу накатить RU-патч',
    '  update [каталог]  Выполнить штатный openspec update и поверх применить свежий RU-бандл',
    '  apply [каталог]   Перезаписать установленные OpenSpec skills и команды русскими версиями',
    '                    (требует инициализированный Git и выполненный openspec init)',
    '  start web [каталог] [--port 3000] [--no-open]',
    '                    Запустить веб-панель изменений и спецификаций (алиас: ui)',
    '  stop web [каталог]',
    '                    Остановить веб-панель, запущенную для этого репозитория (алиас: ui --stop)',
    '',
    'Опции:',
    '  -n, --dry-run     Показать, какие файлы были бы обновлены, без записи на диск',
    '  -f, --force       Передать --force в штатный openspec update (для команды update)',
    '  --port <порт>     Порт веб-панели (по умолчанию 3000, при занятости — до 3015)',
    '  --no-open         Не открывать браузер при запуске веб-панели',
    '  --stop            Остановить веб-панель (для команды ui)',
    '  -v, --version     Вывести версию бандла',
    '  -h, --help        Показать эту справку',
    '',
    `Поддерживаемые инструменты (топ-5): ${TOOL_IDS.join(', ')}`,
  ].join('\n');
}

/**
 * Команды `start web`, `stop web` и `ui`. Возвращает Promise с кодом выхода;
 * для `start web` промис завершается после остановки сервера.
 */
async function runWebCommand(argv, io) {
  const command = argv[0];
  let stop = command === 'stop';
  let openBrowser = true;
  let port;
  const positionals = [];

  const args = argv.slice(1);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-open') {
      openBrowser = false;
    } else if (arg === '--stop') {
      stop = true;
    } else if (arg === '--port' || arg.startsWith('--port=')) {
      const raw = arg === '--port' ? args[++i] : arg.slice('--port='.length);
      port = Number(raw);
      if (!Number.isInteger(port) || port < 0 || port > 65535 || raw === undefined || raw === '') {
        io.stderr.write(`Некорректный порт: ${raw ?? '(не указан)'}\n`);
        return 1;
      }
    } else if (arg.startsWith('-')) {
      io.stderr.write(`Неизвестный флаг: ${arg}\n`);
      return 1;
    } else {
      positionals.push(arg);
    }
  }

  if (command !== 'ui') {
    if (positionals[0] !== 'web') {
      io.stderr.write(`Укажите подкоманду: openspec-ru ${command} web\n`);
      return 1;
    }
    positionals.shift();
  }

  const targetDir = resolve(positionals[0] ?? process.cwd());

  if (stop) {
    const result = await stopWebServer(targetDir);
    (result.ok ? io.stdout : io.stderr).write(`${result.message}\n`);
    return result.exitCode;
  }

  let web;
  try {
    web = await startWebServer(targetDir, { port, openBrowser });
  } catch (err) {
    io.stderr.write(`${err.message}\n`);
    return err.exitCode ?? 1;
  }

  io.stdout.write(`OpenSpec RU UI запущен: ${web.url}\n`);
  io.stdout.write('Остановка: Ctrl+C, кнопка в интерфейсе или команда openspec-ru stop web\n');

  return new Promise((resolveRun) => {
    const onSignal = () => {
      void web.close();
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    web.server.once('close', () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      resolveRun(0);
    });
  });
}

export function runCli(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  let meta = null;
  try {
    meta = readBundleMeta();
  } catch {
    // Метаданные могут отсутствовать только при повреждённом бандле
  }

  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout.write(`${formatHelp(meta)}\n`);
    return 0;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    const tag = meta?.upstream?.tag ?? 'unknown';
    const ver = meta?.openspecVersion ?? 'unknown';
    io.stdout.write(`openspec-ru (бандл ${tag}, OpenSpec ${ver})\n`);
    return 0;
  }

  if (WEB_COMMANDS.has(argv[0])) {
    return runWebCommand(argv, io);
  }

  if (argv[0] === 'init') {
    const initArgs = argv.slice(1);
    const nonFlagArgs = initArgs.filter((a, i) => !a.startsWith('-') && initArgs[i - 1] !== '--tools' && initArgs[i - 1] !== '--language' && initArgs[i - 1] !== '--profile');
    const targetDir = nonFlagArgs[0] ? resolve(nonFlagArgs[0]) : process.cwd();
    if (!existsSync(resolve(targetDir, '.git'))) {
      io.stderr.write(
        'В каталоге не инициализирован Git (.git не найден). Выполнение «openspec init» заблокировано — сначала выполните «git init» в корне проекта.\n',
      );
      return 1;
    }
    const initRes = spawnSync('openspec', ['init', ...initArgs], {
      cwd: targetDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (initRes.status !== 0) {
      return initRes.status ?? 1;
    }
    const patchRes = applyRuPatch(targetDir, { dryRun: false });
    if (patchRes.ok) {
      io.stdout.write(`${patchRes.report}\n`);
    } else {
      io.stderr.write(`${patchRes.report}\n`);
    }
    return patchRes.exitCode;
  }

  if (argv[0] === 'update') {
    let dryRun = false;
    let force = false;
    const positionals = [];
    for (const arg of argv.slice(1)) {
      if (arg === '--dry-run' || arg === '-n') {
        dryRun = true;
      } else if (arg === '--force' || arg === '-f') {
        force = true;
      } else if (arg.startsWith('-')) {
        io.stderr.write(`Неизвестный флаг: ${arg}\n\n${formatHelp(meta)}\n`);
        return 1;
      } else {
        positionals.push(arg);
      }
    }
    const targetDir = positionals[0] ? resolve(positionals[0]) : process.cwd();
    if (!existsSync(resolve(targetDir, '.git'))) {
      io.stderr.write(
        'В каталоге не инициализирован Git (.git не найден). Обновление заблокировано — запускайте команду только в корне Git-репозитория.\n',
      );
      return 1;
    }
    if (!existsSync(resolve(targetDir, 'openspec'))) {
      io.stderr.write(
        'В проекте не найден каталог openspec/. Сначала выполните «npx github:OnePro/openspec_ru init».\n',
      );
      return 1;
    }
    if (!dryRun && detectInstalledOpenspecVersion()) {
      const updateArgs = ['update'];
      if (force) updateArgs.push('--force');
      const updateRes = spawnSync('openspec', updateArgs, {
        cwd: targetDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      if (updateRes.status !== 0) {
        return updateRes.status ?? 1;
      }
    }
    const patchRes = applyRuPatch(targetDir, { dryRun });
    if (patchRes.ok) {
      io.stdout.write(`${patchRes.report}\n`);
    } else {
      io.stderr.write(`${patchRes.report}\n`);
    }
    return patchRes.exitCode;
  }

  let dryRun = false;
  const positionals = [];

  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '-n') {
      dryRun = true;
    } else if (arg.startsWith('-')) {
      io.stderr.write(`Неизвестный флаг: ${arg}\n\n${formatHelp(meta)}\n`);
      return 1;
    } else {
      positionals.push(arg);
    }
  }

  let targetDir = process.cwd();
  if (positionals.length > 0) {
    if (positionals[0] === 'apply') {
      if (positionals[1]) targetDir = resolve(positionals[1]);
    } else {
      targetDir = resolve(positionals[0]);
    }
  }

  const result = applyRuPatch(targetDir, { dryRun });
  if (result.ok) {
    io.stdout.write(`${result.report}\n`);
  } else {
    io.stderr.write(`${result.report}\n`);
  }
  return result.exitCode;
}

function isCliMain() {
  if (!process.argv[1]) return false;
  const selfFile = fileURLToPath(import.meta.url);
  const selfDir = dirname(selfFile);
  const argPath = resolve(process.argv[1]);
  if (argPath === selfFile || argPath === selfDir) return true;
  try {
    const realArg = realpathSync(argPath);
    const realSelf = realpathSync(selfFile);
    return realArg === realSelf || realArg === dirname(realSelf);
  } catch {
    return false;
  }
}

if (isCliMain()) {
  Promise.resolve(runCli(process.argv.slice(2))).then((code) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  });
}

