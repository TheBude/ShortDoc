'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import { useRealtime } from '@/context/RealtimeContext';
import { Avatar } from '@/components/ui/Avatar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogOut, User as UserIcon, Building, Sun, Moon, Bell, CheckCheck, ExternalLink } from 'lucide-react';

function formatShortName(name: string = ''): string {
  if (!name) return '';
  const clean = name.replace(/^(prof\.|dots\.|dotsent|assistent)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
  }
  if (parts.length === 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return clean;
}

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobileOpen, toggleMobile } = useSidebar();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtime();

  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // pointerdown: iOS Safari sahifaning bo‘sh joyiga bosilganda mousedown yubormaydi
    function handleClickOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (bellRef.current && !bellRef.current.contains(target)) {
        setBellOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setBellOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap">Administrator</span>;
      case 'LEADERSHIP':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap">Rektorat</span>;
      case 'CHANCELLERY':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap">Devonxona</span>;
      case 'DEPARTMENT_HEAD':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap">Dekan / Rahbar</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded font-medium whitespace-nowrap">Xodim</span>;
    }
  };

  const displayName = formatShortName(user?.fullName || '');

  return (
    <header className="h-14 sm:h-16 bg-primary-200 dark:bg-primary-900 border-b border-primary-300 dark:border-primary-800 px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={toggleMobile}
          aria-label={isMobileOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
          className="flex lg:hidden items-center justify-center h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer shrink-0"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path className={`origin-center transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-y-[5px] rotate-45' : ''}`} d="M4 7h16" />
            <path className={`transition-opacity duration-200 ${isMobileOpen ? 'opacity-0' : 'opacity-100'}`} d="M4 12h16" />
            <path className={`origin-center transition-transform duration-300 ease-in-out ${isMobileOpen ? '-translate-y-[5px] -rotate-45' : ''}`} d="M4 17h16" />
          </svg>
        </button>

        {/* Nom lg–xl oralig‘ida yashiriladi: u yerda yon panel nomni ko‘rsatadi va sarlavhada joy yetmaydi */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/samdu-logo.png" alt="SamDU" className="w-8 h-8 object-contain rounded-full border border-slate-200 dark:border-slate-700 p-0.5 bg-white" />
          <span className="font-bold text-sm text-slate-800 dark:text-white hidden sm:inline lg:hidden xl:inline tracking-tight">SamDU ShortDoc</span>
          <span className="hidden sm:inline-block lg:hidden xl:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            Test
          </span>
        </div>

        {user?.department && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md truncate max-w-[200px]">
            <Building className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-medium truncate">{user.department.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Role badge */}
        <div className="hidden lg:block">
          {getRoleBadge(user?.role)}
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Real-time Notifications Bell. Telefonda oyna sarlavhaning butun kengligini egallaydi (sm dan boshlab tugma tagida) */}
        <div className="sm:relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen(!bellOpen)}
            title="Bildirishnomalar"
            aria-label="Bildirishnomalar"
            className="relative flex items-center justify-center h-10 w-10 lg:h-[34px] lg:w-[34px] rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute left-3 right-3 top-full mt-2 sm:left-auto sm:right-0 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
              <div className="flex items-center justify-between gap-2 p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <span>Bildirishnomalar</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold whitespace-nowrap">
                      {unreadCount} yangi
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-semibold cursor-pointer text-right"
                  >
                    <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Hammasini o‘qilgan qilish</span>
                  </button>
                )}
              </div>

              <div className="max-h-[min(20rem,60dvh)] overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Yangi bildirishnomalar mavjud emas
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3.5 transition-colors cursor-pointer ${
                        !n.isRead
                          ? 'bg-primary-50/40 dark:bg-primary-950/20 hover:bg-primary-50/70'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />}
                          <span>{n.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-snug">
                        {n.message}
                      </p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setBellOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 dark:text-primary-400 mt-2 py-1 hover:underline"
                        >
                          <span>Ko‘rish</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* lg va kattaroq ekran: mavzu, profil va chiqish tugmalari sarlavhaning o‘zida */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? "Yorug‘ rejimga o‘tish" : "Qorong‘u rejimga o‘tish"}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Profile */}
          <Link
            href="/profile"
            title="Profilni ochish"
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800 rounded-r-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 pr-2 py-1 transition-colors"
          >
            <Avatar src={user?.avatar} name={user?.fullName} className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-white leading-tight truncate max-w-[140px]" title={user?.fullName}>
                {displayName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[140px]">
                {user?.position || user?.email}
              </div>
            </div>
          </Link>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Tizimdan chiqish"
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* lg dan kichik ekran: profil, mavzu va chiqish bitta menyuda */}
        <div className="relative lg:hidden" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Profil menyusi"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-sm cursor-pointer transition-colors overflow-hidden"
          >
            <Avatar src={user?.avatar} name={user?.fullName} className="w-full h-full text-sm" />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Avatar src={user?.avatar} name={user?.fullName} className="w-10 h-10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.position || user?.email}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {getRoleBadge(user?.role)}
                  {user?.department && (
                    <span className="inline-flex items-center gap-1.5 max-w-full text-xs text-slate-600 dark:text-slate-400">
                      <Building className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">{user.department.name}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-1.5">
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>Profil</span>
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘u rejim'}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
