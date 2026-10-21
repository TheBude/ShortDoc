'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Building2,
  BarChart3,
  ShieldCheck,
  Plus,
  Inbox,
  Send,
  Scale,
  Hourglass,
  Archive,
  Phone,
  FileCheck2,
  Clock,
  UserCheck
} from 'lucide-react';

export const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isLeadership = user?.role === 'LEADERSHIP';

  const [counts, setCounts] = useState<{
    inApproval?: number;
    pendingSignatures?: number;
    pendingTasks?: number;
    registered?: number;
    overdue?: number;
  }>({});

  useEffect(() => {
    loadCounts();
  }, [pathname]);

  const loadCounts = async () => {
    try {
      const res = await fetchApi('/reports/dashboard');
      if (res.success && res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch {}
  };

  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';

  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' && !currentSearch;
    }
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      return pathname === path && currentSearch.includes(query);
    }
    return pathname === href && !currentSearch;
  };

  return (
    <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      
      {/* 1. Brand Logo Header */}
      <div className="h-20 flex items-center px-4 border-b border-slate-800 bg-slate-950/60">
        <Link href="/" className="flex items-center gap-3 min-w-0 group w-full">
          <div className="w-11 h-11 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-lg border border-slate-700 group-hover:scale-105 transition-transform">
            <img
              src="/samdu-logo.png"
              alt="SamDU Gerbi"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base text-white tracking-tight block truncate">
                SamDU ShortDoc
              </span>
            </div>
            <span className="block text-[10px] text-primary-300 font-semibold tracking-wider uppercase truncate">
              Samarqand Davlat Universiteti
            </span>
          </div>
        </Link>
      </div>

      {/* 2. New Document Action Button (Inspired by "+ Ro'yxatga olish") */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
        <Link
          href="/documents?create=true"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white font-bold text-xs shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 transition-all group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span>Yangi Hujjat / Bildirgi</span>
        </Link>
      </div>

      {/* 3. Navigation Sections (Scrollable) */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto text-xs">
        
        {/* SECTION 1: MENING ISH STOLIM */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Mening Ish Stolim</span>
          </div>

          <div className="space-y-1">
            {/* Kelishuvda (Imzoga kelganlar) */}
            <Link
              href="/documents?status=IN_APPROVAL"
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                isItemActive('/documents?status=IN_APPROVAL')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileCheck2 className={`w-4 h-4 shrink-0 ${isItemActive('/documents?status=IN_APPROVAL') ? 'text-white' : 'text-amber-400'}`} />
                <span className="truncate">Kelishuvda (Imzoga kelgan)</span>
              </div>
              {(counts.pendingSignatures || counts.inApproval || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {counts.pendingSignatures || counts.inApproval}
                </span>
              )}
            </Link>

            {/* Mening topshiriqlarim (Dedlaynlar) */}
            <Link
              href="/tasks"
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                isItemActive('/tasks')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Clock className={`w-4 h-4 shrink-0 ${isItemActive('/tasks') ? 'text-white' : 'text-primary-400'}`} />
                <span className="truncate">Mening topshiriqlarim</span>
              </div>
              {(counts.overdue || 0) > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  {counts.overdue}
                </span>
              ) : (counts.pendingTasks || 0) > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {counts.pendingTasks}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        {/* SECTION 2: HUJJATLAR AYLANISHI (Devonxona & Fakultetlar) */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Hujjatlar Aylanishi
          </div>

          <div className="space-y-1">
            {/* Ichki bildirgilar va xizmat xatlari */}
            <Link
              href="/documents?documentType=INTERNAL"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?documentType=INTERNAL')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${isItemActive('/documents?documentType=INTERNAL') ? 'text-white' : 'text-emerald-400'}`} />
              <span className="truncate">Ichki bildirgilar va xizmat xatlari</span>
            </Link>

            {/* Kiruvchi rasmiy xatlar */}
            <Link
              href="/documents?documentType=INCOMING"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?documentType=INCOMING')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Inbox className={`w-4 h-4 shrink-0 ${isItemActive('/documents?documentType=INCOMING') ? 'text-white' : 'text-blue-400'}`} />
              <span className="truncate">Kiruvchi rasmiy xatlar</span>
            </Link>

            {/* Chiquvchi xatlar */}
            <Link
              href="/documents?documentType=OUTGOING"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?documentType=OUTGOING')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Send className={`w-4 h-4 shrink-0 ${isItemActive('/documents?documentType=OUTGOING') ? 'text-white' : 'text-indigo-400'}`} />
              <span className="truncate">Chiquvchi xatlar</span>
            </Link>

            {/* Rektor buyruqlari va qarorlari */}
            <Link
              href="/documents?category=Buyruq"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?category=Buyruq')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Scale className={`w-4 h-4 shrink-0 ${isItemActive('/documents?category=Buyruq') ? 'text-white' : 'text-amber-400'}`} />
              <span className="truncate">Rektor buyruqlari va qarorlari</span>
            </Link>

            {/* Fuqarolar va talabalar murojaatlari */}
            <Link
              href="/documents?category=Murojaat"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?category=Murojaat')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 ${isItemActive('/documents?category=Murojaat') ? 'text-white' : 'text-purple-400'}`} />
              <span className="truncate">Fuqarolar va talabalar murojaati</span>
            </Link>

            {/* Ro‘yxatga olish uchun (Kutilayotgan) */}
            <Link
              href="/documents?status=REGISTERED"
              className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?status=REGISTERED')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Hourglass className={`w-4 h-4 shrink-0 ${isItemActive('/documents?status=REGISTERED') ? 'text-white' : 'text-cyan-400'}`} />
                <span className="truncate">Ro‘yxatga olish uchun</span>
              </div>
              {(counts.registered || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {counts.registered}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* SECTION 3: TAHLIL VA SOZLAMALAR */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Tahlil va Sozlamalar
          </div>

          <div className="space-y-1">
            {/* Dashboard */}
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${isItemActive('/') ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">Boshqaruv paneli</span>
            </Link>

            {/* Ijro intizomi va hisobotlar */}
            <Link
              href="/reports"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/reports')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${isItemActive('/reports') ? 'text-white' : 'text-emerald-400'}`} />
              <span className="truncate">Ijro intizomi va hisobotlar</span>
            </Link>

            {/* Elektron arxiv */}
            <Link
              href="/documents?status=ARCHIVED"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/documents?status=ARCHIVED')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Archive className={`w-4 h-4 shrink-0 ${isItemActive('/documents?status=ARCHIVED') ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">Elektron arxiv</span>
            </Link>

            {/* Universitet tuzilmasi (Fakultet va Kafedralar) */}
            <Link
              href="/admin/departments"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                isItemActive('/admin/departments')
                  ? 'bg-primary-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className={`w-4 h-4 shrink-0 ${isItemActive('/admin/departments') ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">Universitet tuzilmasi</span>
            </Link>

            {/* Foydalanuvchilar (Xodimlar) - SuperAdmin */}
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                  isItemActive('/admin/users')
                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <UserCheck className={`w-4 h-4 shrink-0 ${isItemActive('/admin/users') ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">Xodimlar va arizalar</span>
              </Link>
            )}

            {/* Audit jurnali */}
            {(isSuperAdmin || isLeadership) && (
              <Link
                href="/admin/audit"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                  isItemActive('/admin/audit')
                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${isItemActive('/admin/audit') ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">Xavfsizlik & Audit jurnali</span>
              </Link>
            )}
          </div>
        </div>

      </div>

      {/* 4. Support & System ID Footer (Matching screenshot bottom info) */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400 space-y-2">
        <a
          href="tel:+998662391140"
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-[11px]">+998 66 239-11-40</span>
        </a>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
          <span>ID raqami : <strong className="text-slate-300 font-mono">SamDU-1420</strong></span>
          <span className="truncate max-w-[120px] text-right text-slate-400">{user?.fullName?.split(' ')[0] || 'SamDU'}</span>
        </div>
      </div>

    </aside>
  );
};
