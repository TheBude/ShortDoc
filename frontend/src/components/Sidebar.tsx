'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { fetchApi } from '@/lib/api';
import {
  LayoutDashboard,
  FileText,
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
  UserCheck,
} from 'lucide-react';

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    isMobileOpen,
    closeMobile,
    isDesktopCollapsed,
    toggleDesktopCollapsed,
  } = useSidebar();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isLeadership = user?.role === 'LEADERSHIP';

  const [counts, setCounts] = useState<{
    inApproval?: number;
    pendingSignatures?: number;
    pendingTasks?: number;
    registered?: number;
    overdue?: number;
  }>({});

  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  useEffect(() => {
    loadCounts();
  }, [pathname, currentSearch]);

  const loadCounts = async () => {
    try {
      const res = await fetchApi('/reports/dashboard');
      if (res.success && res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch {}
  };

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

  const isCollapsed = isDesktopCollapsed && !isMobileOpen;

  return (
    <>
      {/* Mobile Backdrop Overlay (Matching WebSiteUniver blur) */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer / Panel */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-blue-900/40 bg-[#161f3e] text-slate-100 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none shrink-0 ${
          isMobileOpen
            ? 'w-72 sm:w-80 max-w-[85vw] translate-x-0 shadow-[12px_0_40px_rgba(15,23,42,0.7)]'
            : '-translate-x-full md:translate-x-0'
        } ${isDesktopCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        {/* 1. Header (Matching WebSiteUniver h-[73px] and morphing animated burger) */}
        <div
          className={`flex h-[73px] shrink-0 items-center border-b border-white/10 bg-[#121a35] transition-colors ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4 sm:px-5'
          }`}
        >
          {!isCollapsed && (
            <Link
              href="/"
              onClick={closeMobile}
              className="flex items-center gap-3 min-w-0 group"
            >
              <div className="w-10 h-10 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-md border border-slate-700 group-hover:scale-105 transition-transform">
                <img
                  src="/samdu-logo.png"
                  alt="SamDU Gerbi"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                  <span className="font-black text-sm text-white tracking-tight block truncate">
                    SamDU ShortDoc
                  </span>
                </div>
                <span className="block text-[9px] text-blue-300 font-semibold tracking-wider uppercase truncate">
                  Samarqand Davlat Universiteti
                </span>
              </div>
            </Link>
          )}

          {/* Morphing Burger / Close Toggle Button */}
          <button
            type="button"
            onClick={isMobileOpen ? closeMobile : toggleDesktopCollapsed}
            aria-label={
              isMobileOpen
                ? 'Menyuni yopish'
                : isDesktopCollapsed
                ? 'Bo‘limlar panelini kengaytirish'
                : 'Bo‘limlar panelini ixchamlashtirish'
            }
            title={
              isMobileOpen
                ? 'Menyuni yopish'
                : isDesktopCollapsed
                ? 'Bo‘limlar panelini kengaytirish'
                : 'Bo‘limlar panelini ixchamlashtirish'
            }
            className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path
                className={`origin-center transition-transform duration-300 ease-in-out ${
                  !isCollapsed ? 'translate-y-[5px] rotate-45' : ''
                }`}
                d="M4 7h16"
              />
              <path
                className={`transition-opacity duration-200 ${
                  !isCollapsed ? 'opacity-0' : 'opacity-100'
                }`}
                d="M4 12h16"
              />
              <path
                className={`origin-center transition-transform duration-300 ease-in-out ${
                  !isCollapsed ? '-translate-y-[5px] -rotate-45' : ''
                }`}
                d="M4 17h16"
              />
            </svg>
          </button>
        </div>

        {/* 2. New Document Action Button */}
        <div className={`p-3 border-b border-white/10 bg-[#121a35]/60 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/documents?create=true"
            onClick={closeMobile}
            title={isCollapsed ? 'Yangi Hujjat / Bildirgi' : undefined}
            className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all group ${
              isCollapsed ? 'w-11 h-11 p-0' : 'w-full py-2.5 px-3'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            {!isCollapsed && <span className="truncate">Yangi Hujjat / Bildirgi</span>}
          </Link>
        </div>

        {/* 3. Navigation Sections (Scrollable) */}
        <div className="flex-1 py-3 px-2 space-y-5 overflow-y-auto text-xs">
          
          {/* SECTION 1: MENING ISH STOLIM */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Mening Ish Stolim
              </div>
            ) : (
              <div className="border-t border-white/10 my-2" />
            )}

            <div className="space-y-1">
              {/* Kelishuvda (Imzoga kelganlar) */}
              <Link
                href="/documents?status=IN_APPROVAL"
                onClick={closeMobile}
                title={isCollapsed ? 'Kelishuvda (Imzoga kelgan)' : undefined}
                className={`relative flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-between px-3 py-2.5'
                } ${
                  isItemActive('/documents?status=IN_APPROVAL')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileCheck2
                    className={`w-4 h-4 shrink-0 ${
                      isItemActive('/documents?status=IN_APPROVAL') ? 'text-white' : 'text-amber-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Kelishuvda (Imzoga kelgan)</span>}
                </div>

                {(counts.pendingSignatures || counts.inApproval || 0) > 0 && (
                  isCollapsed ? (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#161f3e]" />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {counts.pendingSignatures || counts.inApproval}
                    </span>
                  )
                )}
              </Link>

              {/* Mening topshiriqlarim (Dedlaynlar) */}
              <Link
                href="/tasks"
                onClick={closeMobile}
                title={isCollapsed ? 'Mening topshiriqlarim' : undefined}
                className={`relative flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-between px-3 py-2.5'
                } ${
                  isItemActive('/tasks')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Clock
                    className={`w-4 h-4 shrink-0 ${
                      isItemActive('/tasks') ? 'text-white' : 'text-primary-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Mening topshiriqlarim</span>}
                </div>

                {(counts.overdue || 0) > 0 ? (
                  isCollapsed ? (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#161f3e] animate-pulse" />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      {counts.overdue}
                    </span>
                  )
                ) : (counts.pendingTasks || 0) > 0 ? (
                  isCollapsed ? (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-[#161f3e]" />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      {counts.pendingTasks}
                    </span>
                  )
                ) : null}
              </Link>
            </div>
          </div>

          {/* SECTION 2: HUJJATLAR AYLANISHI */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Hujjatlar Aylanishi
              </div>
            ) : (
              <div className="border-t border-white/10 my-2" />
            )}

            <div className="space-y-1">
              {/* Ichki bildirgilar va xizmat xatlari */}
              <Link
                href="/documents?documentType=INTERNAL"
                onClick={closeMobile}
                title={isCollapsed ? 'Ichki bildirgilar va xizmat xatlari' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/documents?documentType=INTERNAL')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <FileText
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/documents?documentType=INTERNAL') ? 'text-white' : 'text-emerald-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Ichki bildirgilar</span>}
              </Link>

              {/* Kiruvchi rasmiy xatlar */}
              <Link
                href="/documents?documentType=INCOMING"
                onClick={closeMobile}
                title={isCollapsed ? 'Kiruvchi rasmiy xatlar' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/documents?documentType=INCOMING')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <Inbox
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/documents?documentType=INCOMING') ? 'text-white' : 'text-blue-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Kiruvchi rasmiy xatlar</span>}
              </Link>

              {/* Chiquvchi xatlar */}
              <Link
                href="/documents?documentType=OUTGOING"
                onClick={closeMobile}
                title={isCollapsed ? 'Chiquvchi xatlar' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/documents?documentType=OUTGOING')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <Send
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/documents?documentType=OUTGOING') ? 'text-white' : 'text-indigo-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Chiquvchi xatlar</span>}
              </Link>

              {/* Rektor buyruqlari va qarorlari */}
              <Link
                href="/documents?category=Buyruq"
                onClick={closeMobile}
                title={isCollapsed ? 'Rektor buyruqlari va qarorlari' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/documents?category=Buyruq')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <Scale
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/documents?category=Buyruq') ? 'text-white' : 'text-amber-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Buyruq va qarorlar</span>}
              </Link>

              {/* Fuqarolar va talabalar murojaatlari */}
              <Link
                href="/documents?category=Murojaat"
                onClick={closeMobile}
                title={isCollapsed ? 'Fuqarolar va talabalar murojaati' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/documents?category=Murojaat')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <Users
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/documents?category=Murojaat') ? 'text-white' : 'text-purple-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Fuqarolar murojaati</span>}
              </Link>

              {/* Ro‘yxatga olish uchun */}
              <Link
                href="/documents?status=REGISTERED"
                onClick={closeMobile}
                title={isCollapsed ? 'Ro‘yxatga olish uchun' : undefined}
                className={`relative flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-between px-3 py-2'
                } ${
                  isItemActive('/documents?status=REGISTERED')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Hourglass
                    className={`w-4 h-4 shrink-0 ${
                      isItemActive('/documents?status=REGISTERED') ? 'text-white' : 'text-cyan-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Ro‘yxatga olish uchun</span>}
                </div>
                {(counts.registered || 0) > 0 && (
                  isCollapsed ? (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#161f3e]" />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {counts.registered}
                    </span>
                  )
                )}
              </Link>
            </div>
          </div>

          {/* SECTION 3: TAHLIL VA SOZLAMALAR */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tahlil va Sozlamalar
              </div>
            ) : (
              <div className="border-t border-white/10 my-2" />
            )}

            <div className="space-y-1">
              {/* Dashboard */}
              <Link
                href="/"
                onClick={closeMobile}
                title={isCollapsed ? 'Boshqaruv paneli' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/') ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Boshqaruv paneli</span>}
              </Link>

              {/* Ijro intizomi va hisobotlar */}
              <Link
                href="/reports"
                onClick={closeMobile}
                title={isCollapsed ? 'Ijro intizomi va hisobotlar' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/reports')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <BarChart3
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/reports') ? 'text-white' : 'text-emerald-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Ijro intizomi</span>}
              </Link>

              {/* Elektron arxiv */}
              <Link
                href="/documents?status=ARCHIVED"
                onClick={closeMobile}
                title={isCollapsed ? 'Elektron arxiv' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/documents?status=ARCHIVED')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <Archive
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/documents?status=ARCHIVED') ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Elektron arxiv</span>}
              </Link>

              {/* Universitet tuzilmasi */}
              <Link
                href="/admin/departments"
                onClick={closeMobile}
                title={isCollapsed ? 'Universitet tuzilmasi' : undefined}
                className={`flex items-center rounded-xl font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                } ${
                  isItemActive('/admin/departments')
                    ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                    : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                }`}
              >
                <Building2
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive('/admin/departments') ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Universitet tuzilmasi</span>}
              </Link>

              {/* Xodimlar - SuperAdmin */}
              {isSuperAdmin && (
                <Link
                  href="/admin/users"
                  onClick={closeMobile}
                  title={isCollapsed ? 'Xodimlar va arizalar' : undefined}
                  className={`flex items-center rounded-xl font-medium transition-all ${
                    isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                  } ${
                    isItemActive('/admin/users')
                      ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                      : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                  }`}
                >
                  <UserCheck
                    className={`w-4 h-4 shrink-0 ${
                      isItemActive('/admin/users') ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Xodimlar</span>}
                </Link>
              )}

              {/* Audit jurnali */}
              {(isSuperAdmin || isLeadership) && (
                <Link
                  href="/admin/audit"
                  onClick={closeMobile}
                  title={isCollapsed ? 'Xavfsizlik & Audit jurnali' : undefined}
                  className={`flex items-center rounded-xl font-medium transition-all ${
                    isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-3 py-2'
                  } ${
                    isItemActive('/admin/audit')
                      ? 'bg-blue-600/40 text-white shadow-sm font-semibold border border-blue-500/40'
                      : 'text-slate-300 hover:bg-blue-600/20 hover:text-white'
                  }`}
                >
                  <ShieldCheck
                    className={`w-4 h-4 shrink-0 ${
                      isItemActive('/admin/audit') ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Audit jurnali</span>}
                </Link>
              )}
            </div>
          </div>

        </div>

        {/* 4. Footer (Support & ID Info) */}
        <div className={`shrink-0 border-t border-white/10 bg-[#121a35] text-xs text-slate-400 ${
          isCollapsed ? 'py-3 flex justify-center' : 'p-3.5 space-y-2'
        }`}>
          {isCollapsed ? (
            <a
              href="tel:+998662391140"
              title="Qo‘llab-quvvatlash: +998 66 239-11-40"
              className="text-emerald-400 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
          ) : (
            <>
              <a
                href="tel:+998662391140"
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-[11px]">+998 66 239-11-40</span>
              </a>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/10">
                <span>ID: <strong className="text-slate-300 font-mono">SamDU-1420</strong></span>
                <span className="truncate max-w-[120px] text-right text-slate-400">
                  {user?.fullName?.split(' ')[0] || 'SamDU'}
                </span>
              </div>
            </>
          )}
        </div>

      </aside>
    </>
  );
}

export const Sidebar = () => {
  return (
    <Suspense
      fallback={
        <aside className="w-72 bg-[#161f3e] text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-blue-900/40 select-none animate-pulse" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
};
