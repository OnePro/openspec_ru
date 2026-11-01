// Тесты advisor-ревью: конфигурация, строгий JSON, ретраи, drift и статусы.
// Все вызовы API и обновления манифеста заменены моками.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertReviewCurrent,
  buildReviewPrompt,
  parseReviewResponse,
  reviewConfigFromEnv,
  reviewTranslation,
  reviewWithRetry,
} from './review-translation.mjs';

const ENTRY = {
  en: 'website/app/page.tsx',
  ru: 'ru/website-strings/app/page.tsx',
  base_blob_sha: 'a'.repeat(40),
  status: 'machine',
  area: 'website',
};
const CFG = {
  base: 'https://review.example', key: 'secret', model: 'advisor', flavor: 'openai',
  maxTokens: 1000, temperature: 0,
};
const TREE = new Map([[ENTRY.en, ENTRY.base_blob_sha]]);
const PROMPT = { system: 'ревью', user: 'проверь' };
const ISSUE = { fragment_en: 'Change', fragment_ru: 'Перемена', problem: 'Нарушен глоссарий' };

const silentLog = { log() {}, error() {} };

function reviewOptions(overrides = {}) {
  return {
    cfg: CFG,
    tree: TREE,
    enContent: 'export const title = "Change";',
    ruContent: 'export const title = "Изменение";',
    glossaryMd: '| EN | RU |',
    styleGuideMd: 'Стиль',
    log: silentLog,
    ...overrides,
  };
}

test('reviewConfigFromEnv: полный набор, anthropic, temperature=0 и maxTokens', () => {
  const cfg = reviewConfigFromEnv({
    REVIEW_API_BASE: 'https://review.example/v1/',
    REVIEW_API_KEY: 'key',
    REVIEW_API_MODEL: 'model',
    REVIEW_API_FLAVOR: 'anthropic',
    REVIEW_API_MAX_TOKENS: '2048',
  });
  assert.deepEqual(cfg, {
    base: 'https://review.example/v1', key: 'key', model: 'model',
    flavor: 'anthropic', maxTokens: 2048, temperature: 0,
  });
  assert.equal(reviewConfigFromEnv({
    REVIEW_API_BASE: 'https://x', REVIEW_API_KEY: 'k', REVIEW_API_MODEL: 'm',
  }).flavor, 'openai');
});

test('reviewConfigFromEnv: пустой набор откладывает ревью, частичный — ошибка', () => {
  assert.equal(reviewConfigFromEnv({}), null);
  assert.equal(reviewConfigFromEnv({ REVIEW_API_BASE: '', REVIEW_API_KEY: '' }), null);
  assert.throws(
    () => reviewConfigFromEnv({ REVIEW_API_BASE: 'https://x' }),
    /REVIEW_API_KEY, REVIEW_API_MODEL/,
  );
  assert.throws(
    () => reviewConfigFromEnv({ REVIEW_API_BASE: 'https://x', REVIEW_API_KEY: 'k', REVIEW_API_MODEL: 'm', REVIEW_API_FLAVOR: 'xml' }),
    /openai или anthropic/,
  );
});

test('промпт ревью содержит роль, глоссарий, стайлгайд, EN и RU с границами', () => {
  const { system, user } = buildReviewPrompt({
    enPath: ENTRY.en,
    ruPath: ENTRY.ru,
    enContent: 'Hello, change.',
    ruContent: 'Здравствуйте, изменение.',
    glossaryMd: 'ГЛОССАРИЙ-ТЕСТ',
    styleGuideMd: 'СТАЙЛГАЙД-ТЕСТ',
  });
  assert.match(system, /ревьюер/i);
  assert.match(system, /ГЛОССАРИЙ-ТЕСТ/);
  assert.match(system, /СТАЙЛГАЙД-ТЕСТ/);
  assert.match(user, /<<<SOURCE EN FILE: website\/app\/page\.tsx>>>/);
  assert.match(user, /Hello, change\./);
  assert.match(user, /<<<RU TRANSLATION FILE: ru\/website-strings\/app\/page\.tsx>>>/);
  assert.match(user, /Здравствуйте, изменение\./);
  assert.match(user, /"verdict":"pass"/);
});

test('разбор ответа: pass и fail, JSON извлекается из code fence/прозы', () => {
  assert.deepEqual(parseReviewResponse('```json\n{"verdict":"pass","issues":[]}\n```'), {
    verdict: 'pass', issues: [],
  });
  assert.deepEqual(parseReviewResponse(`Результат: {"verdict":"fail","issues":[${JSON.stringify(ISSUE)}]}`), {
    verdict: 'fail', issues: [ISSUE],
  });
  assert.deepEqual(parseReviewResponse('{"verdict":"pass","issues":[{"fragment_en":"a } b","fragment_ru":"в","problem":"п"}]}').verdict, 'pass');
});

test('разбор ответа: непарсимый JSON, неверный verdict и fail без issues отклоняются', () => {
  assert.throws(() => parseReviewResponse('нет json'), /Непарсимый ответ/);
  assert.throws(() => parseReviewResponse('{"verdict":"maybe","issues":[]}'), /verdict/);
  assert.throws(() => parseReviewResponse('{"verdict":"fail","issues":[]}'), /непустой issues/);
  assert.throws(() => parseReviewResponse('{"verdict":"fail"}'), /issues должен быть массивом/);
  assert.throws(
    () => parseReviewResponse('{"verdict":"fail","issues":[{"problem":"x"}]}'),
    /fragment_en, fragment_ru, problem/,
  );
});

test('ретраи: два непарсимых ответа, затем pass на третьей попытке', async () => {
  const users = [];
  const result = await reviewWithRetry({
    prompt: PROMPT,
    callApi: async ({ user }) => {
      users.push(user);
      return users.length < 3 ? 'не JSON' : '{"verdict":"pass","issues":[]}';
    },
  });
  assert.equal(result.verdict, 'pass');
  assert.equal(result.attempts, 3);
  assert.equal(users.length, 3);
  assert.match(users[1], /Предыдущий ответ отклонён/);
});

test('ретраи: после трёх непарсимых ответов ошибка, побочных эффектов нет', async () => {
  let calls = 0;
  await assert.rejects(() => reviewWithRetry({
    prompt: PROMPT,
    callApi: async () => { calls++; return '{"verdict":"fail","issues":[]}'; },
  }), /после 3 попыток/);
  assert.equal(calls, 3);
});

test('drift-check: расхождение base/latest отклоняется до вызова advisor', async () => {
  const staleTree = new Map([[ENTRY.en, 'b'.repeat(40)]]);
  assert.throws(() => assertReviewCurrent(ENTRY, staleTree), /отстал от апстрима, сначала delta/);
  assert.throws(() => assertReviewCurrent(ENTRY, new Map()), /отстал от апстрима/);
  let calls = 0;
  let marks = 0;
  await assert.rejects(() => reviewTranslation(ENTRY, reviewOptions({
    tree: staleTree,
    callApi: async () => { calls++; return '{"verdict":"pass","issues":[]}'; },
    mark: () => { marks++; },
  })), /сначала delta/);
  assert.equal(calls, 0);
  assert.equal(marks, 0);
});

test('pass: вызывается mark-translated reviewed через внедрённый интерфейс', async () => {
  const marked = [];
  const result = await reviewTranslation(ENTRY, reviewOptions({
    callApi: async () => '{"verdict":"pass","issues":[]}',
    mark: (path) => marked.push(path),
  }));
  assert.equal(result.status, 'reviewed');
  assert.deepEqual(marked, [ENTRY.ru]);
});

test('fail: замечания печатаются, mark не вызывается, статус остаётся machine', async () => {
  const lines = [];
  let marks = 0;
  const result = await reviewTranslation(ENTRY, reviewOptions({
    callApi: async () => JSON.stringify({ verdict: 'fail', issues: [ISSUE] }),
    mark: () => { marks++; },
    log: { log: (line) => lines.push(line), error() {} },
  }));
  assert.equal(result.status, 'machine');
  assert.equal(marks, 0);
  assert.ok(lines.some((line) => line.includes('Нарушен глоссарий')));
  assert.ok(lines.some((line) => line.includes('EN: Change')));
  assert.ok(lines.some((line) => line.includes('RU: Перемена')));
});

test('advisor не настроен: ревью отложено без дерева, сети и смены статуса', async () => {
  const lines = [];
  let calls = 0;
  const result = await reviewTranslation(ENTRY, {
    cfg: null,
    callApi: async () => { calls++; throw new Error('сеть не должна вызываться'); },
    log: { log: (line) => lines.push(line), error() {} },
  });
  assert.deepEqual(result, { status: 'machine', deferred: true });
  assert.equal(calls, 0);
  assert.match(lines.join('\n'), /advisor не настроен, ревью отложено/);
});
