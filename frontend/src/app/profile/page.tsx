'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { getRoleLabel } from '@/lib/labels';
import { Mail, Lock, User as UserIcon, Building, Briefcase, Phone, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';
const buttonClass =
  'w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition-colors cursor-pointer';

type Notice = { type: 'success' | 'error'; text: string } | null;

const NoticeBox = ({ notice }: { notice: Notice }) =>
  notice ? (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
        notice.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
      }`}
    >
      {notice.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      )}
      <span>{notice.text}</span>
    </div>
  ) : null;

const PasswordField = ({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${inputClass} pr-11`}
          required
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
          className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="w-4 h-4 mt-0.5 text-slate-400 dark:text-slate-500 shrink-0" />
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm text-slate-900 dark:text-white break-words">{value || '—'}</div>
    </div>
  </div>
);

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailNotice, setEmailNotice] = useState<Notice>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotice(null);
    setEmailBusy(true);
    const res = await fetchApi('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ password: emailPassword, newEmail }),
    });
    setEmailBusy(false);
    if (res.success) {
      await refreshUser();
      setNewEmail('');
      setEmailPassword('');
      setEmailNotice({ type: 'success', text: 'Email muvaffaqiyatli yangilandi' });
    } else {
      setEmailNotice({ type: 'error', text: res.message || 'Emailni yangilashda xatolik yuz berdi' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    if (newPassword.length < 8) {
      setPasswordNotice({ type: 'error', text: 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi shart' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Yangi parollar bir-biriga mos kelmadi' });
      return;
    }
    if (newPassword === oldPassword) {
      setPasswordNotice({ type: 'error', text: 'Yangi parol eski paroldan farq qilishi kerak' });
      return;
    }
    setPasswordBusy(true);
    const res = await fetchApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    setPasswordBusy(false);
    if (res.success) {
      setPasswordNotice({ type: 'success', text: 'Parol yangilandi. Xavfsizlik uchun qaytadan kirishingiz kerak...' });
      // Parol o‘zgarganda barcha eski sessiyalar bekor qilinadi
      setTimeout(logout, 1800);
    } else {
      setPasswordNotice({ type: 'error', text: res.message || 'Parolni yangilashda xatolik yuz berdi' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg font-bold text-slate-800 dark:text-slate-200 shrink-0">
          {user?.fullName?.charAt(0) || <UserIcon className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">Profil</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Shaxsiy ma'lumotlar (faqat o‘qish uchun) */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Shaxsiy ma’lumotlar</h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Faqat administrator o‘zgartira oladi</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <InfoRow icon={UserIcon} label="F.I.Sh" value={user?.fullName} />
          <InfoRow icon={Building} label="Bo‘lim" value={user?.department?.name} />
          <InfoRow icon={Briefcase} label="Lavozim" value={user?.position} />
          <InfoRow icon={ShieldCheck} label="Rol" value={user?.role ? getRoleLabel(user.role) : undefined} />
          {user?.phone && <InfoRow icon={Phone} label="Telefon" value={user.phone} />}
        </div>
      </section>

      {/* Email o‘zgartirish */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-1">
          <Mail className="w-4 h-4 text-slate-500" /> Emailni o‘zgartirish
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Joriy email: <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>. Tizimga aynan shu email bilan kirasiz.
        </p>
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Yangi email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className={inputClass}
              required
            />
          </label>
          <PasswordField label="Joriy parol (tasdiqlash uchun)" value={emailPassword} onChange={setEmailPassword} autoComplete="current-password" />
          <NoticeBox notice={emailNotice} />
          <button type="submit" disabled={emailBusy} className={buttonClass}>
            {emailBusy ? 'Saqlanmoqda...' : 'Emailni saqlash'}
          </button>
        </form>
      </section>

      {/* Parol o‘zgartirish */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-1">
          <Lock className="w-4 h-4 text-slate-500" /> Parolni o‘zgartirish
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak.</p>
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <PasswordField label="Eski parol" value={oldPassword} onChange={setOldPassword} autoComplete="current-password" />
          <PasswordField label="Yangi parol" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordField label="Yangi parolni takrorlang" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          <NoticeBox notice={passwordNotice} />
          <button type="submit" disabled={passwordBusy} className={buttonClass}>
            {passwordBusy ? 'Saqlanmoqda...' : 'Parolni saqlash'}
          </button>
        </form>
      </section>
    </div>
  );
}
