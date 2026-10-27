// O‘zbek lotin yozuvidan kirill yoziga avtomatik o‘girish.
// Mazkur funksiya butun interfeys va bazadagi matnlar uchun ishlatiladi.

const APOSTROPHE = /[ʻʼ‘’'`´]/;

// Lotin harfida qoladigan qisqartmalar va texnik atamalar
const KEEP_LATIN = new Set([
  'QR', 'UUID', 'PDF', 'DOCX', 'XLSX', 'ZIP', 'SSL', 'RBAC', 'URL', 'API', 'EDMS', 'ID', 'IP', 'MB', 'KB', 'SD', 'ONE', 'HEMIS',
]);

const SINGLE: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з',
};

const isLetter = (ch: string | undefined) => !!ch && /[A-Za-z]/.test(ch);
const isUpper = (ch: string | undefined) => !!ch && ch !== ch.toLowerCase();

function convertWord(word: string): string {
  let out = '';
  let i = 0;
  while (i < word.length) {
    const ch = word[i];
    const lower = ch.toLowerCase();
    const next = word[i + 1];
    const nextLower = next ? next.toLowerCase() : '';
    const upper = isUpper(ch);
    const afterNextIsApostrophe = !!word[i + 2] && APOSTROPHE.test(word[i + 2]);
    const cap = (s: string) => (upper ? s.toUpperCase() : s);

    // o‘ -> ў, g‘ -> ғ
    if ((lower === 'o' || lower === 'g') && next && APOSTROPHE.test(next)) {
      out += cap(lower === 'o' ? 'ў' : 'ғ');
      i += 2;
      continue;
    }
    if (lower === 's' && nextLower === 'h') {
      out += cap('ш');
      i += 2;
      continue;
    }
    if (lower === 'c' && nextLower === 'h') {
      out += cap('ч');
      i += 2;
      continue;
    }
    if (lower === 't' && nextLower === 's') {
      out += cap('ц');
      i += 2;
      continue;
    }
    if (lower === 'n' && nextLower === 'g') {
      const bothUpper = upper && isUpper(next);
      out += bothUpper ? 'НГ' : cap('н') + 'г';
      i += 2;
      continue;
    }
    if (lower === 'y' && nextLower === 'o' && !afterNextIsApostrophe) {
      out += cap('ё');
      i += 2;
      continue;
    }
    if (lower === 'y' && nextLower === 'u') {
      out += cap('ю');
      i += 2;
      continue;
    }
    if (lower === 'y' && nextLower === 'a') {
      out += cap('я');
      i += 2;
      continue;
    }
    if (lower === 'y' && nextLower === 'e') {
      out += cap('е');
      i += 2;
      continue;
    }
    if (lower === 'e' && i === 0) {
      out += cap('э');
      i += 1;
      continue;
    }
    if (APOSTROPHE.test(ch)) {
      // so‘z o‘rtasidagi tutuq belgisi
      out += i > 0 && i < word.length - 1 && !APOSTROPHE.test(word[i - 1]) ? 'ъ' : ch;
      i += 1;
      continue;
    }
    const mapped = SINGLE[lower];
    out += mapped ? cap(mapped) : ch;
    i += 1;
  }
  return out;
}

function isProtectedToken(token: string): boolean {
  if (token.includes('@') || token.includes('://') || /^www\./i.test(token)) return true;
  if (/\.(docx?|xlsx?|pdf|zip|png|jpe?g|uz|com|org)\b/i.test(token)) return true;
  if (/^[0-9a-f-]{20,}$/i.test(token)) return true; // UUID
  if (/\d/.test(token) && /[A-Za-z]/.test(token) && token.replace(/[^A-Za-z0-9]/g, '').length >= 8) return true; // identifikatorlar
  if (/^SD-/.test(token)) return true;
  return false;
}

export function uzLatinToCyrillic(input: string): string {
  if (!input || !/[A-Za-z]/.test(input)) return input;
  return input.replace(/\S+/g, (token) => {
    if (isProtectedToken(token)) return token;
    return token.replace(/[A-Za-zʻʼ‘’'`´]+/g, (word) => {
      const core = word.replace(/^[ʻʼ‘’'`´]+|[ʻʼ‘’'`´]+$/g, '');
      if (!core || !isLetter(core[0])) return word;
      if (KEEP_LATIN.has(core)) return word;
      const lead = word.slice(0, word.indexOf(core));
      const trail = word.slice(lead.length + core.length);
      return lead + convertWord(core) + trail;
    });
  });
}

