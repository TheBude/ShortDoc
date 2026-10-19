'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Building2,
  BarChart3,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

export const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isLeadership = user?.role === 'LEADERSHIP';

  const navItems = [
    {
      title: 'Bosh sahifa (Dashboard)',
      href: '/',
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: 'Hujjatlar reyestri',
      href: '/documents',
      icon: FileText,
      show: true,
    },
    {
      title: 'Topshiriqlar va ijro',
      href: '/tasks',
      icon: CheckSquare,
      show: true,
    },
    {
      title: 'Hisobotlar va tahlil',
      href: '/reports',
      icon: BarChart3,
      show: isSuperAdmin || isLeadership || user?.role === 'DEPARTMENT_HEAD',
    },
    {
      title: 'Foydalanuvchilar',
      href: '/admin/users',
      icon: Users,
      show: isSuperAdmin,
    },
    {
      title: 'Bo‘lim va kafedralar',
      href: '/admin/departments',
      icon: Building2,
      show: isSuperAdmin,
    },
    {
      title: 'Audit jurnali',
      href: '/admin/audit',
      icon: ShieldCheck,
      show: isSuperAdmin || isLeadership,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">ShortDoc</span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              OTM Hujjat Tizimi
            </span>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Asosiy Bo‘limlar
        </div>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.title}</span>
              </Link>
            );
          })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/20">
        <div className="font-medium text-slate-300 truncate">{user?.fullName || 'Foydalanuvchi'}</div>
        <div className="text-[11px] text-slate-400 truncate">{user?.position || 'Lavozim'}</div>
      </div>
    </aside>
  );
};
