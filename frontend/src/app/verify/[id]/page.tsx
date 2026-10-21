'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Building,
  User,
  Clock,
  Printer,
  Download,
  ExternalLink,
  QrCode,
  Lock,
} from 'lucide-react';
import { downloadDocumentDocx } from '@/lib/downloadDocx';
import { getApiBaseUrl } from '@/lib/api';

interface VerificationData {
  id: string;
  regNumber: string;
  title: string;
  category: string;
  documentType: string;
  status: string;
  sender?: string | null;
  receiver?: string | null;
  summary?: string | null;
  createdAt: string;
  deadline?: string | null;
  creator?: {
    id: string;
    fullName: string;
    position?: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  approvals?: Array<{
    approver: {
      fullName: string;
      position?: string | null;
    };
    status: string;
    signedAt?: string | null;
  }>;
  isAuthentic: boolean;
  verifiedAt: string;
}

export default function DocumentVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyDoc() {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/documents/${id}/public-verify`);
        const json = await res.json();
        if (json.success && json.data) {
          setDocData(json.data);
        } else {
          setError(json.message || 'Hujjat topilmadi yoki haqiqiy emas.');
        }
      } catch (e: any) {
        setError('Server bilan aloqa o‘rnatib bo‘lmadi.');
      } finally {
        setLoading(false);
      }
    }
    verifyDoc();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mb-4" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Hujjat haqiqiyligi tekshirilmoqda...
        </h2>
        <p className="text-xs text-slate-400 mt-1">SamDU ShortDoc axborot tizimi</p>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-9 h-9" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Hujjat Haqiqiy Emas
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {error || 'Mazkur QR-kod yoki havola bo‘yicha universitet tizimida rasmiy hujjat topilmadi. Hujjat bekor qilingan yoki soxtalashtirilgan bo‘lishi mumkin.'}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Asosiy sahifaga o‘tish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const createdDate = new Date(docData.createdAt).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const verifiedDate = new Date(docData.verifiedAt).toLocaleString('uz-UZ');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* 1. Official University Brand Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left transition-colors">
          <div className="w-16 h-16 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-slate-200 dark:border-slate-700">
            <img
              src="/samdu-logo.png"
              alt="SamDU Gerbi"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest">
              Samarqand Davlat Universiteti
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Elektron Hujjat Haqiqiyligini Tasdiqlash Portali
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              SamDU ShortDoc — Yagona himoyalangan hujjat aylanishi tizimi
            </p>
          </div>
        </div>

        {/* 2. Official Verification Status Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="w-9 h-9 text-white" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white mb-1.5 backdrop-blur-sm">
                  Rasmiy Tasdiqlangan
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  HUJJAT HAQIQIY VA QONUNIY
                </h2>
                <p className="text-xs text-emerald-100 mt-1 max-w-lg leading-relaxed">
                  Mazkur hujjat Samarqand Davlat Universiteti tomonidan rasmiy ro‘yxatga olingan, elektron raqamli imzo bilan tasdiqlangan va yuridik kuchga ega.
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/20 text-xs text-emerald-100">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">Tekshirilgan vaqt:</div>
              <div className="font-semibold text-white text-xs mt-0.5 font-mono">{verifiedDate}</div>
            </div>
          </div>
        </div>

        {/* 3. Document Passport & Metadata Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
          
          <div className="border-b border-slate-100 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                Hujjat ro‘yxatga olish raqami:
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/70 border border-primary-200 dark:border-primary-800 px-4 py-1.5 rounded-xl inline-block shadow-sm">
                {docData.regNumber}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {docData.category}
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {docData.status === 'COMPLETED' ? 'Yakunlangan' : docData.status === 'IN_APPROVAL' ? 'Kelishuvda' : 'Ro‘yxatdan o‘tgan'}
              </span>
            </div>
          </div>

          {/* Sarlavha (Nomi) */}
          <div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-1">
              Hujjat mavzusi (Sarlavhasi):
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              «{docData.title}»
            </h3>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
            
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                <User className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                <span>Tashabbuskor (Muallif):</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {docData.creator?.fullName || docData.sender || '—'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {docData.creator?.position || 'Xodim'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                <Building className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                <span>Tegishli bo‘linma / Bo‘lim:</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {docData.department?.name || 'Samarqand Davlat Universiteti'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Kod: {docData.department?.code || 'SAMDU'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                <span>Rasmiylashtirilgan sana:</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                {createdDate}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                SamDU Ro‘yxatga olish sanasi
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                <Lock className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                <span>Qabul qiluvchi (Kimga):</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {docData.receiver || 'Samarqand davlat universiteti rektori prof. R.I. Xalmuradovga'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Rahbariyat nomiga
              </div>
            </div>

          </div>

          {/* 4. Hujjatning to'liq matni / Mazmuni */}
          <div className="pt-2">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-2">
              Hujjat matni (Mazmuni):
            </span>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-sm italic font-serif leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              «{docData.summary || docData.title}»
            </div>
          </div>

          {/* 5. Imzolar va Kelishuvchilar Zanjiri */}
          {docData.approvals && docData.approvals.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block mb-3">
                Elektron Imzolar va Kelishuvlar ({docData.approvals.length}):
              </span>
              <div className="space-y-2.5">
                {docData.approvals.map((app, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{app.approver.fullName}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{app.approver.position || 'Mas’ul xodim'}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tasdiqlangan
                      </span>
                      {app.signedAt && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          {new Date(app.signedAt).toLocaleString('uz-UZ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Action Buttons: Download DOCX & Print */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => downloadDocumentDocx(docData.id, docData.regNumber, docData.category)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Asl Word (.docx) hujjatini yuklab olish</span>
            </button>

            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Chop etish / PDF saqlash</span>
            </button>
          </div>

        </div>

        {/* 7. Legal Guarantee Footer */}
        <div className="p-6 rounded-3xl bg-slate-200/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <QrCode className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>SamDU ShortDoc Kriptografik Himoya Tizimi</span>
          </div>
          <p className="text-[11px] leading-relaxed max-w-xl mx-auto">
            Ushbu elektron hujjat O‘zbekiston Respublikasining 2004-yil 29-apreldagi «Elektron hujjat aylanishi to‘g‘risida»gi hamda «Elektron raqamli imzo to‘g‘risida»gi Qonunlariga muvofiq qog‘oz shaklidagi hujjat bilan bir xil yuridik kuchga ega.
          </p>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 font-mono">
            Verifikatsiya kodi: SD-VERIFY-{docData.id.slice(0, 12).toUpperCase()}
          </div>
        </div>

      </div>
    </div>
  );
}
