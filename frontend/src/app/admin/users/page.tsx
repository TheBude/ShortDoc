'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { fetchApi } from '@/lib/api';
import { getRoleLabel } from '@/lib/labels';
import { User, Department, Role } from '@/types';
import {
  Users,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Phone,
  Building2,
  Briefcase,
  Mail,
  Calendar,
  Check,
  X,
  ShieldAlert,
  FileCheck2,
  Layers,
  Sparkles
} from 'lucide-react';
import { UserModal } from '@/components/users/UserModal';
import { UserCredentialsModal } from '@/components/users/UserCredentialsModal';

// Helper to determine role and platform capabilities dynamically based on department & position
function getDepartmentScope(deptName: string = '', position: string = '') {
  const d = deptName.toLowerCase();
  const p = position.toLowerCase();

  const standardBadge = 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';

  if (d.includes('rektor') || p.includes('rektor') || p.includes('prorektor')) {
    return {
      roleTitle: 'Rahbariyat',
      roleBadgeColor: standardBadge,
      capabilities: [
        'Universitet bo‘yicha umumiy ijro intizomi va barcha hujjatlar nazorati',
        'Rasmiy buyruq loyihalari va xizmat xatlariga yakuniy imzo qo‘yish',
        'Barcha bo‘lim va kafedralar kesimidagi kechikishlar va analitik hisobotlarni ko‘rish',
      ],
    };
  }

  if (d.includes('devon') || p.includes('devonxona')) {
    return {
      roleTitle: 'Devonxona',
      roleBadgeColor: standardBadge,
      capabilities: [
        'Kiruvchi va chiquvchi rasmiy hujjatlarni ro‘yxatga olish va ro‘yxat raqami berish',
        'Hujjatlarni rektoratga, fakultetlarga va ijrochi bo‘limlarga yo‘naltirish',
        'Ijro intizomi muddatlarini belgilash va nazorat kartochkalarini yuritish',
      ],
    };
  }

  if (
    p.includes('boshlig') ||
    p.includes('mudir') ||
    p.includes('dekan') ||
    p.includes('rahbar') ||
    p.includes('boshliq')
  ) {
    return {
      roleTitle: 'Bo‘lim / Kafedra rahbari',
      roleBadgeColor: standardBadge,
      capabilities: [
        'Bo‘lim nomidan rasmiy bildirgi, xizmat xatlari va buyruq loyihalarini kiritish',
        'O‘z bo‘limi mutaxassislariga topshiriqlarni taqsimlash va ijrosini nazorat qilish',
        'Ichki kelishuv jarayonida o‘z bo‘linmasi nomidan rasmiy imzo qo‘yish',
      ],
    };
  }

  if (
    d.includes('raqamli') ||
    d.includes('atm') ||
    d.includes('hemis') ||
    d.includes('dastur') ||
    d.includes('axborot')
  ) {
    return {
      roleTitle: 'Axborot texnologiyalari / Raqamli ta’lim mutaxassisi',
      roleBadgeColor: standardBadge,
      capabilities: [
        'Universitet AT tizimlari (HEMIS, ATM, tarmoq) bo‘yicha topshiriqlar ijrosini ta’minlash',
        'Texnik xizmat ko‘rsatish va yangilanishlar bo‘yicha dasturiy hisobot fayllarini yuklash',
        'O‘z bo‘limi nomidan texnik ehtiyojlar va bildirgilar loyihalarini yaratish',
      ],
    };
  }

  if (d.includes('qabul') || d.includes('magistr') || d.includes('bakalavr')) {
    return {
      roleTitle: 'Qabul bo‘limi mutaxassisi',
      roleBadgeColor: standardBadge,
      capabilities: [
        'Qabul jarayoniga oid rasmiy xatlar, arizalar va buyruq loyihalarini kiritish',
        'Rahbariyat va vazirlikdan kelgan topshiriqlar ijrosi bo‘yicha hisobot taqdim etish',
      ],
    };
  }

  if (d.includes('baholash') || d.includes('bilim') || d.includes('test')) {
    return {
      roleTitle: 'Baholash va nazorat mutaxassisi',
      roleBadgeColor: standardBadge,
      capabilities: [
        'Yakuniy nazoratlar va monitoring natijalari bo‘yicha xizmat xatlarini tayyorlash',
        'O‘quv jarayoni va bilim sifatini baholash bo‘yicha analitik ma’lumotlarni yuborish',
      ],
    };
  }

  // Default staff
  return {
    roleTitle: 'Bo‘lim xodimi / Ijrochi',
    roleBadgeColor: standardBadge,
    capabilities: [
      'Bo‘lim nomidan xizmat xatlari va bildirgilar yaratish',
      'Biriktirilgan topshiriqlarni belgilangan muddatda bajarish va hisobot fayllarini kiritish',
      'Hujjatlar muhokamalarida qatnashish va ijro holatini yangilash',
    ],
  };
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { refreshCounts, refreshNotifications } = useRealtime();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Tab: 'all' or 'pending'
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [credentialsTarget, setCredentialsTarget] = useState<User | null>(null);

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
    loadData(1);
  }, []);

  const loadData = async (targetPage = page) => {
    setLoading(true);
    const [uRes, dRes] = await Promise.all([
      fetchApi<User[]>(`/users?page=${targetPage}&limit=20`),
      fetchApi<Department[]>('/departments'),
    ]);
    if (uRes.success && uRes.data) {
      setUsers(uRes.data);
      if (uRes.meta) {
        setPage(uRes.meta.page || 1);
        setTotalPages(uRes.meta.totalPages || 1);
        setTotalUsers(uRes.meta.total || 0);
      }
    }
    if (dRes.success && dRes.data) setDepartments(dRes.data);
    setLoading(false);
  };

  const pendingUsers = users.filter((u) => u.registrationStatus === 'PENDING' || !u.isActive);
  const activeUsers = users.filter((u) => u.registrationStatus !== 'PENDING' && u.isActive);

  // Approve a pending user (No manual role selection needed - fully automated by Department/Position)
  const handleApprove = async (u: User) => {
    setActionLoadingId(u.id);

    const res = await fetchApi(`/users/${u.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    setActionLoadingId(null);
    if (res.success) {
      loadData();
      refreshCounts();
      refreshNotifications();
    } else {
      alert(res.message || 'Tasdiqlashda xatolik yuz berdi');
    }
  };

  // Reject a pending user
  const handleReject = async (u: User) => {
    if (!confirm(`${u.fullName} arizasini rad etishni tasdiqlaysizmi?`)) {
      return;
    }

    setActionLoadingId(u.id);
    const res = await fetchApi(`/users/${u.id}/reject`, {
      method: 'POST',
    });

    setActionLoadingId(null);
    if (res.success) {
      loadData();
      refreshCounts();
      refreshNotifications();
    } else {
      alert(res.message || 'Rad etishda xatolik yuz berdi');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (formData.password.length < 8) {
      setFormError('Boshlang‘ich parol kamida 8 ta belgidan iborat bo‘lishi shart');
      setSubmitting(false);
      return;
    }

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

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`${u.fullName} (${u.email}) hisobini butunlay o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.`)) {
      return;
    }

    setActionLoadingId(u.id);
    const res = await fetchApi(`/users/${u.id}`, { method: 'DELETE' });
    setActionLoadingId(null);

    if (res.success) {
      loadData();
    } else {
      alert(res.message || 'O‘chirishda xatolik yuz berdi');
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Foydalanuvchilarni Boshqarish</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Universitet xodimlari hisoblarini boshqarish, yangi arizalarni tasdiqlash va bo‘limlar bo‘yicha vakolatlarni monitoring qilish
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Xodim Qo‘shish</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Yangi Arizalar (Kutilayotganlar)</span>
          {pendingUsers.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-extrabold animate-pulse">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-900 dark:text-primary-200 border border-primary-200 dark:border-primary-800 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span>Barcha Foydalanuvchilar ({activeUsers.length})</span>
        </button>
      </div>

      {/* PENDING APPLICANTS TAB */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 shadow-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
              <p className="text-xs">Arizalar yuklanmoqda...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Kutilayotgan yangi arizalar mavjud emas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Barcha yangi ro‘yxatdan o‘tgan xodimlarning arizalari ko‘rib chiqilgan va tasdiqlangan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pendingUsers.map((u) => {
                const scope = getDepartmentScope(u.department?.name, u.position);

                return (
                  <div
                    key={u.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/80 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-2.5 h-full bg-gradient-to-b from-amber-400 to-amber-500" />

                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 mb-1.5 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Ariza ko‘rib chiqilmoqda</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{u.fullName}</h3>
                        </div>

                        {/* Auto assigned role badge */}
                        <div
                          className={`px-3 py-1 rounded-xl text-xs font-bold border ${scope.roleBadgeColor}`}
                        >
                          {scope.roleTitle}
                        </div>
                      </div>

                      {/* Contact & Department Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white truncate">{u.email}</span>
                        </div>
                        {u.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>Telefon ko‘rsatilmagan</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>
                            Bo‘lim: <strong className="text-slate-800 dark:text-slate-200">{u.department?.name || 'Katalogda yo‘q / Yangi bo‘lim'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>
                            Lavozim: <strong className="text-slate-800 dark:text-slate-200">{u.position}</strong>
                          </span>
                        </div>
                      </div>

                      {/* What this employee can do on ShortDoc based on their department & position */}
                      <div className="mb-4 bg-gradient-to-br from-primary-50/50 to-indigo-50/40 dark:from-slate-800/80 dark:to-indigo-950/40 rounded-xl p-3.5 border border-primary-100 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary-900 dark:text-primary-300 mb-2">
                          <Layers className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                          <span>Bo‘limga muvofiq platformadagi vakolat va vazifalari:</span>
                        </div>
                        <ul className="space-y-1.5">
                          {scope.capabilities.map((cap, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                              <span className="text-primary-600 dark:text-primary-400 font-bold shrink-0 mt-0.5">•</span>
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action buttons (Direct 1-click Approval & Reject) */}
                    <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleApprove(u)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Arizani Tasdiqlash</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleReject(u)}
                        className="py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Rad etish</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALL USERS TAB */}
      {activeTab === 'all' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
          {loading ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
              <p className="text-xs">Foydalanuvchilar yuklanmoqda...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">F.I.Sh</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Tizimdagi Roli</th>
                      <th className="py-3 px-4">Bo‘lim / Fakultet</th>
                      <th className="py-3 px-4">Lavozim</th>
                      <th className="py-3 px-4">Ariza Holati</th>
                      <th className="py-3 px-4">Hisob Holati</th>
                      <th className="py-3 px-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{u.fullName}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{u.email}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">{u.department?.name || '—'}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{u.position}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {u.registrationStatus === 'PENDING' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                              Kutilmoqda
                            </span>
                          ) : u.registrationStatus === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                              Rad etilgan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                              Tasdiqlangan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {u.isActive ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Faol
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              Bloklangan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {u.id !== user?.id && (
                            <button
                              onClick={() => setCredentialsTarget(u)}
                              className="mr-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Login / Parol
                            </button>
                          )}
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                u.isActive
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {u.isActive ? 'Bloklash' : 'Faollashtirish'}
                            </button>
                          )}
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={actionLoadingId === u.id}
                              className="ml-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              O‘chirish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Jami: {totalUsers} ta foydalanuvchi | Sahifa {page} / {totalPages}</span>
                  <div className="flex gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => {
                        const p = page - 1;
                        setPage(p);
                        loadData(p);
                      }}
                      className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Oldingi
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => {
                        const p = page + 1;
                        setPage(p);
                        loadData(p);
                      }}
                      className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Keyingi
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <UserCredentialsModal
        target={credentialsTarget}
        onClose={() => setCredentialsTarget(null)}
        onSaved={() => loadData()}
      />

      {/* Create User Modal (Manual add by SuperAdmin) */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formError={formError}
        formData={formData}
        setFormData={setFormData}
        handleCreateUser={handleCreateUser}
        submitting={submitting}
        departments={departments}
      />
    </div>
  );
}
