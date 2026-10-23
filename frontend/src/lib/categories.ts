export interface CategoryMeta {
  key: string;
  label: string;
  badgeClass: string;
}

export const CATEGORY_DEFINITIONS: Record<string, CategoryMeta> = {
  BILDIRGI: {
    key: 'BILDIRGI',
    label: 'Bildirgi',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  OFFICIAL_NOTE: {
    key: 'OFFICIAL_NOTE',
    label: 'Xizmat xati',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  APPLICATION: {
    key: 'APPLICATION',
    label: 'Ariza',
    badgeClass: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  APPEAL: {
    key: 'APPEAL',
    label: 'Murojaat',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  ORDER: {
    key: 'ORDER',
    label: 'Buyruq',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  DECISION: {
    key: 'DECISION',
    label: 'Qaror',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  DIRECTIVE: {
    key: 'DIRECTIVE',
    label: 'Farmoyish',
    badgeClass: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  LETTER: {
    key: 'LETTER',
    label: 'Xat',
    badgeClass: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  CONTRACT: {
    key: 'CONTRACT',
    label: 'Shartnoma',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  REPORT: {
    key: 'REPORT',
    label: 'Hisobot',
    badgeClass: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  },
  ARCHIVE: {
    key: 'ARCHIVE',
    label: 'Arxiv',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
  OTHER: {
    key: 'OTHER',
    label: 'Boshqa',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
};

export const ALL_CATEGORIES_LIST = [
  { key: 'BILDIRGI', label: 'Bildirgi' },
  { key: 'OFFICIAL_NOTE', label: 'Xizmat xati' },
  { key: 'APPLICATION', label: 'Ariza' },
  { key: 'APPEAL', label: 'Murojaat' },
  { key: 'ORDER', label: 'Buyruq' },
  { key: 'DECISION', label: 'Qaror' },
  { key: 'DIRECTIVE', label: 'Farmoyish' },
  { key: 'LETTER', label: 'Xat' },
  { key: 'CONTRACT', label: 'Shartnoma' },
  { key: 'REPORT', label: 'Hisobot' },
  { key: 'ARCHIVE', label: 'Arxiv' },
  { key: 'OTHER', label: 'Boshqa' },
];

export function getCategoryMeta(category?: string | null): CategoryMeta {
  if (!category) return CATEGORY_DEFINITIONS.BILDIRGI;
  const clean = category.trim();
  const upper = clean.toUpperCase();

  if (CATEGORY_DEFINITIONS[upper]) {
    return CATEGORY_DEFINITIONS[upper];
  }

  if (upper.includes('BILDIR')) return CATEGORY_DEFINITIONS.BILDIRGI;
  if (upper.includes('XIZMAT') || upper.includes('NOTE')) return CATEGORY_DEFINITIONS.OFFICIAL_NOTE;
  if (upper.includes('ARIZA') || upper.includes('APPLICATION')) return CATEGORY_DEFINITIONS.APPLICATION;
  if (upper.includes('MUROJAAT') || upper.includes('APPEAL') || upper.includes('SHIKOYAT') || upper.includes('TAKLIF')) return CATEGORY_DEFINITIONS.APPEAL;
  if (upper.includes('BUYRU') || upper.includes('ORDER')) return CATEGORY_DEFINITIONS.ORDER;
  if (upper.includes('QAROR') || upper.includes('DECISION')) return CATEGORY_DEFINITIONS.DECISION;
  if (upper.includes('FARMOYISH') || upper.includes('DIRECTIVE')) return CATEGORY_DEFINITIONS.DIRECTIVE;
  if (upper.includes('SHARTNOMA') || upper.includes('CONTRACT')) return CATEGORY_DEFINITIONS.CONTRACT;
  if (upper.includes('HISOBOT') || upper.includes('REPORT')) return CATEGORY_DEFINITIONS.REPORT;
  if (upper.includes('ARXIV') || upper.includes('ARCHIVE')) return CATEGORY_DEFINITIONS.ARCHIVE;
  if (upper.includes('XAT') || upper.includes('LETTER')) return CATEGORY_DEFINITIONS.LETTER;

  return {
    key: 'OTHER',
    label: clean,
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
}

export function getCategoryLabel(category?: string | null): string {
  return getCategoryMeta(category).label;
}

export function getCategoryBadgeClass(category?: string | null): string {
  return getCategoryMeta(category).badgeClass;
}
