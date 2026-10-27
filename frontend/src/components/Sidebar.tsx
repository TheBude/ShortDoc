'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useRealtime } from '@/context/RealtimeContext';
import { fetchApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import {
  FileText,
  Users,
  Building2,
  BarChart3,
  ShieldCheck,
  Plus,
  Scale,
  Hourglass,
  Archive,
  Phone,
  FileCheck2,
  UserCheck,
  Trash2,
  UserCircle,
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
  const isChancellery = user?.role === 'CHANCELLERY';
  const isDepartmentHead = user?.role === 'DEPARTMENT_HEAD';
  const isStaff = user?.role === 'STAFF';

  const { counts } = useRealtime();

  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

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
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          data-scroll-lock
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer / Panel (lg dan kichik ekranlarda — chapdan chiqadigan menyu) */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 flex h-screen h-dvh flex-col overflow-hidden border-r border-blue-300 dark:border-slate-800 bg-[#dbe5f4] dark:bg-[#0b1329] text-slate-700 dark:text-slate-200 lg:shadow-xl lg:shadow-slate-300/60 dark:lg:shadow-2xl dark:lg:shadow-black/40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none shrink-0 w-72 sm:w-80 max-w-[85vw] ${
          isMobileOpen
            ? 'translate-x-0 shadow-[12px_0_40px_rgba(2,6,23,0.8)]'
            : '-translate-x-full lg:translate-x-0'
        } ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* 1. Header (SamDU Logo & Collapse Toggle) */}
        <div
          className={`flex h-[73px] shrink-0 items-center border-b border-blue-300/70 dark:border-slate-800/90 bg-[#cfdcf0] dark:bg-[#090f20] transition-colors ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4 sm:px-5'
          }`}
        >
          {!isCollapsed && (
            <Link
              href="/"
              onClick={closeMobile}
              className="flex items-center gap-3 min-w-0 group"
            >
              <div className="w-9 h-9 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm border border-blue-200 dark:border-slate-700 transition-transform">
                <img
                  src="/samdu-logo.png"
                  alt="SamDU Gerbi"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight block truncate">
                    SamDU ShortDoc
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-blue-200 dark:border-slate-700 shrink-0">
                    Test
                  </span>
                </div>
                <span className="block text-[9px] text-slate-600 dark:text-slate-400 font-medium tracking-wide uppercase truncate">
                  Samarqand Davlat Universiteti
                </span>
              </div>
            </Link>
          )}

          {/* Morphing Toggle Button (Mobile: close; Desktop: collapse) */}
          <button
            type="button"
            onClick={isMobileOpen ? closeMobile : toggleDesktopCollapsed}
            aria-label={
              isMobileOpen
                ? 'Menyuni yopish'
                : isDesktopCollapsed
                ? 'Panelni kengaytirish'
                : 'Panelni ixchamlashtirish'
            }
            title={
              isMobileOpen
                ? 'Menyuni yopish'
                : isDesktopCollapsed
                ? 'Panelni kengaytirish'
                : 'Panelni ixchamlashtirish'
            }
            className="rounded-lg p-2.5 lg:p-2 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0 focus:outline-none"
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

        {/* 2. Primary Action: Yangi hujjat yaratish */}
        <div className={`p-3 border-b border-blue-300/70 dark:border-slate-800/90 bg-[#cfdcf0]/60 dark:bg-[#090f20]/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/documents?create=true"
            onClick={closeMobile}
            title={isCollapsed ? 'Yangi hujjat yaratish' : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white font-semibold text-sm lg:text-xs transition-all shadow-sm group ${
              isCollapsed ? 'w-10 h-10 p-0' : 'w-full py-3 lg:py-2.5 px-3'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0 transition-transform duration-200" />
            {!isCollapsed && <span className="truncate">Yangi hujjat yaratish</span>}
          </Link>
        </div>

        {/* 3. Navigation Sections (Scrollable & Role-based) */}
        <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto overscroll-contain text-sm lg:text-xs">
          
          {/* SECTION 1: ISH STOLIM */}
          <div>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Ish Stolim
              </div>
            ) : (
              <div className="border-t border-blue-300/70 dark:border-slate-800 my-2" />
            )}

            <div className="space-y-1">
              {/* Imzolashim kerak (Aynan ushbu foydalanuvchining imzosi kutilayotganlar) */}
              <Link
                href="/documents?pendingMySignature=true"
                onClick={closeMobile}
                title={isCollapsed ? 'Imzolashim kerak' : undefined}
                className={`group relative flex items-center rounded-lg font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-between px-3 py-3 lg:py-2'
                } ${
                  isItemActive('/documents?pendingMySignature=true')
                    ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileCheck2
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isItemActive('/documents?pendingMySignature=true')
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Imzolashim kerak</span>}
                </div>

                {(counts.pendingSignatures || 0) > 0 && (
                  isCollapsed ? (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-[#dbe5f4] dark:ring-[#0b1329]" />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700/60">
                      {counts.pendingSignatures}
                    </span>
                  )
                )}
              </Link>

              {/* Barcha hujjatlar */}
              <Link
                href="/documents"
                onClick={closeMobile}
                title={isCollapsed ? 'Barcha hujjatlar' : undefined}
                className={`group flex items-center rounded-lg font-medium transition-all ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                } ${
                  isItemActive('/documents')
                    ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isItemActive('/documents') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Barcha hujjatlar</span>}
              </Link>
            </div>
          </div>

          {/* SECTION 2: DEVONXONA / REKTORAT BO'LIMLARI (faqat tegishli rollar ko'radi) */}
          {(isChancellery || isLeadership || isSuperAdmin) && (
            <div>
              {!isCollapsed ? (
                <div className="px-3 pb-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Devonxona va Ijro
                </div>
              ) : (
                <div className="border-t border-blue-300/70 dark:border-slate-800 my-2" />
              )}

              <div className="space-y-1">
                {/* Yangi kelgan xatlar (Ro'yxatga olish uchun) */}
                <Link
                  href="/documents?status=REGISTERED"
                  onClick={closeMobile}
                  title={isCollapsed ? 'Yangi kelgan xatlar' : undefined}
                  className={`group relative flex items-center rounded-lg font-medium transition-all ${
                    isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-between px-3 py-3 lg:py-2'
                  } ${
                    isItemActive('/documents?status=REGISTERED')
                      ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Hourglass
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isItemActive('/documents?status=REGISTERED')
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Yangi kelgan xatlar</span>}
                  </div>
                  {(counts.registered || 0) > 0 && (
                    isCollapsed ? (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-slate-400 ring-2 ring-[#dbe5f4] dark:ring-[#0b1329]" />
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-blue-200 dark:border-slate-700">
                        {counts.registered}
                      </span>
                    )
                  )}
                </Link>

                {/* Elektron arxiv */}
                <Link
                  href="/documents?status=ARCHIVED"
                  onClick={closeMobile}
                  title={isCollapsed ? 'Elektron arxiv' : undefined}
                  className={`group flex items-center rounded-lg font-medium transition-all ${
                    isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                  } ${
                    isItemActive('/documents?status=ARCHIVED')
                      ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Archive
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isItemActive('/documents?status=ARCHIVED') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Elektron arxiv</span>}
                </Link>
              </div>
            </div>
          )}

          {/* SECTION 3: TAHLIL VA BOSHQARUV (faqat Dekan, Rektorat, SuperAdmin) */}
          {(isDepartmentHead || isLeadership || isSuperAdmin) && (
            <div>
              {!isCollapsed ? (
                <div className="px-3 pb-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tahlil va monitoring
                </div>
              ) : (
                <div className="border-t border-blue-300/70 dark:border-slate-800 my-2" />
              )}

              <div className="space-y-1">
                {/* Hisobotlar */}
                <Link
                  href="/reports"
                  onClick={closeMobile}
                  title={isCollapsed ? 'Hisobotlar' : undefined}
                  className={`group flex items-center rounded-lg font-medium transition-all ${
                    isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                  } ${
                    isItemActive('/reports')
                      ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isItemActive('/reports') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">Hisobotlar</span>}
                </Link>

                {/* Universitet tuzilmasi (faqat Super Admin va Rektorat) */}
                {(isSuperAdmin || isLeadership) && (
                  <Link
                    href="/admin/departments"
                    onClick={closeMobile}
                    title={isCollapsed ? 'Universitet tuzilmasi' : undefined}
                    className={`group flex items-center rounded-lg font-medium transition-all ${
                      isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                    } ${
                      isItemActive('/admin/departments')
                        ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Building2
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isItemActive('/admin/departments') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Universitet tuzilmasi</span>}
                  </Link>
                )}

                {/* Xodimlar (faqat Super Admin) */}
                {isSuperAdmin && (
                  <Link
                    href="/admin/users"
                    onClick={closeMobile}
                    title={isCollapsed ? 'Xodimlar ro‘yxati' : undefined}
                    className={`group flex items-center rounded-lg font-medium transition-all ${
                      isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                    } ${
                      isItemActive('/admin/users')
                        ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserCheck
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isItemActive('/admin/users') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className="truncate">Xodimlar</span>
                        {(counts.pendingUsers || 0) > 0 && (
                          <span className="ml-auto bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                            {counts.pendingUsers}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                )}

                {/* Audit jurnali (faqat Super Admin va Rektorat) */}
                {(isSuperAdmin || isLeadership) && (
                  <Link
                    href="/admin/audit"
                    onClick={closeMobile}
                    title={isCollapsed ? 'Xavfsizlik & audit jurnali' : undefined}
                    className={`group flex items-center rounded-lg font-medium transition-all ${
                      isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                    } ${
                      isItemActive('/admin/audit')
                        ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isItemActive('/admin/audit') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Audit jurnali</span>}
                  </Link>
                )}

                {/* Ma'lumotlarni tozalash (faqat Super Admin) */}
                {isSuperAdmin && (
                  <Link
                    href="/admin/maintenance"
                    onClick={closeMobile}
                    title={isCollapsed ? 'Ma’lumotlarni tozalash' : undefined}
                    className={`group flex items-center rounded-lg font-medium transition-all ${
                      isCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2'
                    } ${
                      isItemActive('/admin/maintenance')
                        ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Trash2
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isItemActive('/admin/maintenance') ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Ma’lumotlarni tozalash</span>}
                  </Link>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Profil */}
        <div className={`shrink-0 px-2 pb-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/profile"
            onClick={closeMobile}
            title={isCollapsed ? 'Profil' : undefined}
            className={`group flex items-center rounded-lg font-medium transition-all ${
              isCollapsed ? 'justify-center h-10 w-10' : 'gap-3 px-3 py-3 lg:gap-2.5 lg:py-2 w-full'
            } ${
              isItemActive('/profile')
                ? 'bg-white shadow-sm dark:shadow-none dark:bg-slate-800 text-blue-700 dark:text-white font-semibold border border-blue-200 dark:border-slate-700'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {user?.avatar ? (
              <Avatar src={user.avatar} name={user.fullName} className="w-5 h-5 shrink-0" />
            ) : (
              <UserCircle
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isItemActive('/profile') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              />
            )}
            {!isCollapsed && <span className="truncate">Profil</span>}
          </Link>
        </div>

        {/* 4. Footer */}
        <div className={`shrink-0 border-t border-blue-300/70 dark:border-slate-800 bg-[#cfdcf0] dark:bg-[#090f20] text-xs text-slate-600 dark:text-slate-400 ${
          isCollapsed ? 'py-3 flex justify-center' : 'p-3.5 space-y-2'
        }`}>
          {isCollapsed ? (
            <a
              href="tel:+998662391140"
              title="Qo‘llab-quvvatlash: +998 66 239-11-40"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
          ) : (
            <>
              <a
                href="tel:+998662391140"
                className="flex items-center gap-2 py-1 lg:py-0 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="font-medium text-[11px]">+998 66 239-11-40</span>
              </a>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-blue-300/70 dark:border-slate-800/80">
                <span>Tizim: <strong className="text-slate-700 dark:text-slate-300 font-mono">SamDU-1420</strong></span>
                <span className="truncate max-w-[120px] text-right text-slate-600 dark:text-slate-400">
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
        <aside className="hidden lg:flex w-72 bg-[#dbe5f4] dark:bg-[#0b1329] text-slate-700 dark:text-slate-300 flex-col shrink-0 min-h-screen border-r border-blue-300 dark:border-slate-800 select-none animate-pulse" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
};
