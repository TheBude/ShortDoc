'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Search, ArrowRight, FileCheck, CheckCircle2 } from 'lucide-react';

export default function VerifyPortalIndexPage() {
  const router = useRouter();
  const [docId, setDocId] = useState('');
  const [error, setError] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = docId.trim();
    if (!cleanId) {
      setError('Iltimos, hujjat identifikatori yoki QR-kod havolasini kiriting');
      return;
    }

    // Agar to'liq URL kiritilgan bo'lsa, ID ni ajratib olamiz
    let targetId = cleanId;
    if (cleanId.includes('/verify/')) {
      const parts = cleanId.split('/verify/');
      targetId = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    router.push(`/verify/${encodeURIComponent(targetId)}`);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* SamDU Brand Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 text-left">
          <div className="w-16 h-16 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-slate-200 dark:border-slate-700">
            <img
              src="/samdu-logo.png"
              alt="SamDU Gerbi"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <div className="text-[11px] font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest">
              Samarqand Davlat Universiteti
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Elektron Hujjat Tekshirish Tizimi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              QR-kod va rasmiy rekvizitlar orqali haqiqiylikni tasdiqlash
            </p>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Hujjatni tekshirish
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hujjatdagi QR-kod ostidagi ID yoki havolani kiriting
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hujjat identifikatori (UUID yoki havola):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={docId}
                  onChange={(e) => {
                    setDocId(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Masalan: 3f52e5a4-9b24-4f51-8631-fca58f5ec443"
                  className="w-full pl-4 pr-11 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-mono"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors"
                  title="Tekshirish"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/30 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Hujjat haqiqiyligini tekshirish</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Elektron raqamli imzo himoyalangan
            </span>
            <Link href="/" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">
              Tizimga kirish
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
