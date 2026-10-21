'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import { LogOut, User as UserIcon, Building, Sun, Moon } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobileOpen, toggleMobile, isDesktopCollapsed, toggleDesktopCollapsed } = useSidebar();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-md font-medium">Bosh administrator</span>;
      case 'LEADERSHIP':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-md font-medium">Rektorat</span>;
      case 'CHANCELLERY':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-md font-medium">Devonxona</span>;
      case 'DEPARTMENT_HEAD':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-md font-medium">Bo‘lim rahbari</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-md font-medium">Xodim</span>;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Toggle Button (matching WebSiteUniver animation) */}
        <button
          type="button"
          onClick={toggleMobile}
          aria-label={isMobileOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
          className="flex md:hidden items-center justify-center h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer shrink-0"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path className={`origin-center transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-y-[5px] rotate-45' : ''}`} d="M4 7h16" />
            <path className={`transition-opacity duration-200 ${isMobileOpen ? 'opacity-0' : 'opacity-100'}`} d="M4 12h16" />
            <path className={`origin-center transition-transform duration-300 ease-in-out ${isMobileOpen ? '-translate-y-[5px] -rotate-45' : ''}`} d="M4 17h16" />
          </svg>
        </button>

        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleDesktopCollapsed}
          title={isDesktopCollapsed ? 'Panelni kengaytirish' : 'Panelni ixchamlashtirish'}
          className="hidden md:flex items-center justify-center h-9 w-9 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path className={`origin-center transition-transform duration-300 ease-in-out ${!isDesktopCollapsed ? '' : 'rotate-180'}`} d="M4 6h16M4 12h10M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <img src="/samdu-logo.png" alt="SamDU" className="w-8 h-8 object-contain rounded-full border border-slate-200 dark:border-slate-700 p-0.5 bg-white" />
          <span className="font-bold text-sm text-slate-800 dark:text-white hidden sm:inline tracking-tight">SamDU ShortDoc</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            Test
          </span>
        </div>

        {user?.department && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-md truncate max-w-[220px]">
            <Building className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{user.department.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role badge */}
        <div className="hidden sm:block">
          {getRoleBadge(user?.role)}
        </div>

        {/* Theme Toggle Button (Qorong'u / Yorug' rejim) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? "Yorug‘ rejimga o‘tish" : "Qorong‘u rejimga o‘tish"}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 flex items-center justify-center font-bold text-xs shrink-0">
            {user?.fullName?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{user?.fullName}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{user?.email}</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          title="Tizimdan chiqish"
          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
