#!/usr/bin/env node
// CLI патчера openspec-ru.
// Использование:
//   openspec-ru apply [targetDir] [--dry-run]
//   node tools/apply/cli.mjs apply [targetDir] [--dry-run]
//   node tools/apply/ apply [targetDir] [--dry-run]

import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_IDS } from '../lib/tool-layouts.mjs';
import { applyRuPatch, readBundleMeta } from './index.mjs';

export function formatHelp(meta) {
  const tag = meta?.upstream?.tag ?? 'v1.15.0';
  return [
    `openspec-ru — патчер русскоязычных AI-артефактов OpenSpec (бандл ${tag})`,
    '',
    'Использование:',
    '  openspec-ru apply [каталог-проекта] [опции]',
    '  npx github:OnePro/openspec_ru apply [каталог-проекта] [опции]',
    '',
    'Команды:',
    '  apply [каталог]   Перезаписать установленные OpenSpec skills и команды русскими версиями',
    '                    (по умолчанию — текущий рабочий каталог)',
    '',
    'Опции:',
    '  -n, --dry-run     Показать, какие файлы были бы обновлены, без записи на диск',
    '  -v, --version     Вывести версию бандла',
    '  -h, --help        Показать эту справку',
    '',
    `Поддерживаемые инструменты (топ-5): ${TOOL_IDS.join(', ')}`,
  ].join('\n');
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
  const code = runCli(process.argv.slice(2));
  if (code !== 0) {
    process.exitCode = code;
  }
}

