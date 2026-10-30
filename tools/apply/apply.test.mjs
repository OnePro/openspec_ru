import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  DEFAULT_BUNDLE_DIR,
  REPO_ROOT,
  applyRuPatch,
  detectUnsupportedTools,
  installGlobalCliShim,
  readBundleMeta,
  replaceBetweenMarkers,
} from './index.mjs';
import { runCli } from './cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, 'cli.mjs');
const DIR_PATH = resolve(__dirname);
const CYRILLIC = /[А-Яа-яЁё]/;

function withTempDir(fn, { initGit = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-apply-'));
  try {
    if (initGit) {
      mkdirSync(resolve(dir, '.git'), { recursive: true });
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixtureFile(root, relPath, content) {
  const abs = resolve(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return abs;
}

function extractFrontmatterName(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (!m) return null;
  const nameLine = m[0].match(/^name:\s*(.+)$/m);
  return nameLine ? nameLine[1].trim() : null;
}

function invokeNodeCli(entryPath, args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [entryPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, OPENSPEC_RU_OFFLINE: '1' },
  });
}

test('4.1 unit: детект по артефактам для каждого из топ-5 инструментов и частичный набор файлов', () => {
  withTempDir((dir) => {
    // Кладём по одному EN-артефакту для каждого из топ-5 инструментов
    writeFixtureFile(dir, '.claude/skills/openspec-explore/SKILL.md', '---\nname: openspec-explore\n---\nEN skill\n');
    writeFixtureFile(dir, '.claude/commands/opsx/explore.md', '---\nname: "OPSX: Explore"\n---\nEN command\n');
    writeFixtureFile(dir, '.cursor/commands/opsx-apply.md', '---\nname: /opsx-apply\n---\nEN cursor cmd\n');
    writeFixtureFile(dir, '.github/prompts/opsx-new.prompt.md', '---\ndescription: EN\n---\nEN copilot\n');
    writeFixtureFile(dir, '.agents/skills/openspec-propose/SKILL.md', '---\nname: openspec-propose\n---\nEN codex\n');
    writeFixtureFile(dir, '.gemini/commands/opsx/verify.toml', 'description = "EN"\nprompt = "EN"\n');

    const res = applyRuPatch(dir, { openspecVersion: '1.15.0' });
    assert.equal(res.ok, true);
    assert.equal(res.exitCode, 0);
    assert.equal(res.bundleVersion, 'v1.15.0');
    assert.equal(res.versionMismatch, null);
    assert.deepEqual(
      res.detectedTools.map((t) => t.id),
      ['claude', 'cursor', 'github-copilot', 'codex', 'gemini'],
    );
    assert.equal(res.totalUpdated, 6);
    assert.equal(res.totalUnchanged, 0);

    // Проверяем, что обновились только существовавшие файлы, а отсутствующие не создавались
    assert.match(readFileSync(resolve(dir, '.claude/skills/openspec-explore/SKILL.md'), 'utf8'), CYRILLIC);
    assert.match(readFileSync(resolve(dir, '.claude/commands/opsx/explore.md'), 'utf8'), CYRILLIC);
    assert.match(readFileSync(resolve(dir, '.cursor/commands/opsx-apply.md'), 'utf8'), CYRILLIC);
    assert.match(readFileSync(resolve(dir, '.github/prompts/opsx-new.prompt.md'), 'utf8'), CYRILLIC);
    assert.match(readFileSync(resolve(dir, '.agents/skills/openspec-propose/SKILL.md'), 'utf8'), CYRILLIC);
    assert.match(readFileSync(resolve(dir, '.gemini/commands/opsx/verify.toml'), 'utf8'), CYRILLIC);
    assert.equal(existsSync(resolve(dir, '.claude/skills/openspec-apply-change/SKILL.md')), false);

    // Повторный запуск идемпотентен (даже если в целевом файле CRLF)
    const exploreAbs = resolve(dir, '.claude/skills/openspec-explore/SKILL.md');
    writeFileSync(exploreAbs, readFileSync(exploreAbs, 'utf8').replace(/\n/g, '\r\n'), 'utf8');

    const second = applyRuPatch(dir, { openspecVersion: '1.15.0' });
    assert.equal(second.ok, true);
    assert.equal(second.totalUpdated, 0);
    assert.equal(second.totalUnchanged, 6);
    assert.equal(second.allUpToDate, true);
    assert.match(second.report, /уже актуальны/i);
  });
});

test('4.1 unit: обновление блока между маркерами OPENSPEC:START и OPENSPEC:END в AGENTS.md / CLAUDE.md', () => {
  withTempDir((dir) => {
    const customBundle = resolve(dir, 'bundle');
    mkdirSync(customBundle, { recursive: true });
    writeFileSync(
      resolve(customBundle, 'bundle-meta.json'),
      readFileSync(resolve(DEFAULT_BUNDLE_DIR, 'bundle-meta.json'), 'utf8'),
    );
    writeFixtureFile(
      customBundle,
      'AGENTS.md',
      '<!-- OPENSPEC:START -->\nРусские инструкции OpenSpec для агентов.\n<!-- OPENSPEC:END -->\n',
    );

    const projectDir = resolve(dir, 'project');
    mkdirSync(resolve(projectDir, '.git'), { recursive: true });
    const originalAgents = [
      '# Мой проект',
      'Пользовательский текст до маркера.',
      '<!-- OPENSPEC:START -->',
      'English OpenSpec instructions.',
      '<!-- OPENSPEC:END -->',
      'Пользовательский текст после маркера.',
      '',
    ].join('\n');
    writeFixtureFile(projectDir, 'AGENTS.md', originalAgents);

    const res = applyRuPatch(projectDir, {
      bundleDir: customBundle,
      openspecVersion: '1.15.0',
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.markers.updated, ['AGENTS.md']);

    const updatedText = readFileSync(resolve(projectDir, 'AGENTS.md'), 'utf8');
    assert.match(updatedText, /^# Мой проект\nПользовательский текст до маркера\.\n<!-- OPENSPEC:START -->/);
    assert.match(updatedText, /Русские инструкции OpenSpec для агентов\./);
    assert.match(updatedText, /<!-- OPENSPEC:END -->\nПользовательский текст после маркера\.\n$/);

    // Повторный запуск на уже обновлённом маркерном блоке
    const res2 = applyRuPatch(projectDir, {
      bundleDir: customBundle,
      openspecVersion: '1.15.0',
    });
    assert.deepEqual(res2.markers.updated, []);
    assert.deepEqual(res2.markers.unchanged, ['AGENTS.md']);
    assert.equal(res2.allUpToDate, true);
  });
});

test('4.1 unit: replaceBetweenMarkers возвращает null, если маркеров нет', () => {
  assert.equal(replaceBetweenMarkers('Текст без маркеров', 'Шаблон'), null);
});

test('4.1 CLI: работают вызовы node tools/apply/ apply --help и node tools/apply/cli.mjs apply --help', () => {
  const meta = readBundleMeta();
  const r1 = invokeNodeCli(DIR_PATH, ['apply', '--help']);
  assert.equal(r1.status, 0);
  assert.match(r1.stdout, new RegExp(meta.upstream.tag));
  assert.match(r1.stdout, /--dry-run/);

  const r2 = invokeNodeCli(CLI_PATH, ['apply', '--help']);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, new RegExp(meta.upstream.tag));

  const rVer = invokeNodeCli(CLI_PATH, ['--version']);
  assert.equal(rVer.status, 0);
  assert.match(rVer.stdout, new RegExp(meta.upstream.tag));
});

test('4.2 E2E: openspec init --tools claude (EN) -> apply -> RU -> повтор (актуально) -> переприменение после перезаписи EN', () => {
  withTempDir((scratch) => {
    // 1. Запускаем настоящий openspec init --tools claude в scratch-проекте
    const initRes = spawnSync(
      'openspec',
      ['init', '--tools', 'claude', '--no-animation', '--no-copilot-cloud'],
      {
        cwd: scratch,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      },
    );
    assert.equal(
      initRes.status,
      0,
      `openspec init завершился с ошибкой (${initRes.status}): ${initRes.stderr || initRes.stdout}`,
    );

    const skillsRoot = resolve(scratch, '.claude/skills');
    const commandsRoot = resolve(scratch, '.claude/commands/opsx');
    const skillDirsBefore = readdirSync(skillsRoot).sort();
    const cmdFilesBefore = readdirSync(commandsRoot).sort();
    assert.ok(skillDirsBefore.length > 0, 'openspec init должен создать skills');
    assert.ok(cmdFilesBefore.length > 0, 'openspec init должен создать команды');
    const expectedTotal = skillDirsBefore.length + cmdFilesBefore.length;

    // Сохраняем frontmatter name каждого файла до патча и проверяем, что исходники английские
    const skillNamesBefore = new Map();
    for (const d of skillDirsBefore) {
      const content = readFileSync(resolve(skillsRoot, d, 'SKILL.md'), 'utf8');
      assert.equal(CYRILLIC.test(content), false, `Ожидался EN skill до патча: ${d}`);
      skillNamesBefore.set(d, extractFrontmatterName(content));
    }

    // Создаём также CLAUDE.md с маркерами, чтобы убедиться, что маркеры не ломаются
    const claudeMdContent = 'До маркера\n<!-- OPENSPEC:START -->\nKeep block\n<!-- OPENSPEC:END -->\nПосле маркера\n';
    writeFixtureFile(scratch, 'CLAUDE.md', claudeMdContent);

    // 2. Запускаем патчер через `node tools/apply/ apply <scratch>`
    const patchRes = invokeNodeCli(DIR_PATH, ['apply', scratch]);
    assert.equal(patchRes.status, 0, `stderr: ${patchRes.stderr}`);
    assert.match(patchRes.stdout, /v1\.15\.0/);
    assert.match(patchRes.stdout, /Claude Code \(claude\)/);
    assert.match(patchRes.stdout, new RegExp(`обновлено файлов: ${expectedTotal}`));

    // 3. Проверяем, что все созданные skills и команды стали русскими, а имена файлов и name: не изменились
    // плюс бонусные файлы веб-панели (openspec-ui, ui), созданные патчером
    assert.deepEqual(readdirSync(skillsRoot).sort(), [...skillDirsBefore, 'openspec-ui'].sort());
    assert.deepEqual(readdirSync(commandsRoot).sort(), [...cmdFilesBefore, 'ui.md'].sort());

    for (const d of skillDirsBefore) {
      const content = readFileSync(resolve(skillsRoot, d, 'SKILL.md'), 'utf8');
      assert.match(content, CYRILLIC, `Skill ${d} должен содержать русский текст`);
      assert.equal(extractFrontmatterName(content), skillNamesBefore.get(d));
    }
    for (const f of cmdFilesBefore) {
      const content = readFileSync(resolve(commandsRoot, f), 'utf8');
      assert.match(content, CYRILLIC, `Команда ${f} должна содержать русский текст`);
      assert.match(content, /^name:\s*"OPSX:/m);
      assert.match(content, /\/opsx:/);
    }
    assert.equal(readFileSync(resolve(scratch, 'CLAUDE.md'), 'utf8'), claudeMdContent);
    const uiSkillText = readFileSync(resolve(skillsRoot, 'openspec-ui/SKILL.md'), 'utf8');
    assert.match(uiSkillText, CYRILLIC, '.claude/skills/openspec-ui/SKILL.md должен быть русским');
    assert.equal(extractFrontmatterName(uiSkillText), 'openspec-ui');
    assert.match(uiSkillText, /start web --detach/);
    assert.match(readFileSync(resolve(commandsRoot, 'ui.md'), 'utf8'), CYRILLIC, '.claude/commands/opsx/ui.md должен быть русским');
    assert.match(
      readFileSync(resolve(scratch, 'openspec/schemas/spec-driven/schema.yaml'), 'utf8'),
      CYRILLIC,
      'openspec/schemas/spec-driven/schema.yaml должен быть скопирован на русском',
    );
    assert.match(
      readFileSync(resolve(scratch, 'openspec/config.yaml'), 'utf8'),
      /Language:\s*Russian/,
      'openspec/config.yaml должен получить Language: Russian',
    );

    // 4. Повторный запуск -> 0 обновлённых, сообщение «уже актуальны»
    const repeatRes = invokeNodeCli(CLI_PATH, ['apply', scratch]);
    assert.equal(repeatRes.status, 0);
    assert.match(repeatRes.stdout, /уже актуальны/);
    assert.match(repeatRes.stdout, /обновлено 0/);

    // 5. Имитация `openspec update`: перезаписываем артефакты английскими через `openspec init --tools claude --force`
    const reinitRes = spawnSync(
      'openspec',
      ['init', '--tools', 'claude', '--force', '--no-animation', '--no-copilot-cloud'],
      {
        cwd: scratch,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      },
    );
    assert.equal(reinitRes.status, 0);
    assert.equal(
      CYRILLIC.test(readFileSync(resolve(skillsRoot, skillDirsBefore[0], 'SKILL.md'), 'utf8')),
      false,
      'После повторного openspec init файл должен снова стать английским',
    );

    // 6. Повторное применение патчера -> снова все файлы русские
    const reapplyRes = invokeNodeCli(DIR_PATH, ['apply', scratch]);
    assert.equal(reapplyRes.status, 0);
    assert.match(reapplyRes.stdout, new RegExp(`обновлено файлов: ${expectedTotal}`));
    assert.match(readFileSync(resolve(skillsRoot, skillDirsBefore[0], 'SKILL.md'), 'utf8'), CYRILLIC);
    assert.match(readFileSync(resolve(commandsRoot, cmdFilesBefore[0]), 'utf8'), CYRILLIC);
  });
});

test('4.3 E2E негативный 1: пустой проект без OpenSpec (даже с пустой папкой .claude/) -> сообщение про openspec init, файлы не созданы', () => {
  withTempDir((scratch) => {
    mkdirSync(resolve(scratch, '.claude/skills'), { recursive: true });
    mkdirSync(resolve(scratch, '.cursor/commands'), { recursive: true });

    const res = invokeNodeCli(CLI_PATH, ['apply', scratch]);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /openspec init/);
    assert.deepEqual(readdirSync(resolve(scratch, '.claude/skills')), []);
    assert.deepEqual(readdirSync(resolve(scratch, '.cursor/commands')), []);
  });
});

test('4.3 E2E негативный 2: сторонние skills и команды (.claude/skills/custom-skill/SKILL.md) байт-в-байт не затронуты', () => {
  withTempDir((scratch) => {
    const customSkillText = '---\nname: custom-skill\n---\nMy custom skill content\r\nLine 2\n';
    const customCmdText = '# My custom command\nDo not touch!\n';
    const customSkillAbs = writeFixtureFile(scratch, '.claude/skills/custom-skill/SKILL.md', customSkillText);
    const customCmdAbs = writeFixtureFile(scratch, '.claude/commands/opsx/custom-unrelated.md', customCmdText);

    // Если в проекте ТОЛЬКО сторонний skill без openspec-* -> считается, что OpenSpec не установлен
    const onlyCustomRes = applyRuPatch(scratch, { openspecVersion: '1.15.0' });
    assert.equal(onlyCustomRes.ok, false);
    assert.equal(readFileSync(customSkillAbs, 'utf8'), customSkillText);

    // Добавляем настоящий OpenSpec skill рядом со сторонним
    const exploreAbs = writeFixtureFile(
      scratch,
      '.claude/skills/openspec-explore/SKILL.md',
      '---\nname: openspec-explore\n---\nEnglish explore skill\n',
    );

    const res = applyRuPatch(scratch, { openspecVersion: '1.15.0' });
    assert.equal(res.ok, true);
    assert.equal(res.totalUpdated, 1);
    assert.equal(readFileSync(customSkillAbs, 'utf8'), customSkillText);
    assert.equal(readFileSync(customCmdAbs, 'utf8'), customCmdText);
    assert.match(readFileSync(exploreAbs, 'utf8'), CYRILLIC);
  });
});

test('4.3 E2E негативный 3: инструмент вне топ-5 (cline и произвольный .FakeTool) -> предупреждение, файлы не изменены', () => {
  withTempDir((scratch) => {
    const clineSkillText = '---\nname: openspec-explore\n---\nCline EN skill\n';
    const clineWorkflowText = '# OPSX: Explore\nCline EN workflow\n';
    const fakeSkillText = '---\nname: openspec-explore\n---\nFakeTool EN skill\n';

    const clineSkillAbs = writeFixtureFile(scratch, '.cline/skills/openspec-explore/SKILL.md', clineSkillText);
    const clineWfAbs = writeFixtureFile(scratch, '.clinerules/workflows/opsx-explore.md', clineWorkflowText);
    const fakeSkillAbs = writeFixtureFile(scratch, '.FakeTool/skills/openspec-explore/SKILL.md', fakeSkillText);

    const detected = detectUnsupportedTools(scratch);
    assert.deepEqual(detected.map((d) => d.id).sort(), ['FakeTool', 'cline']);

    const cliRes = invokeNodeCli(CLI_PATH, ['apply', scratch]);
    assert.equal(cliRes.status, 0);
    assert.match(cliRes.stdout, /Предупреждение: инструмент «Cline»/);
    assert.match(cliRes.stdout, /Предупреждение: инструмент «\.FakeTool»/);
    assert.match(cliRes.stdout, /не изменены/);

    // Файлы неподдерживаемых инструментов остались байт-в-байт нетронутыми
    assert.equal(readFileSync(clineSkillAbs, 'utf8'), clineSkillText);
    assert.equal(readFileSync(clineWfAbs, 'utf8'), clineWorkflowText);
    assert.equal(readFileSync(fakeSkillAbs, 'utf8'), fakeSkillText);
  });
});

test('4.3 E2E негативный 4: флаг --dry-run показывает отчёт, но оставляет файлы на диске английскими', () => {
  withTempDir((scratch) => {
    const enSkill = '---\nname: openspec-explore\n---\nEnglish skill body\n';
    const enCmd = '---\nname: "OPSX: Explore"\n---\nEnglish command body\n';
    const skillAbs = writeFixtureFile(scratch, '.claude/skills/openspec-explore/SKILL.md', enSkill);
    const cmdAbs = writeFixtureFile(scratch, '.claude/commands/opsx/explore.md', enCmd);

    const stdoutChunks = [];
    const stderrChunks = [];
    const code = runCli(['apply', scratch, '--dry-run'], {
      stdout: { write: (s) => stdoutChunks.push(s) },
      stderr: { write: (s) => stderrChunks.push(s) },
    });

    assert.equal(code, 0);
    assert.equal(stderrChunks.join(''), '');
    const out = stdoutChunks.join('');
    assert.match(out, /dry-run/);
    assert.match(out, /было бы обновлено файлов: 2/);

    // Файлы на диске остались английскими байт-в-байт
    assert.equal(readFileSync(skillAbs, 'utf8'), enSkill);
    assert.equal(readFileSync(cmdAbs, 'utf8'), enCmd);
  });
});

test('4.3 E2E негативный 5: расхождение версии OpenSpec CLI с bundle-meta.json -> предупреждение в выводе', () => {
  withTempDir((scratch) => {
    writeFixtureFile(
      scratch,
      '.claude/skills/openspec-explore/SKILL.md',
      '---\nname: openspec-explore\n---\nEnglish skill\n',
    );

    const res = applyRuPatch(scratch, { openspecVersion: '1.14.0' });
    assert.equal(res.ok, true);
    assert.deepEqual(res.versionMismatch, {
      installed: '1.14.0',
      bundle: '1.15.0',
      bundleTag: 'v1.15.0',
    });
    assert.match(res.report, /Предупреждение: версия установленного OpenSpec CLI \(v1\.14\.0\) отличается от версии бандла \(v1\.15\.0\)/);
  });
});

test('4.3 E2E негативный 6: если git не инициализирован в папке (.git отсутствует), выполнение заблокировано даже при наличии файлов OpenSpec', () => {
  withTempDir(
    (scratch) => {
      const enSkill = '---\nname: openspec-explore\n---\nEnglish skill\n';
      const skillAbs = writeFixtureFile(scratch, '.claude/skills/openspec-explore/SKILL.md', enSkill);
      writeFixtureFile(scratch, 'openspec/config.yaml', 'schema: spec-driven\n');

      const cliRes = invokeNodeCli(CLI_PATH, ['apply', scratch]);
      assert.equal(cliRes.status, 1);
      assert.match(cliRes.stderr, /не инициализирован Git/i);
      assert.match(cliRes.stderr, /заблокирован/i);

      // Ни один файл не изменён иopenspec/schemas не создан
      assert.equal(readFileSync(skillAbs, 'utf8'), enSkill);
      assert.equal(existsSync(resolve(scratch, 'openspec/schemas')), false);

      // Команда init в папке без .git также заблокирована и не создаёт openspec/
      const initRes = invokeNodeCli(CLI_PATH, ['init', '--tools', 'claude'], scratch);
      assert.equal(initRes.status, 1);
      assert.match(initRes.stderr, /openspec init.*заблокировано/i);
    },
    { initGit: false },
  );
});

test('4.5 E2E: openspec-ru update блокирует без .git и без openspec/, а в проекте с OpenSpec выполняет openspec update и накатывает RU-бандл', () => {
  // 1. Без .git -> код 1
  withTempDir(
    (noGitDir) => {
      const r = invokeNodeCli(CLI_PATH, ['update', noGitDir]);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /не инициализирован Git/i);
    },
    { initGit: false },
  );

  // 2. С .git, но без openspec/ -> код 1
  withTempDir((noOsDir) => {
    const r = invokeNodeCli(CLI_PATH, ['update', noOsDir]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /не найден каталог openspec/i);
  });

  // 3. Полноценный проект: openspec init -> openspec-ru update --force -> все файлы русские
  withTempDir((scratch) => {
    const initRes = spawnSync(
      'openspec',
      ['init', '--tools', 'claude', '--no-animation', '--no-copilot-cloud'],
      { cwd: scratch, encoding: 'utf8', shell: process.platform === 'win32' },
    );
    assert.equal(initRes.status, 0);

    const updRes = invokeNodeCli(CLI_PATH, ['update', scratch, '--force']);
    assert.equal(updRes.status, 0, `stderr: ${updRes.stderr}`);
    assert.match(updRes.stdout, /Claude Code \(claude\)/);
    assert.match(
      readFileSync(resolve(scratch, '.claude/skills/openspec-explore/SKILL.md'), 'utf8'),
      CYRILLIC,
    );
    assert.match(
      readFileSync(resolve(scratch, 'openspec/schemas/spec-driven/schema.yaml'), 'utf8'),
      CYRILLIC,
    );
  });
});

test('4.5 unit: installGlobalCliShim создаёт рабочие шорткаты openspec-ru для Linux/macOS и Windows и не вызывает DEP0190', () => {
  withTempDir((fakeHome) => {
    const unixBin = resolve(fakeHome, '.local/bin');
    mkdirSync(unixBin, { recursive: true });

    const unixRes = installGlobalCliShim({
      homeDir: fakeHome,
      platform: 'linux',
      envPath: `/usr/bin:${unixBin}`,
    });
    assert.equal(unixRes.installed, true);
    assert.equal(unixRes.binDir, unixBin);
    assert.equal(existsSync(resolve(unixBin, 'openspec-ru')), true);
    assert.equal(existsSync(resolve(fakeHome, '.openspec-ru/runtime/tools/apply/cli.mjs')), true);

    const winBin = resolve(fakeHome, 'win-bin');
    mkdirSync(winBin, { recursive: true });
    const winRes = installGlobalCliShim({
      homeDir: fakeHome,
      platform: 'win32',
      envPath: `C:\\Windows\\System32;${winBin}`,
    });
    assert.equal(winRes.installed, true);
    assert.equal(existsSync(resolve(winBin, 'openspec-ru.cmd')), true);
    assert.equal(existsSync(resolve(winBin, 'openspec-ru.ps1')), true);
    assert.equal(existsSync(resolve(winBin, 'openspec-ru')), true);

    // Проверяем отсутствие DEP0190 при запуске с --pending-deprecation
    const depCheck = spawnSync(
      process.execPath,
      ['--pending-deprecation', CLI_PATH, '--version'],
      { encoding: 'utf8' },
    );
    assert.equal(depCheck.status, 0);
    assert.doesNotMatch(depCheck.stderr, /DEP0190/);
  });
});
