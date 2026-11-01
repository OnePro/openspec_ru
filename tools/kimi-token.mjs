#!/usr/bin/env node
// Печатает свежий access token Kimi Coding (OAuth) для LLM-раннера.
//
// Токен берётся из ~/.pi/agent/auth.json (kimi-coding); если до истечения
// меньше запаса (по умолчанию 5 минут), выполняется refresh через
// POST https://auth.kimi.com/api/oauth/token. Ротации refresh-токена нет
// (проверено 2026-10-31), поэтому внешние скрипты могут обновлять токен,
// не ломая pi-сессию. Auth-файл не перезаписывается.
//
// Использование:
//   export TRANSLATE_API_KEY=$(node tools/kimi-token.mjs)
//
// Опции env:
//   KIMI_AUTH_JSON   путь к auth.json (default: ~/.pi/agent/auth.json)
//   KIMI_TOKEN_MARGIN_SEC  запас до истечения в секундах (default: 300)

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const AUTH_JSON = resolve(process.env.KIMI_AUTH_JSON ?? join(homedir(), '.pi', 'agent', 'auth.json'));
const MARGIN_MS = Number(process.env.KIMI_TOKEN_MARGIN_SEC ?? 300) * 1000;
const OAUTH_TOKEN_URL = 'https://auth.kimi.com/api/oauth/token';
const CLIENT_ID = '17e5f671-d194-4dfb-9706-5516cb48c098';

function readKimiAuth() {
  const raw = JSON.parse(readFileSync(AUTH_JSON, 'utf8'));
  const kc = raw['kimi-coding'];
  if (!kc?.refresh) throw new Error(`В ${AUTH_JSON} нет kimi-coding.refresh`);
  return kc;
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Kimi OAuth refresh: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('Kimi OAuth refresh: в ответе нет access_token');
  return data.access_token;
}

const kc = readKimiAuth();
const fresh = kc.expires - Date.now() > MARGIN_MS;
const token = fresh ? kc.access : await refreshAccessToken(kc.refresh);
process.stdout.write(token);
