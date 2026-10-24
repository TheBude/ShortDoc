import { getApiBaseUrl } from './api';

export const DOCX_LOCKED_HINT = 'Barcha kelishuvchilar imzolagandan so‘ng yuklab olish mumkin bo‘ladi';

/**
 * Viza zanjiri bo'lsa, Word faqat barcha kelishuvchilar tasdiqlagandan keyin yuklab olinadi
 */
export function isDocxAvailable(approvals?: Array<{ status: string }> | null): boolean {
  return !approvals || approvals.length === 0 || approvals.every((a) => a.status === 'APPROVED');
}

/**
 * Download a document in official Word (.docx) format
 */
export async function downloadDocumentDocx(
  documentId: string,
  regNumber?: string,
  category?: string,
  isPublic: boolean = false
) {
  try {
    if (!documentId) {
      throw new Error('Hujjat identifikatori topilmadi');
    }

    const baseUrl = getApiBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('shortdoc_token') : null;
    const url = isPublic
      ? `${baseUrl}/documents/${encodeURIComponent(documentId)}/public-docx`
      : `${baseUrl}/documents/${encodeURIComponent(documentId)}/docx`;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Hujjatni yuklab olishda xatolik yuz berdi');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    const safeRegNumber = (regNumber || 'hujjat').replace(/[\/\\:*"<>|]/g, '_');
    link.download = `${safeRegNumber}_${category || 'bildirishnoma'}.docx`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error: any) {
    console.error('Download error:', error);
    alert(error.message || 'Word hujjatini yuklab olishda xatolik yuz berdi');
  }
}
