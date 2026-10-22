'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { WelcomeLanding } from '@/components/WelcomeLanding';
import {
  FileText,
  FileCheck2,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Send,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [signModalDoc, setSignModalDoc] = useState<any | null>(null);
  const [signComment, setSignComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    const res = await fetchApi('/reports/dashboard');
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  const handleInstantSign = async (documentId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    const res = await fetchApi(`/documents/${documentId}/approvals`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        comments: signComment.trim() || (status === 'APPROVED' ? 'Tasdiqlandi va imzolandi.' : 'E’tiroz bilan qaytarildi.'),
      }),
    });
    setActionLoading(false);

    if (res.success) {
      setSignModalDoc(null);
      setSignComment('');
      loadDashboard();
    } else {
      alert(res.message || 'Xatolik yuz berdi');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // If visitor is not authenticated, render the Welcome Landing page!
  if (!user) {
    return <WelcomeLanding />;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const counts = data?.counts || {};
  const actionItems = data?.actionItems || {
    pendingSignatures: [],
    myTasks: [],
    mySubmitted: [],
  };

  const pendingDocs = actionItems.pendingSignatures || [];
  const myTasks = actionItems.myTasks || [];
  const mySubmitted = actionItems.mySubmitted || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Quick Summary Chips */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mening ishlarim
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Salom, <span className="font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</span>. Bugungi rejadagi barcha vazifalar:
            </p>
          </div>

          <Link
            href="/documents?create=true"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
          >
            <span>+ Yangi hujjat yaratish</span>
          </Link>
        </div>

        {/* Quick Clickable Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
          <Link
            href="/documents?pendingMySignature=true"
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Imzolashim kerak</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                counts.pendingSignatures > 0
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {counts.pendingSignatures || 0}
              </span>
            </div>
          </Link>

          <Link
            href="/tasks"
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Topshiriqlarim</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                counts.overdue > 0
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {counts.pendingTasks || 0}
              </span>
            </div>
          </Link>

          <Link
            href="/documents"
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Barcha hujjatlar</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {counts.total || 0}
              </span>
            </div>
          </Link>

          <Link
            href="/tasks"
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-rose-400 hover:bg-rose-50/40 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Muddati o‘tgan</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                counts.overdue > 0
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {counts.overdue || 0}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 2. SECTION: 🔴 Imzolashingiz kerak bo'lgan hujjatlar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Imzolashingiz kerak bo‘lgan hujjatlar ({pendingDocs.length})
            </h2>
          </div>
          {pendingDocs.length > 0 && (
            <Link
              href="/documents?pendingMySignature=true"
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Hammasini ko‘rish <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {pendingDocs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Ajoyib! Hozircha sizning imzongiz kutilayotgan hujjatlar yo‘q.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Yangi xatlar kelishi bilan shu yerda paydo bo‘ladi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDocs.map((doc: any) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                      {doc.regNumber}
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {doc.category || 'Bildirgi'}
                    </span>
                    {doc.priority === 'URGENT' && (
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                        Shoshilinch
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug truncate">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Kimdan: <strong className="text-slate-700 dark:text-slate-300 font-medium">{doc.creator?.fullName || doc.sender || 'Mas’ul xodim'}</strong>
                    {doc.department?.name && ` (${doc.department.name})`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Ko‘rish
                  </Link>
                  <button
                    onClick={() => setSignModalDoc(doc)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Imzolash</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SECTION: 🟠 Bajarishingiz kerak bo'lgan topshiriqlar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bajarishingiz kerak bo‘lgan topshiriqlar ({myTasks.length})
            </h2>
          </div>
          {myTasks.length > 0 && (
            <Link
              href="/tasks"
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Hammasini ko‘rish <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {myTasks.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Barcha topshiriqlar o‘z vaqtida bajarilgan!
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Sizga yuklatilgan faol vazifalar yo‘q.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTasks.map((t: any) => {
              const isOverdue = t.deadline && new Date(t.deadline) < new Date();
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isOverdue ? (
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Muddati o‘tdi
                        </span>
                      ) : t.deadline ? (
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Dedlayn: {new Date(t.deadline).toLocaleDateString('uz-UZ')}
                        </span>
                      ) : null}

                      {t.document?.regNumber && (
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {t.document.regNumber}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">
                      {t.title}
                    </h3>
                    {t.createdBy?.fullName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Topshiriq beruvchi: <span className="font-medium text-slate-700 dark:text-slate-300">{t.createdBy.fullName}</span>
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                    <Link
                      href="/tasks"
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <span>Bajarish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SECTION: ⚪ Siz yuborgan hujjatlar holati */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Siz yuborgan hujjatlar holati
            </h2>
          </div>
          <Link
            href="/documents"
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Barchasi <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {mySubmitted.length === 0 ? (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Siz hali hech qanday hujjat yaratmagansiz.
            </p>
            <Link
              href="/documents?create=true"
              className="inline-block mt-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              + Birinchi bildirgi yoki xatni yaratish
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mySubmitted.map((doc: any) => {
              const pendingApprover = doc.approvals?.find((a: any) => a.status === 'PENDING')?.approver?.fullName;
              return (
                <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{doc.regNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-md">{doc.title}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-500 dark:text-slate-400">
                      {pendingApprover ? (
                        <span>Hozirgi bosqich: <strong className="text-slate-700 dark:text-slate-200">{pendingApprover}</strong>da</span>
                      ) : doc.status === 'COMPLETED' ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">To‘liq tasdiqlangan</span>
                      ) : (
                        <span>Holati: {doc.status}</span>
                      )}
                    </span>
                    <Link
                      href={`/documents/${doc.id}`}
                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      Ochish
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK SIGN MODAL */}
      {signModalDoc && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                {signModalDoc.regNumber}
              </span>
              <span className="text-xs text-slate-500">{signModalDoc.category}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {signModalDoc.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              Yaratuvchi: <strong>{signModalDoc.creator?.fullName || 'Mas’ul xodim'}</strong>. Ushbu hujjatni ma’qullab elektron imzo qo‘ymoqchimisiz?
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Izoh yoki xulosa (ixtiyoriy):
              </label>
              <textarea
                value={signComment}
                onChange={(e) => setSignComment(e.target.value)}
                placeholder="E’tirozlar yo‘q, ma’qullandi..."
                rows={2}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSignModalDoc(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInstantSign(signModalDoc.id, 'REJECTED')}
                className="px-4 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold"
              >
                Qaytarish
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInstantSign(signModalDoc.id, 'APPROVED')}
                className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Imzolanmoqda...' : 'Tasdiqlash va imzo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
