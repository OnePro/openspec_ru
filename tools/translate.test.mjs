// Тесты LLM-раннера (задачи 3.2, 3.3): ретрай-цикл, обновление манифеста,
// разбор ответов обоих API-flavor — всё на моках, без сети.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyManifestSuccess,
  buildDeltaPrompt,
  buildFreshPrompt,
  callLlm,
  llmConfigFromEnv,
  translateWithRetry,
  unwrapFences,
} from './translate.mjs';
import { loadGlossary } from './lib/glossary.mjs';
import { readManifest, writeManifest } from './lib/manifest.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const glossary = loadGlossary();
const glossaryMd = readFileSync(new URL('../glossary.md', import.meta.url), 'utf8');
const styleGuideMd = readFileSync(new URL('../style-guide.md', import.meta.url), 'utf8');

const EN = '# Install\n\n```bash\nopenspec init\n```\n\nSee [docs](setup.md).\n';
const RU_OK = '# Установка\n\n```bash\nopenspec init\n```\n\nСм. [документы](setup.md).\n';

function promptArgs() {
  return {
    buildPrompt: () => buildFreshPrompt({ enPath: 'docs-lab/x.md', enContent: EN, area: 'docs-lab', glossaryMd, styleGuideMd }),
    enReference: EN,
    enPath: 'docs-lab/x.md',
    glossaryEntries: glossary,
  };
}

test('fresh-промпт: роль + глоссарий + стайлгайд + правила зоны + явные границы EN', () => {
  const { system, user } = buildFreshPrompt({ enPath: 'docs-lab/x.md', enContent: EN, area: 'docs-lab', glossaryMd, styleGuideMd });
  assert.match(system, /переводчик/i);
  assert.match(system, /ГЛОССАРИЙ/);
  assert.match(system, /\| change \| изменение \|/);
  assert.match(system, /СТАЙЛГАЙД/);
  assert.match(user, /Правила зоны:.*markdown/s);
  assert.match(user, /<<<SOURCE FILE: docs-lab\/x\.md>>>/);
  assert.match(user, /<<<END SOURCE FILE>>>/);
  assert.match(user, /игнорируй/);
});

test('delta-промпт: тройка (EN_old, diff, RU_old) + инструкция «только дельта»', () => {
  const { user } = buildDeltaPrompt({
    enPath: 'README.md', enOldContent: 'old', diff: '@@ -1 +1 @@', ruOldContent: 'старый перевод',
    area: 'meta', glossaryMd, styleGuideMd,
  });
  assert.match(user, /<<<OLD EN FILE: README\.md>>>/);
  assert.match(user, /<<<UPSTREAM DIFF/);
  assert.match(user, /<<<CURRENT RU FILE>>>/);
  assert.match(user, /Полный переперевод запрещён/);
  assert.match(user, /БАЙТ-В-БАЙТ/);
});

test('ретрай: испорченный ответ отклоняется, нарушения уходят в следующий промпт', async () => {
  const calls = [];
  const callApi = async ({ user }) => {
    calls.push(user);
    if (calls.length === 1) return '# Установка\n\nБез код-блока и ссылки.\n'; // испорчено
    return RU_OK;
  };
  const result = await translateWithRetry({ ...promptArgs(), callApi });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
  assert.match(calls[1], /отклонена детерминированным валидатором/);
  assert.match(calls[1], /код-блоки/);
  assert.match(calls[1], /ссылки\/якоря/);
});

test('ретрай: 3 испорченных ответа — отказ, ошибки последней попытки возвращаются', async () => {
  const callApi = async () => '# Установка\n\nПравка без блока.\n';
  const result = await translateWithRetry({ ...promptArgs(), callApi, maxAttempts: 3 });
  assert.equal(result.ok, false);
  assert.equal(result.attempts, 3);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some((e) => e.includes('код-блоки')));
});

test('манифест: успех поднимает статус/base, при отказе applyManifestSuccess не вызывается', () => {
  const dir = mkdtempSync(join(tmpdir(), 'openspec-ru-manifest-'));
  const path = join(dir, 'manifest.json');
  writeFileSync(path, readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'), 'utf8');
  const manifest = readManifest(path);
  const entry = manifest.entries[0];
  entry.latest_blob_sha = 'a'.repeat(40);
  const before = JSON.stringify(manifest.entries.filter((e) => e.en !== entry.en));

  // Успех: статус machine, base поднят, latest удалён.
  const updated = applyManifestSuccess(manifest, entry.en, 'b'.repeat(40));
  assert.equal(updated.status, 'machine');
  assert.equal(updated.base_blob_sha, 'b'.repeat(40));
  assert.equal(updated.latest_blob_sha, undefined);
  writeManifest(manifest, path);
  const reread = readManifest(path);
  assert.equal(reread.entries[0].base_blob_sha, 'b'.repeat(40));
  // Остальные записи не тронуты (симуляция отказа: без applyManifestSuccess файл не меняется).
  assert.equal(JSON.stringify(reread.entries.filter((e) => e.en !== entry.en)), before);
});

test('unwrapFences: снимает обёртку LLM, не трогает честный markdown', () => {
  assert.equal(unwrapFences('```markdown\n# A\n```\n', '# A'), '# A');
  assert.equal(unwrapFences('# A\n', '# A'), '# A\n');
  const fenced = '```\nreal first block\n```\n';
  const wrapped = `\`\`\`markdown\n${fenced}\`\`\``;
  assert.equal(unwrapFences(wrapped, fenced), wrapped); // EN сам начинается с fence — не снимаем
});

test('llmConfigFromEnv: дефолт openai, явный anthropic, ошибка на нехватку env', () => {
  const base = { TRANSLATE_API_BASE: 'https://x', TRANSLATE_API_KEY: 'k', TRANSLATE_API_MODEL: 'm' };
  assert.equal(llmConfigFromEnv(base).flavor, 'openai');
  assert.equal(llmConfigFromEnv({ ...base, TRANSLATE_API_FLAVOR: 'anthropic' }).flavor, 'anthropic');
  assert.throws(() => llmConfigFromEnv({ TRANSLATE_API_BASE: 'https://x' }), /TRANSLATE_API_KEY/);
  assert.throws(() => llmConfigFromEnv({ ...base, TRANSLATE_API_FLAVOR: 'xml' }), /openai или anthropic/);
});

test('callLlm anthropic: извлекаются только text-блоки, thinking игнорируется', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init };
    return {
      ok: true,
      json: async () => ({
        content: [
          { type: 'thinking', thinking: '...' },
          { type: 'text', text: 'Переведённый ' },
          { type: 'text', text: 'текст.' },
        ],
      }),
    };
  };
  const cfg = { base: 'https://api.example/coding', key: 'sekret', model: 'm', flavor: 'anthropic', maxTokens: 100 };
  const text = await callLlm({ system: 's', user: 'u' }, cfg, fetchImpl);
  assert.equal(text, 'Переведённый \nтекст.');
  assert.equal(seen.url, 'https://api.example/coding/v1/messages');
  assert.equal(seen.init.headers['x-api-key'], 'sekret');
  assert.equal(seen.init.headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(seen.init.body);
  assert.equal(body.temperature, 0);
  assert.equal(body.system, 's');
});

test('callLlm openai: chat-completions, bearer, температура 0', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Текст.' } }] }) };
  };
  const cfg = { base: 'https://api.example/v1', key: 'sekret', model: 'm', flavor: 'openai', maxTokens: 100 };
  const text = await callLlm({ system: 's', user: 'u' }, cfg, fetchImpl);
  assert.equal(text, 'Текст.');
  assert.equal(seen.url, 'https://api.example/v1/chat/completions');
  assert.equal(seen.init.headers.authorization, 'Bearer sekret');
  const body = JSON.parse(seen.init.body);
  assert.equal(body.temperature, 0);
  assert.deepEqual(body.messages.map((m) => m.role), ['system', 'user']);
});

test('callLlm: HTTP-ошибка пробрасывается без ключа в сообщении', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'bad key' });
  const cfg = { base: 'https://api.example', key: 'sekret', model: 'm', flavor: 'openai', maxTokens: 100 };
  await assert.rejects(() => callLlm({ system: 's', user: 'u' }, cfg, fetchImpl), (err) => {
    assert.match(err.message, /HTTP 401/);
    assert.ok(!err.message.includes('sekret'));
    return true;
  });
});
