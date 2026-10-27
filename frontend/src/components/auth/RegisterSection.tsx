'use client';

import { groupDepartments } from '@/lib/departments';
import React from 'react';
import { Department } from '@/types';
import {
  AlertCircle,
  Building2,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  X,
} from 'lucide-react';

interface RegisterSectionProps {
  regFullName: string;
  setRegFullName: (val: string) => void;
  regPhone: string;
  setRegPhone: (val: string) => void;
  regEmail: string;
  setRegEmail: (val: string) => void;
  regPassword: string;
  setRegPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  departments: Department[];
  selectedDept: string;
  setSelectedDept: (val: string) => void;
  customDept: string;
  setCustomDept: (val: string) => void;
  selectedPos: string;
  setSelectedPos: (val: string) => void;
  customPos: string;
  setCustomPos: (val: string) => void;
  regLoading: boolean;
  regError: string | null;
  emailCheckLoading: boolean;
  emailChecked: boolean;
  emailTaken: boolean;
  handleRegisterSubmit: (e: React.FormEvent) => void;
  departmentPositions: string[];
}

export const RegisterSection: React.FC<RegisterSectionProps> = ({
  regFullName,
  setRegFullName,
  regPhone,
  setRegPhone,
  regEmail,
  setRegEmail,
  regPassword,
  setRegPassword,
  showPassword,
  setShowPassword,
  departments,
  selectedDept,
  setSelectedDept,
  customDept,
  setCustomDept,
  selectedPos,
  setSelectedPos,
  customPos,
  setCustomPos,
  regLoading,
  regError,
  emailCheckLoading,
  emailChecked,
  emailTaken,
  handleRegisterSubmit,
  departmentPositions,
}) => {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Yangi hisob ochish</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        Ma&apos;lumotlaringizni to&apos;ldiring, SuperAdmin tasdiqlagach tizimdan foydalanasiz
      </p>

      {regError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{regError}</span>
        </div>
      )}

      <form onSubmit={handleRegisterSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            To‘liq ism-familiya (F.I.Sh.) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              placeholder="Masalan: Aliyev Vali G‘aniyevich"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Email with real-time uniqueness check */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              E-mail manzil <span className="text-rose-500">*</span>
            </label>
            {emailCheckLoading && (
              <span className="text-[11px] text-slate-400 animate-pulse">Tekshirilmoqda...</span>
            )}
            {!emailCheckLoading && emailChecked && !emailTaken && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Email bo‘sh
              </span>
            )}
            {!emailCheckLoading && emailChecked && emailTaken && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <X className="w-3 h-3" /> Band qilingan
              </span>
            )}
          </div>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="vali.aliyev@shortdoc.uz"
              required
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                emailChecked && emailTaken
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                  : emailChecked && !emailTaken
                  ? 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-primary-500'
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Telefon raqam <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Department Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Fakultet / Bo‘lim <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedPos('');
              }}
              required
              className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">Fakultet yoki bo‘limni tanlang...</option>
              {groupDepartments(departments).map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.items.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__other__">+ Boshqa bo‘lim (qo‘lda kiritish)...</option>
            </select>
          </div>

          {selectedDept === '__other__' && (
            <input
              type="text"
              value={customDept}
              onChange={(e) => setCustomDept(e.target.value)}
              placeholder="Bo‘lim nomini to‘liq kiriting..."
              required
              className="mt-2 w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          )}
        </div>

        {/* Position Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Lavozim <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
              required
              className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">Lavozimingizni tanlang...</option>
              {departmentPositions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
              <option value="__other__">+ Boshqa lavozim (qo‘lda yozish)...</option>
            </select>
          </div>

          {selectedPos === '__other__' && (
            <input
              type="text"
              value={customPos}
              onChange={(e) => setCustomPos(e.target.value)}
              placeholder="Lavozimingizni aniq kiriting..."
              required
              className="mt-2 w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Parol o‘ylab toping <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="Kamida 8 ta belgi"
              required
              minLength={8}
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Parolni ko‘rsatish/yashirish"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={regLoading || (emailChecked && emailTaken)}
          className="w-full py-3 px-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {regLoading ? (
            <span>Ariza yuborilmoqda...</span>
          ) : (
            <span>Ro‘yxatdan o‘tish arizasini yuborish</span>
          )}
        </button>
      </form>
    </div>
  );
};
