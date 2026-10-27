'use client';

import { DEPARTMENT_TYPE_LABELS } from '@/lib/departments';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { Department } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Building2, Plus, AlertCircle } from 'lucide-react';

export default function AdminDepartmentsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('DEPARTMENT');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    const res = await fetchApi<Department[]>('/departments');
    if (res.success && res.data) setDepartments(res.data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const res = await fetchApi('/departments', {
      method: 'POST',
      body: JSON.stringify({ name, code, type }),
    });

    setSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setName('');
      setCode('');
      setType('DEPARTMENT');
      loadDepartments();
    } else {
      setFormError(res.message || 'Xatolik yuz berdi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Fakultet va Bo‘limlar</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Universitet tashkiliy tuzilmasi va bo‘linmalarini boshqarish</p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Bo‘lim Qo‘shish</span>
          </button>
        )}
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Bo‘limlar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Bo‘lim nomi</th>
                  <th className="py-3 px-4">Qisqa kodi</th>
                  <th className="py-3 px-4">Turi</th>
                  <th className="py-3 px-4">Xodimlar soni</th>
                  <th className="py-3 px-4">Hujjatlar soni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {departments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{dep.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-primary-700 dark:text-primary-400">{dep.code}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {DEPARTMENT_TYPE_LABELS[dep.type] || dep.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{dep._count?.users || 0} nafar</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">{dep._count?.documents || 0} ta</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Telefon: jadval o‘rniga kartochkalar */}
        {!loading && (
          <div className="md:hidden p-2 grid gap-2">
            {departments.map((dep) => (
              <div
                key={dep.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-200/80 dark:border-slate-800"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{dep.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-primary-700 dark:text-primary-400">{dep.code}</span>
                  <span className="font-semibold text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {DEPARTMENT_TYPE_LABELS[dep.type] || dep.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>{dep._count?.users || 0} nafar</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{dep._count?.documents || 0} ta</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      {isModalOpen && (
        <Modal size="md">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Yangi Bo‘lim Qo‘shish</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Universitet yangi tuzilmasini ro‘yxatga olish</p>

          {formError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bo‘lim nomi *</label>
              <input
                type="text"
                required
                placeholder="Masalan: Xalqaro aloqalar bo‘limi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Qisqa unikal kodi *</label>
              <input
                type="text"
                required
                placeholder="Masalan: INTL-REL"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tuzilma turi</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              >
                <option value="RECTORATE">Rahbariyat</option>
                <option value="INSTITUTE">Institut</option>
                <option value="FACULTY">Fakultet</option>
                <option value="CHAIR">Kafedra</option>
                <option value="DEPARTMENT">Boshqarma / bo‘lim</option>
                <option value="CHANCELLERY">Devonxona</option>
                <option value="CENTER">Markaz</option>
              </select>
            </div>

            <div className="flex gap-2 sm:justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saqlanmoqda...' : 'Bo‘limni Yaratish'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
