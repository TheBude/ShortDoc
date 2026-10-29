'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api';

interface DocxLivePreviewProps {
  documentId: string;
  /** Imzolar holati o'zgarganda qiymati o'zgaradi va blanka qayta yuklanadi */
  version: string;
  allSigned: boolean;
  rejected: boolean;
}

/**
 * Hujjat blankasi (docx) real-time ko'rinishi: kelishuvchi va imzolovchilar imzolashdan oldin ham ko'ra oladi.
 * Hamma imzolagach "Jarayonda" belgisi "Imzolandi" ga almashadi.
 */
export function DocxLivePreview({ documentId, version, allSigned, rejected }: DocxLivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const render = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('shortdoc_token') : null;
      const res = await fetch(`${getApiBaseUrl()}/documents/${encodeURIComponent(documentId)}/docx-preview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Blankani yuklashda xatolik yuz berdi');
      }
      const blob = await res.blob();
      const { renderAsync } = await import('docx-preview');
      container.innerHTML = '';
      await renderAsync(blob, container, undefined, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Blankani ko‘rsatib bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    render();
  }, [render, version]);

  const badge = rejected
    ? { text: 'Rad etildi', cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
    : allSigned
    ? { text: 'Imzolandi', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    : { text: 'Jarayonda', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm transition-colors">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Hujjat blankasi (real-time)</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Blanka yuklanmoqda...</span>
        </div>
      )}
      {error && <div className="text-xs text-rose-600 dark:text-rose-400 py-3">{error}</div>}

      <div className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800/60">
        <div ref={containerRef} />
      </div>
    </div>
  );
}
