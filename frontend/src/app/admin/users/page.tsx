'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { User, Department } from '@/types';
import { Users, Plus, Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STAFF',
    position: '',
    phone: '',
    departmentId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [uRes, dRes] = await Promise.all([
      fetchApi<User[]>('/users'),
      fetchApi<Department[]>('/departments'),
    ]);
    if (uRes.success && uRes.data) setUsers(uRes.data);
    if (dRes.success && dRes.data) setDepartments(dRes.data);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const res = await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    setSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'STAFF',
        position: '',
        phone: '',
        departmentId: '',
      });
      loadData();
    } else {
      setFormError(res.message || 'Xatolik yuz berdi');
    }
  };

  const handleToggleActive = async (u: User) => {
    setUsers((prev) =>
      prev.map((item) => (item.id === u.id ? { ...item, isActive: !item.isActive } : item))
    );
    const res = await fetchApi(`/users/${u.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (!res.success) {
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Foydalanuvchilarni Boshqarish</h1>
          <p className="text-xs text-slate-500 mt-1">Universitet xodimlari hisoblarini boshqarish va rollar taqsimoti</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Xodim Qo‘shish</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Foydalanuvchilar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">F.I.Sh</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Tizimdagi Roli</th>
                  <th className="py-3 px-4">Bo‘lim / Fakultet</th>
                  <th className="py-3 px-4">Lavozim</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{u.fullName}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">{u.department?.name || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{u.position}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Faol
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Bloklangan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'Bloklash' : 'Faollashtirish'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Yangi Xodim Qo‘shish</h2>
            <p className="text-xs text-slate-500 mb-4">Tizim foydalanuvchisi uchun login, rol va bo‘limni belgilang</p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">To‘liq F.I.Sh *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Toirov Sardor Rustamovich"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (Login) *</label>
                  <input
                    type="email"
                    required
                    placeholder="xodim@shortdoc.uz"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Boshlang‘ich Parol *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tizimdagi Roli *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  >
                    <option value="STAFF">Oddiy Xodim / O‘qituvchi</option>
                    <option value="DEPARTMENT_HEAD">Bo‘lim / Kafedra rahbari</option>
                    <option value="CHANCELLERY">Devonxona xodimi</option>
                    <option value="LEADERSHIP">Rektorat (Rahbariyat)</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bo‘lim / Fakultet</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  >
                    <option value="">Bo‘limni tanlang...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lavozim *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Dotsent, Bosh mutaxassis..."
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefon raqam</label>
                  <input
                    type="text"
                    placeholder="+998901234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Foydalanuvchini Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
