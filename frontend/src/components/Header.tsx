'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, LogOut, User as UserIcon, Building } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">Super Admin</span>;
      case 'LEADERSHIP':
        return <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">Rektorat</span>;
      case 'CHANCELLERY':
        return <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">Devonxona</span>;
      case 'DEPARTMENT_HEAD':
        return <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">Bo‘lim rahbari</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">Xodim</span>;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/samdu-logo.png" alt="SamDU" className="w-8 h-8 object-contain rounded-full border border-slate-200 p-0.5" />
          <span className="font-extrabold text-sm text-slate-800 hidden sm:inline">SamDU</span>
        </div>
        {user?.department && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">{user.department.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Role badge */}
        {getRoleBadge(user?.role)}

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
            {user?.fullName?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.fullName}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{user?.email}</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          title="Tizimdan chiqish"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
