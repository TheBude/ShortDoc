'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const TestModeBanner = () => (
  <div className="bg-amber-500/10 dark:bg-amber-950/50 border-b border-amber-500/25 px-3 py-1 text-center text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 select-none shrink-0 font-medium z-20">
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
    </span>
    <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-500/20 dark:bg-amber-400/20 border border-amber-500/40 px-2 py-0.5 rounded-full text-amber-900 dark:text-amber-200 shrink-0">
      Test rejimi
    </span>
    <span className="hidden sm:inline text-[11px] text-amber-800/90 dark:text-amber-300/90 truncate">
      SamDU ShortDoc axborot tizimi sinov (beta) bosqichida ishlamoqda.
    </span>
  </div>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isPublicPage =
    pathname === '/login' ||
    pathname === '/welcome' ||
    pathname?.startsWith('/verify') ||
    (!user && pathname === '/');

  if (isLoading) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Tizim yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (isPublicPage) {
    const isVerify = pathname?.startsWith('/verify');
    return (
      <main className="min-h-screen min-h-dvh bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
        {!isVerify && <TestModeBanner />}
        <div className="flex-1">{children}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <Sidebar />
      {/* overflow-x-clip (hidden emas): hidden bo‘lsa sticky sarlavha sahifa bilan birga siljib ketadi */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-clip">
        <TestModeBanner />
        <Header />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
