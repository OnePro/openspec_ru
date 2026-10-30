// Парсер glossary.md — единственного источника терминологии (design D1).
// Формат: markdown-таблица `| EN | RU | правило |`, правило ∈
// `переводить | не переводить | запрещено:<вариант>`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './manifest.mjs';

export const GLOSSARY_PATH = resolve(ROOT, 'glossary.md');

export const RULE_TRANSLATE = 'переводить';
export const RULE_KEEP = 'не переводить';
export const RULE_FORBID = 'запрещено';
const FORBID_PREFIX = 'запрещено:';

const HEADER_RE = /^\|\s*EN\s*\|\s*RU\s*\|\s*правило\s*\|\s*$/i;
const SEPARATOR_RE = /^\|[\s:-]+\|[\s:-]+\|[\s:-]+\|$/;

/**
 * Парсит текст glossary.md. Возвращает массив записей:
 * { en, ru, rule, forbidden?, line }.
 * rule ∈ 'переводить' | 'не переводить' | 'запрещено'.
 * Бросает Error на строке таблицы с неизвестным правилом или пустыми ячейками.
 */
export function parseGlossary(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries = [];
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!inTable) {
      if (HEADER_RE.test(raw)) inTable = true;
      continue;
    }
    if (!raw.startsWith('|')) {
      if (raw !== '') break; // конец таблицы
      continue;
    }
    if (SEPARATOR_RE.test(raw)) continue;
    const cells = raw.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3) {
      throw new Error(`glossary.md:${i + 1}: строка таблицы должна иметь 3 ячейки: ${raw}`);
    }
    const [en, ru, ruleCell] = cells;
    if (!en || !ru) {
      throw new Error(`glossary.md:${i + 1}: пустая ячейка EN или RU`);
    }
    let entry;
    if (ruleCell === RULE_TRANSLATE) {
      entry = { en, ru, rule: RULE_TRANSLATE, line: i + 1 };
    } else if (ruleCell === RULE_KEEP) {
      entry = { en, ru, rule: RULE_KEEP, line: i + 1 };
    } else if (ruleCell.startsWith(FORBID_PREFIX)) {
      const forbidden = ruleCell.slice(FORBID_PREFIX.length).trim();
      if (!forbidden) {
        throw new Error(`glossary.md:${i + 1}: правило «запрещено:» без варианта`);
      }
      entry = { en, ru, rule: RULE_FORBID, forbidden, line: i + 1 };
    } else {
      throw new Error(
        `glossary.md:${i + 1}: неизвестное правило «${ruleCell}»; ` +
        `допустимы: переводить | не переводить | запрещено:<вариант>`
      );
    }
    entries.push(entry);
  }
  if (entries.length === 0) {
    throw new Error('glossary.md: таблица терминов не найдена (ожидается заголовок | EN | RU | правило |)');
  }
  return entries;
}

/** Читает и парсит glossary.md. */
export function loadGlossary(path = GLOSSARY_PATH) {
  return parseGlossary(readFileSync(path, 'utf8'));
}

/** Записи с запрещёнными вариантами. */
export function forbiddenEntries(entries) {
  return entries.filter((e) => e.rule === RULE_FORBID);
}

/** Записи, EN-термины которых подлежат переводу (переводить + запрещено:...). */
export function translatableEntries(entries) {
  return entries.filter((e) => e.rule === RULE_TRANSLATE || e.rule === RULE_FORBID);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Граница термина: не буква/цифра/подчёркивание и не символы составных
// написаний и путей (. / -), чтобы «spec» не ловился в «OpenSpec»,
// «design» — в «design.md», «command» — в «/opsx:commands».
const BOUNDARY = String.raw`[\p{L}\p{N}_./-]`;

export function termRe(term) {
  // Кириллические термины склоняются, окончание меняется («правка» → «правку»),
  // поэтому ищем основу без финальной гласной. Граница слева строгая
  // («неправка» не ловится). Для EN-терминов границы строгие с двух сторон
  // («spec» не ловится в «OpenSpec», «design» — в «design.md»).
  if (/[\u0400-\u04FF]/.test(term)) {
    const stem = term.replace(/[аеёиоуыэюя]+$/u, '');
    return new RegExp(String.raw`(?<!${BOUNDARY})${escapeRe(stem)}[\u0400-\u04FF]*(?!\p{N})`, 'giu');
  }
  return new RegExp(`(?<!${BOUNDARY})${escapeRe(term)}(?!${BOUNDARY})`, 'giu');
}

/**
 * Маскирует зоны, которые глоссарий-линт игнорирует (spec: «Термины в коде
 * не проверяются»): frontmatter, fenced-код-блоки, inline-код, URL, цели
 * markdown-ссылок, HTML-комментарии (там живут машинные маркеры, которые
 * обязаны оставаться байт-в-байт). Символы заменяются пробелами, переносы
 * строк сохраняются — номера строк в отчётах остаются точными.
 * Для nemarkdown-файлов (TS) маскируются только URL.
 */
export function maskIgnoredZones(text, { markdown = true } = {}) {
  if (!markdown) {
    return text.replace(/https?:\/\/\S+/g, (m) => ' '.repeat(m.length));
  }
  const chars = text.split('');
  const mask = (from, to) => {
    for (let i = from; i < to; i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  };
  // 1. Frontmatter в начале файла.
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/);
  if (fm) mask(0, fm[0].length);
  // 2. Fenced-код-блоки (``` или ~~~).
  const fenceRe = /^[ \t]*(```+|~~~+).*$/gm;
  let open = null;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    if (open === null) {
      open = m.index;
    } else {
      mask(open, m.index + m[0].length);
      open = null;
    }
  }
  // 3. HTML-комментарии (многострочные).
  const commentRe = /<!--[\s\S]*?-->/g;
  while ((m = commentRe.exec(text)) !== null) mask(m.index, m.index + m[0].length);
  const masked1 = chars.join('');
  // 4. Inline-код.
  const masked2 = masked1.replace(/`[^`\n]*`/g, (s) => ' '.repeat(s.length));
  // 5. Цели markdown-ссылок и URL.
  const masked3 = masked2
    .replace(/\]\([^)]*\)/g, (s) => ' '.repeat(s.length))
    .replace(/https?:\/\/\S+/g, (s) => ' '.repeat(s.length));
  return masked3;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

/**
 * Глоссарий-линт RU-текста. Возвращает нарушения:
 * { file, line, kind: 'forbidden'|'untranslated', term, found, expected, message }.
 * detectUntranslated: искать ли EN-термины, оставшиеся непереведёнными
 * (для TS-файлов отключается — EN-слова там легальны как идентификаторы).
 */
export function lintGlossaryText(text, entries, { file = '<text>', markdown = true, detectUntranslated = true } = {}) {
  // Термины «не переводить» маскируются первыми (длинные раньше коротких):
  // им разрешено оставаться в тексте, и они не должны триггерить проверки
  // более коротких вложенных терминов («Spec Kit» не нарушение для «spec»).
  let masked = maskIgnoredZones(text, { markdown });
  const keeps = entries
    .filter((e) => e.rule === RULE_KEEP)
    .sort((a, b) => b.en.length - a.en.length);
  for (const e of keeps) {
    masked = masked.replace(termRe(e.en), (m) => ' '.repeat(m.length));
  }
  const violations = [];
  for (const e of forbiddenEntries(entries)) {
    const re = termRe(e.forbidden);
    let m;
    while ((m = re.exec(masked)) !== null) {
      violations.push({
        file, line: lineOf(masked, m.index), kind: 'forbidden',
        term: e.en, found: m[0], expected: e.ru,
        message: `${file}:${lineOf(masked, m.index)}: запрещённый вариант «${m[0]}» термина «${e.en}»; норматив: «${e.ru}»`,
      });
    }
  }
  if (detectUntranslated) {
    for (const e of translatableEntries(entries)) {
      const re = termRe(e.en);
      let m;
      while ((m = re.exec(masked)) !== null) {
        violations.push({
          file, line: lineOf(masked, m.index), kind: 'untranslated',
          term: e.en, found: m[0], expected: e.ru,
          message: `${file}:${lineOf(masked, m.index)}: непереведённый термин «${e.en}»; норматив: «${e.ru}»`,
        });
      }
    }
  }
  violations.sort((a, b) => a.line - b.line);
  return violations;
}
