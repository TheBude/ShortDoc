import { DocumentCategory } from '@prisma/client';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  ORDER: 'Rektor buyrug‘i',
  DECISION: 'Kengash qarori',
  DIRECTIVE: 'Farmoyish',
  BILDIRGI: 'Bildirgi',
  OFFICIAL_NOTE: 'Xizmat xati',
  APPLICATION: 'Ariza',
  APPEAL: 'Murojaat',
  LETTER: 'Rasmiy xat',
  CONTRACT: 'Shartnoma',
  REPORT: 'Hisobot',
  ARCHIVE: 'Arxiv hujjati',
  OTHER: 'Boshqa',
};

export function parseDocumentCategory(val?: string | null): DocumentCategory {
  if (!val) return 'BILDIRGI' as DocumentCategory;
  const upper = val.toUpperCase().trim();
  if (upper in DocumentCategory) {
    return upper as DocumentCategory;
  }
  const lower = val.toLowerCase().trim();
  if (lower.includes('buyru')) return 'ORDER' as DocumentCategory;
  if (lower.includes('qaror')) return 'DECISION' as DocumentCategory;
  if (lower.includes('farmoyish')) return 'DIRECTIVE' as DocumentCategory;
  if (lower.includes('bildir')) return 'BILDIRGI' as DocumentCategory;
  if (lower.includes('xizmat')) return 'OFFICIAL_NOTE' as DocumentCategory;
  if (lower.includes('ariza')) return 'APPLICATION' as DocumentCategory;
  if (lower.includes('murojaat') || lower.includes('shikoyat') || lower.includes('taklif')) return 'APPEAL' as DocumentCategory;
  if (lower.includes('shartnoma') || lower.includes('hamkorlik')) return 'CONTRACT' as DocumentCategory;
  if (lower.includes('hisobot')) return 'REPORT' as DocumentCategory;
  if (lower.includes('arxiv')) return 'ARCHIVE' as DocumentCategory;
  if (lower.includes('xat')) return 'LETTER' as DocumentCategory;
  return 'OTHER' as DocumentCategory;
}
