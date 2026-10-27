import { uzLatinToCyrillic } from './translit';
import { RU_DICTIONARY, RU_PATTERNS } from './ru';

export type Lang = 'uz' | 'uz-Cyrl' | 'ru';

export const LANGUAGES: Array<{ code: Lang; short: string; label: string; native: string; htmlLang: string }> = [
  { code: 'uz', short: 'UZ', label: 'O‘zbekcha', native: 'Lotin yozuvi', htmlLang: 'uz' },
  { code: 'uz-Cyrl', short: 'ЎЗ', label: 'Ўзбекча', native: 'Кирилл ёзуви', htmlLang: 'uz-Cyrl' },
  { code: 'ru', short: 'РУ', label: 'Русский', native: 'Русский язык', htmlLang: 'ru' },
];

export const DEFAULT_LANG: Lang = 'uz';
export const LANG_STORAGE_KEY = 'shortdoc_lang';

export const isLang = (value: unknown): value is Lang => value === 'uz' || value === 'uz-Cyrl' || value === 'ru';

// Turli xil tutuq belgilarini bitta ko‘rinishga keltiradi (lug‘atdan qidirish uchun)
const normalizeKey = (s: string) => s.replace(/[ʻʼ‘’`´]/g, "'").replace(/\s+/g, ' ').trim();

const ruMap = new Map<string, string>();
for (const [key, value] of Object.entries(RU_DICTIONARY)) {
  ruMap.set(normalizeKey(key), value);
}

function translateRu(text: string): string {
  const key = normalizeKey(text);
  const exact = ruMap.get(key);
  if (exact !== undefined) return exact;
  for (const [pattern, replacement] of RU_PATTERNS) {
    if (pattern.test(key)) {
      return key.replace(pattern, (...args) => {
        // Qamrab olingan guruhlarni ham lug‘at orqali tarjima qilishga urinib ko‘radi
        const groups = args.slice(1, -2) as string[];
        return replacement.replace(/\$(\d)/g, (_, n) => {
          const g = groups[Number(n) - 1] ?? '';
          return ruMap.get(normalizeKey(g)) ?? g;
        });
      });
    }
  }
  return text;
}

/**
 * Manba matni — o‘zbek lotin yozuvida. Boshlang‘ich va oxirgi bo‘sh joylar saqlanadi.
 */
export function translateText(text: string, lang: Lang): string {
  if (lang === 'uz' || !text) return text;
  if (!/[A-Za-z]/.test(text)) return text;
  const lead = text.match(/^\s*/)?.[0] ?? '';
  const trail = text.match(/\s*$/)?.[0] ?? '';
  const core = text.trim();
  if (!core) return text;
  const result = lang === 'uz-Cyrl' ? uzLatinToCyrillic(core) : translateRu(core);
  return lead + result + trail;
}
