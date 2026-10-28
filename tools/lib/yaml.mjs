// Минимальный YAML-парсер без зависимостей для валидатора переводов (design D2).
// Поддерживает подмножество YAML, используемое в schemas/ апстрима:
// вложенные map/seq по отступам, блочные скаляры `|`/`>` (с chomping -/+),
// flow-значения ([] [a, b], кавычки, числа, boolean, null), комментарии
// целых строк. Не поддерживает: anchors/aliases, multi-line plain scalar,
// flow-map {}, теги. Неподдерживаемый ввод даёт явную ошибку, а не молчаливо
// неверный результат.

/**
 * Парсит YAML-текст в JS-значение (object/array/string/number/boolean/null).
 * Бросает Error с номером строки на неподдерживаемых конструкциях.
 */
export function parseYaml(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let pos = 0;

  const isBlank = (l) => /^\s*(#.*)?$/.test(l);
  const indentOf = (l) => l.match(/^ */)[0].length;

  function skipBlank() {
    while (pos < lines.length && (isBlank(lines[pos]) || lines[pos] === '---' || lines[pos] === '...')) pos++;
  }

  function fail(message) {
    throw new Error(`YAML: строка ${pos + 1}: ${message}`);
  }

  function parseNode(indent) {
    skipBlank();
    if (pos >= lines.length) return null;
    const ind = indentOf(lines[pos]);
    if (ind < indent) return null;
    const content = lines[pos].slice(ind);
    if (content === '-' || content.startsWith('- ')) return parseSeq(ind);
    return parseMap(ind);
  }

  function splitKey(content) {
    // Ключ — простой скаляр до первого ':' с пробелом/EOL после.
    const m = content.match(/^([^:]+)(:(?:\s(.*))?)$/);
    if (!m) return null;
    return { key: m[1].trim(), rest: m[3] };
  }

  function parseMap(indent) {
    const obj = {};
    while (true) {
      skipBlank();
      if (pos >= lines.length) break;
      const line = lines[pos];
      const ind = indentOf(line);
      if (ind < indent) break;
      const content = line.slice(ind);
      if (content === '-' || content.startsWith('- ')) break;
      if (ind > indent) fail(`неожиданный отступ: ${line.trim()}`);
      const kv = splitKey(content);
      if (!kv) fail(`ожидалась пара «ключ: значение»: ${content}`);
      if (kv.rest === undefined) {
        pos++;
        obj[kv.key] = parseNode(indent + 1);
      } else if (/^[|>]/.test(kv.rest)) {
        pos++;
        obj[kv.key] = parseBlockScalar(indent, kv.rest);
      } else {
        obj[kv.key] = parseFlow(kv.rest.trim());
        pos++;
      }
    }
    return obj;
  }

  function parseSeq(indent) {
    const arr = [];
    while (true) {
      skipBlank();
      if (pos >= lines.length) break;
      const line = lines[pos];
      const ind = indentOf(line);
      if (ind < indent) break;
      if (ind > indent) fail(`неожиданный отступ в списке: ${line.trim()}`);
      let content = line.slice(ind);
      if (content !== '-' && !content.startsWith('- ')) break;
      content = content === '-' ? '' : content.slice(2);
      if (content === '') {
        pos++;
        arr.push(parseNode(indent + 1));
      } else if (splitKey(content)) {
        // «- ключ: значение» — начало map с виртуальным отступом после «- ».
        lines[pos] = ' '.repeat(ind + 2) + content;
        arr.push(parseMap(ind + 2));
      } else {
        arr.push(parseFlow(content.trim()));
        pos++;
      }
    }
    return arr;
  }

  function parseBlockScalar(parentIndent, header) {
    if (!/^[|>][+-]?$/.test(header)) fail(`неподдерживаемый заголовок блочного скаляра: ${header}`);
    const literal = header[0] === '|';
    const collected = [];
    let blockIndent = null;
    while (pos < lines.length) {
      const line = lines[pos];
      if (isBlank(line)) {
        collected.push('');
        pos++;
        continue;
      }
      const ind = indentOf(line);
      if (ind <= parentIndent) break;
      if (blockIndent === null) blockIndent = ind;
      collected.push(line.slice(Math.min(blockIndent, ind)));
      pos++;
    }
    while (collected.length > 0 && collected[collected.length - 1] === '') collected.pop();
    let text = literal ? collected.join('\n') : foldLines(collected);
    if (!header.includes('-')) text += '\n';
    return text;
  }

  function foldLines(folded) {
    let out = '';
    for (const line of folded) {
      if (line === '') {
        out = out.replace(/ $/, '');
        out += '\n';
      } else {
        out += (out === '' || out.endsWith('\n') ? '' : ' ') + line;
      }
    }
    return out;
  }

  function splitFlow(inner) {
    const parts = [];
    let depth = 0;
    let quote = null;
    let cur = '';
    for (const ch of inner) {
      if (quote) {
        cur += ch;
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        cur += ch;
      } else if (ch === '[' || ch === '{') {
        depth++;
        cur += ch;
      } else if (ch === ']' || ch === '}') {
        depth--;
        cur += ch;
      } else if (ch === ',' && depth === 0) {
        parts.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim() !== '') parts.push(cur.trim());
    return parts;
  }

  function parseFlow(v) {
    if (v === '[]') return [];
    if (v === '{}') return {};
    if (v.startsWith('[')) {
      if (!v.endsWith(']')) fail(`незакрытый flow-список: ${v}`);
      const inner = v.slice(1, -1).trim();
      return inner === '' ? [] : splitFlow(inner).map(parseFlow);
    }
    if (v.startsWith('{')) fail(`flow-map не поддерживается: ${v}`);
    if (v.startsWith('"')) {
      if (v.length < 2 || !v.endsWith('"')) fail(`незакрытая двойная кавычка: ${v}`);
      return v.slice(1, -1).replace(/\\(["\\/nrt])/g, (_, c) => ({
        '"': '"', '\\': '\\', '/': '/', n: '\n', r: '\r', t: '\t',
      })[c]);
    }
    if (v.startsWith("'")) {
      if (v.length < 2 || !v.endsWith("'")) fail(`незакрытая одинарная кавычка: ${v}`);
      return v.slice(1, -1).replace(/''/g, "'");
    }
    if (/^(null|~)$/i.test(v)) return null;
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^-?\d+$/.test(v)) return Number.parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return Number.parseFloat(v);
    if (/[*&!%@`]/.test(v[0])) fail(`неподдерживаемая конструкция (anchor/alias/tag): ${v}`);
    return v;
  }

  const result = parseNode(0);
  skipBlank();
  if (pos < lines.length) fail(`хвост после корневого узла: ${lines[pos].trim()}`);
  return result;
}
