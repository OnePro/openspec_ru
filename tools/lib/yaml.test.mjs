// Тесты минимального YAML-парсера (подмножество под schemas/ апстрима).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml } from './yaml.mjs';

test('map с вложенными map и скалярами', () => {
  const doc = parseYaml([
    'name: spec-driven',
    'version: 1',
    'apply:',
    '  tracks: tasks.md',
    '  requires: [tasks]',
    '',
  ].join('\n'));
  assert.deepEqual(doc, {
    name: 'spec-driven',
    version: 1,
    apply: { tracks: 'tasks.md', requires: ['tasks'] },
  });
});

test('seq из map с ключом в строке элемента', () => {
  const doc = parseYaml([
    'artifacts:',
    '  - id: proposal',
    '    generates: proposal.md',
    '    requires: []',
    '  - id: specs',
    '    requires:',
    '      - proposal',
    '',
  ].join('\n'));
  assert.deepEqual(doc, {
    artifacts: [
      { id: 'proposal', generates: 'proposal.md', requires: [] },
      { id: 'specs', requires: ['proposal'] },
    ],
  });
});

test('литеральный блочный скаляр | сохраняет переносы и пустые строки', () => {
  const doc = parseYaml([
    'instruction: |',
    '  Первая строка.',
    '',
    '  Вторая строка с `кодом`.',
    'next: value',
    '',
  ].join('\n'));
  assert.equal(doc.instruction, 'Первая строка.\n\nВторая строка с `кодом`.\n');
  assert.equal(doc.next, 'value');
});

test('скаляр |- обрезает финальный перенос, > сворачивает строки', () => {
  const doc = parseYaml('a: |-\n  x\n  y\nb: >\n  x\n  y\n');
  assert.equal(doc.a, 'x\ny');
  assert.equal(doc.b, 'x y\n');
});

test('flow-значения: кавычки, числа, boolean, null', () => {
  const doc = parseYaml([
    'glob: "specs/**/*.md"',
    "single: 'it''s'",
    'n: 42',
    'f: 1.5',
    'yes: true',
    'nothing: null',
    'list: [a, "b, c", 3]',
    '',
  ].join('\n'));
  assert.deepEqual(doc, {
    glob: 'specs/**/*.md',
    single: "it's",
    n: 42,
    f: 1.5,
    yes: true,
    nothing: null,
    list: ['a', 'b, c', 3],
  });
});

test('комментарии и маркеры документа игнорируются', () => {
  const doc = parseYaml('---\n# комментарий\na: 1\n...\n');
  assert.deepEqual(doc, { a: 1 });
});

test('неподдерживаемые конструкции дают явную ошибку', () => {
  assert.throws(() => parseYaml('a: &anchor x\n'), /anchor/);
  assert.throws(() => parseYaml('a: {b: 1}\n'), /flow-map/);
});
