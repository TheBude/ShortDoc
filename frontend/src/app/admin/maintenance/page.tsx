'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi, clearApiCache } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Trash2, AlertTriangle } from 'lucide-react';

const CONFIRM_PHRASE = 'TOZALASH';

const LABELS: Record<string, string> = {
  documents: 'Hujjatlar',
  files: 'Biriktirilgan fayllar',
  tasks: 'Vazifalar',
  approvals: 'Tasdiqlashlar',
  comments: 'Izohlar',
  notifications: 'Bildirishnomalar',
};

export default function AdminMaintenancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (user && !isSuperAdmin) router.replace('/');
  }, [user, isSuperAdmin, router]);

  const loadPreview = async () => {
    const res = await fetchApi('/admin/purge-documents/preview');
    if (res.success && res.data) setPreview(res.data);
  };

  useEffect(() => {
    if (isSuperAdmin) loadPreview();
  }, [isSuperAdmin]);

  const handlePurge = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetchApi('/admin/purge-documents', {
      method: 'POST',
      body: JSON.stringify({ confirm: phrase }),
    });
    setBusy(false);
    if (res.success) {
      clearApiCache();
      setPhrase('');
      setMessage({ ok: true, text: 'Barcha hujjatlar, fayllar va hisobotlar tozalandi.' });
      loadPreview();
    } else {
      setMessage({ ok: false, text: res.message || 'Tozalashda xatolik yuz berdi' });
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Ma’lumotlarni tozalash</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Barcha hujjat, fayl, vazifa va hisobotlarni o‘chirib, tizimni yangidan boshlash
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/60 shadow-sm p-5 space-y-4">
        <div className="flex gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Bu amal qaytarilmaydi. Foydalanuvchilar, bo‘limlar va audit jurnali saqlanadi, hujjat raqamlari esa 1 dan
            boshlanadi.
          </p>
        </div>

        {preview && (
          <ul className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
            {Object.entries(LABELS).map(([key, label]) => (
              <li key={key} className="flex justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <span>{label}</span>
                <span className="font-semibold">{preview[key] ?? 0}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Tasdiqlash uchun <span className="font-mono">{CONFIRM_PHRASE}</span> deb yozing
          </label>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            placeholder={CONFIRM_PHRASE}
          />
        </div>

        <button
          onClick={handlePurge}
          disabled={busy || phrase !== CONFIRM_PHRASE}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {busy ? 'Tozalanmoqda...' : 'Hammasini o‘chirish'}
        </button>

        {message && (
          <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
