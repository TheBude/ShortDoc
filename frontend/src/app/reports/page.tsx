'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi, getApiBaseUrl } from '@/lib/api';
import { Download, BarChart3, FileSpreadsheet, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const res = await fetchApi('/reports/dashboard');
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('shortdoc_token') : null;
      const url = `${baseUrl}/reports/export-excel`;

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Excel hisobotini yuklab olishda xatolik yuz berdi');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const today = new Date().toISOString().split('T')[0];
      link.download = `SamDU_ShortDoc_Hisobot_${today}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(error.message || 'Excel faylini yuklab olishda xatolik yuz berdi');
    } finally {
      setExporting(false);
    }
  };

  const counts = data?.counts || {};
  const departmentsStat = data?.departmentsStat || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Hisobotlar va Tahliliy Monitoring</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Universitet hujjat aylanishi statistikasi va Excel formatiga eksport</p>
        </div>

        <button
          type="button"
          disabled={exporting}
          onClick={handleExportExcel}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {exporting ? (
            <div className="w-4 h-4 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          )}
          <span>{exporting ? 'Excel tayyorlanmoqda...' : 'Excel (.xlsx) formatida yuklab olish'}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ijro Intizomi Samaradorligi</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {counts.total > 0
              ? `${Math.round(((counts.completed || 0) / counts.total) * 100)}%`
              : '100%'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hujjatlarning to‘liq yakunlanish ko‘rsatkichi</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Muddati O‘tgan Topshiriqlar</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{counts.overdue || 0} ta</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zudlik bilan choralar ko‘rilishi zarur</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jarayondagi Hujjatlar</span>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{counts.inExecution || 0} ta</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ijro nazoratida turgan masalalar</p>
        </div>
      </div>

      {/* Detailed Department Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors duration-200">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 shrink-0 text-slate-700 dark:text-slate-300" />
          <span>Bo‘limlar va Kafedralar Bo‘yicha Taqsimot</span>
        </h2>

        {loading ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Ma’lumotlar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Tashkiliy Bo‘linma</th>
                  <th className="py-3 px-4">Kodi</th>
                  <th className="py-3 px-4">Biriktirilgan Xodimlar</th>
                  <th className="py-3 px-4">Rasmiylashtirilgan Hujjatlar</th>
                  <th className="py-3 px-4">Faollik Ulushi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {departmentsStat.map((dep: any) => {
                  const share =
                    counts.total > 0
                      ? Math.round(((dep._count?.documents || 0) / counts.total) * 100)
                      : 0;

                  return (
                    <tr key={dep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{dep.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-primary-700 dark:text-primary-400">{dep.code}</td>
                      <td className="py-3 px-4">{dep._count?.users || 0} nafar</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">{dep._count?.documents || 0} ta</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary-600 h-full rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="font-medium text-slate-500 dark:text-slate-400">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Telefon: jadval o‘rniga kartochkalar */}
        {!loading && (
          <div className="md:hidden space-y-2">
            {departmentsStat.map((dep: any) => {
              const share =
                counts.total > 0
                  ? Math.round(((dep._count?.documents || 0) / counts.total) * 100)
                  : 0;

              return (
                <div
                  key={dep.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{dep.name}</h3>
                    <span className="font-mono font-bold text-xs text-primary-700 dark:text-primary-400">{dep.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{dep._count?.users || 0} nafar</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{dep._count?.documents || 0} ta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary-600 h-full rounded-full" style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{share}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
