// Тесты детерминированной валидации (задачи 2.1–2.3): синтетические пары.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeZones,
  frontmatterKeys,
  headingLevels,
  identifiers,
  linkTargets,
  validateJsonPair,
  validateMarkdownPair,
  validatePair,
  validateTsPair,
} from './validate-translation.mjs';
import { loadGlossary } from './lib/glossary.mjs';

const glossary = loadGlossary();

const EN_MD = [
  '---',
  'name: openspec-propose',
  'description: Create a change',
  '---',
  '# Title',
  '',
  'Some text with [a link](https://example.com/page#anchor) and [local](setup.md).',
  '',
  '## Section',
  '',
  '```bash',
  'openspec init',
  '```',
  '',
  'Run /opsx:propose now.',
  '',
  '```text',
  'second block',
  '```',
  '',
].join('\n');

function validRu() {
  return EN_MD
    .replace('# Title', '# Заголовок')
    .replace('Some text with', 'Текст со')
    .replace('## Section', '## Раздел')
    .replace('Run /opsx:propose now.', 'Запустите /opsx:propose сейчас.');
}

test('markdown: валидная пара проходит', () => {
  assert.deepEqual(validateMarkdownPair(EN_MD, validRu()), []);
  assert.deepEqual(validatePair(EN_MD, validRu(), 'docs-lab/x.md', { glossary }), []);
});

test('markdown: разное число код-блоков ловится', () => {
  const ru = validRu().replace('```text\nsecond block\n```\n', '');
  const errors = validateMarkdownPair(EN_MD, ru);
  assert.ok(errors.some((e) => e.includes('код-блоки')), errors.join('; '));
});

test('markdown: изменённая последовательность уровней заголовков ловится', () => {
  const ru = validRu().replace('## Раздел', '### Раздел');
  const errors = validateMarkdownPair(EN_MD, ru);
  assert.ok(errors.some((e) => e.includes('заголовки')), errors.join('; '));
});

test('markdown: изменённая ссылка/якорь ловится', () => {
  const ru = validRu().replace('https://example.com/page#anchor', 'https://example.com/page#other');
  const errors = validateMarkdownPair(EN_MD, ru);
  assert.ok(errors.some((e) => e.includes('ссылки/якоря') && e.includes('#other')), errors.join('; '));
});

test('markdown: потерянный ключ frontmatter ловится', () => {
  const ru = validRu().replace('description: Create a change\n', '');
  const errors = validateMarkdownPair(EN_MD, ru);
  assert.ok(errors.some((e) => e.includes('ключи frontmatter') && e.includes('description')), errors.join('; '));
});

test('markdown: потерянный идентификатор /opsx:* ловится', () => {
  const ru = validRu().replace('/opsx:propose', '/opsx:propose2');
  const errors = validateMarkdownPair(EN_MD, ru);
  assert.ok(errors.some((e) => e.includes('/opsx:')), errors.join('; '));
});

test('markdown: изменённый идентификатор name: ловится', () => {
  const ru = validRu().replace('name: openspec-propose', 'name: openspec-predlozhit');
  const errors = validateMarkdownPair(EN_MD, ru);
  assert.ok(errors.some((e) => e.includes('name:') && e.includes('openspec-predlozhit')), errors.join('; '));
});

test('markdown: заголовки и ссылки внутри код-блоков игнорируются', () => {
  const en = '# A\n\n```md\n# Fake\n[x](fake.md)\n```\n';
  const ru = '# Б\n\n```md\n# Fake\n[x](fake.md)\n```\n';
  assert.deepEqual(validateMarkdownPair(en, ru), []);
});

test('markdown: глоссарий-линт включён в парную валидацию', () => {
  const ru = validRu().replace('Запустите', 'Сделайте спека и запустите');
  const errors = validatePair(EN_MD, ru, 'docs-lab/x.md', { glossary, ruPath: 'ru/docs-lab/x.md' });
  assert.ok(errors.some((e) => e.includes('запрещённый вариант')), errors.join('; '));
});

// --- TS ---------------------------------------------------------------------

const EN_TS = [
  "import type { SkillTemplate } from '../types.js';",
  "import { helper, other as renamed } from './util.js';",
  '',
  'const PROMPT = `Start the change ${hint} and run tool`;',
  '',
  'export function getTemplate(): SkillTemplate {',
  '  return { name: `x-${suffix}`, description: `uses ${hint}` };',
  '}',
  'export default getTemplate;',
  '',
].join('\n');

const RU_TS_OK = EN_TS
  .replace('Start the change', 'Начните изменение')
  .replace('and run tool', 'и запустите инструмент');

test('TS: валидная пара (переведены только строки) проходит', () => {
  assert.deepEqual(validateTsPair(EN_TS, RU_TS_OK), []);
  assert.deepEqual(validatePair(EN_TS, RU_TS_OK, 'src/core/templates/x.ts', { glossary }), []);
});

test('TS: пропавший ${...}-токен отклоняется', () => {
  const ru = RU_TS_OK.replace('`x-${suffix}`', '`x-static`');
  const errors = validateTsPair(EN_TS, ru);
  assert.ok(errors.some((e) => e.includes('токены ${...}') && e.includes('suffix')), errors.join('; '));
});

test('TS: переименованная константа отклоняется', () => {
  const ru = RU_TS_OK.replace('const PROMPT', 'const PODSKAZKA');
  const errors = validateTsPair(EN_TS, ru);
  assert.ok(errors.some((e) => e.includes('имена констант')), errors.join('; '));
});

test('TS: переименованный экспорт и потерянный импорт отклоняются', () => {
  const ru = RU_TS_OK
    .replace('export function getTemplate', 'export function getTpl')
    .replace('{ helper, other as renamed }', '{ helper }');
  const errors = validateTsPair(EN_TS, ru);
  assert.ok(errors.some((e) => e.includes('имена экспортов') && e.includes('getTemplate')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('имена импортов') && e.includes('other')), errors.join('; '));
});

test('TS: запрещённый вариант глоссария ловится и в TS', () => {
  const ru = RU_TS_OK.replace('Начните изменение', 'Начните спека');
  const errors = validatePair(EN_TS, ru, 'src/core/templates/x.ts', { glossary });
  assert.ok(errors.some((e) => e.includes('запрещённый вариант')), errors.join('; '));
});

// --- JSON -------------------------------------------------------------------

test('JSON: равные множества ключей проходят, переименованный ключ ловится', () => {
  const en = '{"version": 1, "steps": [{"id": "a", "title": "T"}]}';
  const ruOk = '{"version": 1, "steps": [{"id": "a", "title": "Т"}]}';
  assert.deepEqual(validateJsonPair(en, ruOk), []);
  const ruBad = '{"version": 1, "steps": [{"id": "a", "zagolovok": "Т"}]}';
  const errors = validateJsonPair(en, ruBad);
  assert.ok(errors.some((e) => e.includes('zagolovok')), errors.join('; '));
});

// --- хелперы ----------------------------------------------------------------

test('хелперы: codeZones/headingLevels/linkTargets/frontmatterKeys/identifiers', () => {
  assert.equal(codeZones(EN_MD).blocks, 2);
  assert.deepEqual(headingLevels(EN_MD), [1, 2]);
  assert.deepEqual(linkTargets(EN_MD), ['https://example.com/page#anchor', 'setup.md']);
  assert.deepEqual(frontmatterKeys(EN_MD), ['description', 'name']);
  assert.equal(frontmatterKeys('# нет frontmatter\n'), null);
  const ids = identifiers(EN_MD);
  assert.deepEqual(ids.opsx, ['/opsx:propose']);
  assert.deepEqual(ids.names, ['openspec-propose']);
});
