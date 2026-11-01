// Доступ к апстриму через GitHub API без клонирования (см. design.md, D2).
// Поддерживает опциональный GITHUB_TOKEN для снятия rate limit.

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT } from './manifest.mjs';

const API = 'https://api.github.com';
const LOCAL_CACHE = resolve(ROOT, '.cache/upstream');

function hasLocalGit() {
  return existsSync(resolve(LOCAL_CACHE, '.git'));
}

/** Читает привязку к версии апстрима (единственный источник версии). */
export function readUpstream(path = resolve(ROOT, 'upstream.json')) {
  const { repo, tag, commit } = JSON.parse(readFileSync(path, 'utf8'));
  if (!repo || !tag || !commit) {
    throw new Error(`Невалидный upstream.json: требуются repo, tag, commit`);
  }
  return { repo, tag, commit };
}

async function apiGet(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'openspec-ru-drift-tools',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, { headers });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`GitHub API ${path}: HTTP ${res.status} ${res.statusText}\n${body.slice(0, 500)}`);
      }
      return res.json();
    } catch (err) {
      lastErr = err;
      if (String(err?.message || '').startsWith('GitHub API ') || attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  throw lastErr;
}

/**
 * Сверяет, что тег из привязки всё ещё указывает на записанный commit
 * (защита от перезаписи тега, design.md → Risks). Бросает явную ошибку.
 */
export async function verifyTagCommit(upstream) {
  if (hasLocalGit()) {
    try {
      const sha = execFileSync('git', ['-C', LOCAL_CACHE, 'rev-list', '-n', '1', upstream.tag], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (sha) {
        if (sha !== upstream.commit) {
          throw new Error(
            `Рассинхронизация тега: ${upstream.tag} указывает на ${sha}, ` +
            `а в upstream.json записан commit ${upstream.commit}. ` +
            `Тег апстрима был перезаписан — привязку нужно пересмотреть осознанно.`
          );
        }
        return sha;
      }
    } catch (err) {
      if (String(err?.message || '').startsWith('Рассинхронизация')) throw err;
    }
  }
  const ref = await apiGet(`/repos/${upstream.repo}/git/refs/tags/${upstream.tag}`);
  let sha = ref.object?.sha;
  let type = ref.object?.type;
  // Аннотированный тег: разворачиваем до commit.
  if (type === 'tag') {
    const tagObj = await apiGet(`/repos/${upstream.repo}/git/tags/${sha}`);
    sha = tagObj.object?.sha;
    type = tagObj.object?.type;
  }
  if (type !== 'commit' || sha !== upstream.commit) {
    throw new Error(
      `Рассинхронизация тега: ${upstream.tag} указывает на ${sha} (${type}), ` +
      `а в upstream.json записан commit ${upstream.commit}. ` +
      `Тег апстрима был перезаписан — привязку нужно пересмотреть осознанно.`
    );
  }
  return sha;
}

/**
 * Возвращает карту { path -> blob sha } для всех blob'ов дерева на пинned-теге.
 * Один запрос: GET /repos/{repo}/git/trees/{tag}?recursive=1
 */
export async function fetchTree(upstream) {
  if (hasLocalGit()) {
    try {
      const out = execFileSync('git', ['-C', LOCAL_CACHE, 'ls-tree', '-r', upstream.commit], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      const map = new Map();
      for (const line of out.trim().split('\n')) {
        const m = line.match(/^\d+\s+blob\s+([0-9a-f]{40})\t(.+)$/);
        if (m) map.set(m[2], m[1]);
      }
      if (map.size > 0) return map;
    } catch {
      // fallback to GitHub API
    }
  }
  const data = await apiGet(
    `/repos/${upstream.repo}/git/trees/${encodeURIComponent(upstream.tag)}?recursive=1`
  );
  if (data.truncated) {
    throw new Error('Дерево апстрима усечено GitHub API (truncated=true) — результат недостоверен');
  }
  const map = new Map();
  for (const item of data.tree) {
    if (item.type === 'blob') map.set(item.path, item.sha);
  }
  return map;
}

/** Скачивает содержимое blob по sha (строка utf8). */
export async function fetchBlob(upstream, sha) {
  if (hasLocalGit()) {
    try {
      return execFileSync('git', ['-C', LOCAL_CACHE, 'cat-file', 'blob', sha], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      // fallback to GitHub API
    }
  }
  const data = await apiGet(`/repos/${upstream.repo}/git/blobs/${sha}`);
  if (data.encoding !== 'base64') {
    throw new Error(`Неожиданная кодировка blob ${sha}: ${data.encoding}`);
  }
  return Buffer.from(data.content, 'base64').toString('utf8');
}

/** Список тегов апстрима (новые сверху, до 100 за страницу). */
export async function fetchTags(upstream) {
  const data = await apiGet(`/repos/${upstream.repo}/tags?per_page=100`);
  return data.map((t) => ({ name: t.name, commit: t.commit?.sha }));
}
