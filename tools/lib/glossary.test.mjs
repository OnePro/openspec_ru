// Тесты парсера glossary.md и глоссарий-линта (задача 1.3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GLOSSARY_PATH,
  RULE_FORBID,
  RULE_KEEP,
  RULE_TRANSLATE,
  forbiddenEntries,
  lintGlossaryText,
  loadGlossary,
  parseGlossary,
  translatableEntries,
} from './glossary.mjs';

test('реальный glossary.md: все строки таблицы парсятся, 40–60 терминов', () => {
  const entries = loadGlossary();
  assert.ok(entries.length >= 40 && entries.length <= 60, `терминов: ${entries.length}`);
  for (const e of entries) {
    assert.ok(e.en.length > 0, 'EN непустой');
    assert.ok(e.ru.length > 0, 'RU непустой');
    assert.ok([RULE_TRANSLATE, RULE_KEEP, RULE_FORBID].includes(e.rule), `правило записи ${e.en}`);
    if (e.rule === RULE_FORBID) assert.ok(e.forbidden.length > 0, `запрещённый вариант у ${e.en}`);
  }
});

test('каждый термин имеет одно из трёх правил; неизвестное правило отклоняется', () => {
  const bad = '| EN | RU | правило |\n|---|---|---|\n| change | изменение | иногда |\n';
  assert.throws(() => parseGlossary(bad), /неизвестное правило/);
  const noVariant = '| EN | RU | правило |\n|---|---|---|\n| change | изменение | запрещено: |\n';
  assert.throws(() => parseGlossary(noVariant), /без варианта/);
});

// Синтетический глоссарий для поведенческих тестов (не зависит от seed-наполнения).
const SYNTH = [
  '| EN | RU | правило |',
  '|---|---|---|',
  '| change | изменение | запрещено:правка |',
  '| spec | спецификация | запрещено:спека |',
  '| workflow | процесс | переводить |',
  '| Spec Kit | Spec Kit | не переводить |',
  '| design.md | design.md | не переводить |',
  '',
].join('\n');

test('запрещённые варианты извлекаются', () => {
  const entries = parseGlossary(SYNTH);
  const forbidden = forbiddenEntries(entries);
  assert.equal(forbidden.length, 2);
  const change = forbidden.find((e) => e.en === 'change');
  assert.equal(change.forbidden, 'правка');
  assert.equal(change.ru, 'изменение');
  // Реальный seed-глоссарий тоже содержит запрещённые варианты.
  assert.ok(forbiddenEntries(loadGlossary()).length >= 1);
});

test('термины «не переводить»: slash-команды и имена файлов артефактов', () => {
  const entries = loadGlossary();
  const keep = entries.filter((e) => e.rule === RULE_KEEP).map((e) => e.en);
  for (const term of ['/opsx:propose', '/opsx:apply', '/opsx:archive', 'proposal.md', 'design.md', 'tasks.md', 'spec.md']) {
    assert.ok(keep.includes(term), `нет термина «не переводить»: ${term}`);
  }
});

test('seed-переводы на месте', () => {
  const entries = loadGlossary();
  const byEn = new Map(entries.map((e) => [e.en, e.ru]));
  assert.equal(byEn.get('change'), 'изменение');
  assert.equal(byEn.get('spec'), 'спецификация');
  assert.equal(byEn.get('artifact'), 'артефакт');
  assert.equal(byEn.get('capability'), 'возможность');
  assert.equal(byEn.get('scenario'), 'сценарий');
  assert.equal(byEn.get('delta'), 'дельта');
  assert.equal(byEn.get('store'), 'хранилище');
  assert.equal(byEn.get('workflow'), 'процесс');
  assert.equal(byEn.get('requirement'), 'требование');
});

test('lint: запрещённый вариант ловится с файлом и строкой', () => {
  const entries = parseGlossary(SYNTH);
  const text = 'Сначала создайте правка для этого.\nЗатем спека описывает поведение.\n';
  const v = lintGlossaryText(text, entries, { file: 'ru/x.md' });
  assert.equal(v.length, 2);
  assert.equal(v[0].kind, 'forbidden');
  assert.equal(v[0].line, 1);
  assert.equal(v[0].expected, 'изменение');
  assert.match(v[0].message, /ru\/x\.md:1/);
  assert.match(v[1].message, /«спека».*норматив: «спецификация»/s);
});

test('lint: непереведённый EN-термин ловится, «не переводить» — нет', () => {
  const entries = parseGlossary(SYNTH);
  const text = 'The workflow запускается, см. design.md.\n';
  const v = lintGlossaryText(text, entries, { file: 'ru/x.md' });
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'untranslated');
  assert.equal(v[0].term, 'workflow');
});

test('lint: keep-термины маскируются и не триггерят вложенные термины', () => {
  const entries = parseGlossary(SYNTH);
  // «Spec Kit» — имя собственное; без маскировки keep-терминов «Spec» ловился бы как «spec».
  const v = lintGlossaryText('Сравнение с Spec Kit и описание workflow в тексте.\n', entries, { file: 'ru/x.md' });
  assert.deepEqual(v.map((x) => x.term), ['workflow']);
});

test('lint: термины в код-блоках, inline-коде, URL и frontmatter игнорируются', () => {
  const entries = parseGlossary(SYNTH);
  const text = [
    '---',
    'name: workflow',
    '---',
    'Текст про процесс.',
    '',
    '```',
    'const workflow = "spec"; // change me',
    '```',
    '',
    'Ссылка на [документ](https://example.com/workflow/change) и `workflow` в коде.',
    '<!-- TODO: workflow spec change -->',
    'См. design.md — имя файла не термин.',
  ].join('\n');
  const v = lintGlossaryText(text, entries, { file: 'ru/x.md' });
  assert.deepEqual(v, []);
});

test('lint: границы слов — OpenSpec и design.md не дают ложных срабатываний', () => {
  const entries = parseGlossary(SYNTH);
  const v = lintGlossaryText('См. design.md — имя файла не термин.\n', entries, { file: 'ru/x.md' });
  assert.deepEqual(v, []);
});

test('maskIgnoredZones сохраняет нумерацию строк', () => {
  const entries = parseGlossary(SYNTH);
  const text = '```\nправка\n```\n\nправка\n';
  const v = lintGlossaryText(text, entries, { file: 'f.md' });
  assert.equal(v.length, 1);
  assert.equal(v[0].line, 5);
});

test('parseGlossary: пустой текст без таблицы — ошибка', () => {
  assert.throws(() => parseGlossary('# пусто\n'), /таблица терминов не найдена/);
});
