'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { getAuditActionLabel, getAuditEntityLabel } from '@/lib/labels';
import { ShieldCheck, Calendar, User, Search } from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    const res = await fetchApi(`/audit-logs?page=${page}&limit=20`);
    if (res.success && res.data) {
      setLogs(res.data);
      if (res.meta) setTotalPages(res.meta.totalPages || 1);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tizim Xavfsizlik va Audit Jurnali</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hujjatlar, imzolar va tizimga kirishlar bo‘yicha to‘liq o‘zgarmas tarixiy yozuvlar
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Audit jurnali yuklanmoqda...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Jurnal yozuvlari topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Vaqt</th>
                  <th className="py-3 px-4">Amal turi</th>
                  <th className="py-3 px-4">Foydalanuvchi</th>
                  <th className="py-3 px-4">Obyekt</th>
                  <th className="py-3 px-4">Batafsil ma’lumot</th>
                  <th className="py-3 px-4">IP Manzil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {new Date(log.createdAt).toLocaleString('uz-UZ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded border border-primary-100 dark:border-primary-900/60">
                        {getAuditActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      {log.user?.fullName || 'Tizim'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{getAuditEntityLabel(log.entity)}</td>
                    <td className="py-3 px-4 max-w-md text-slate-800 dark:text-slate-200">{log.details || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400 dark:text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sahifa {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Oldingi
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
