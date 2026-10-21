'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { WelcomeLanding } from '@/components/WelcomeLanding';
import {
  FileText,
  Inbox,
  Send,
  FileCheck2,
  Clock,
  AlertTriangle,
  Building2,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    const res = await fetchApi('/reports/dashboard');
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // If visitor is not authenticated, render the Welcome Landing page!
  if (!user) {
    return <WelcomeLanding />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const counts = data?.counts || {};
  const recentActivities = data?.recentActivities || [];
  const departmentsStat = data?.departmentsStat || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-900 to-slate-900 dark:from-slate-900 dark:to-primary-950 rounded-2xl p-6 lg:p-8 text-white shadow-md border border-transparent dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-white/20 dark:bg-white/10 text-white px-3 py-1 rounded-full uppercase tracking-wider">
              Samarqand davlat universiteti (SamDU)
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mt-3 tracking-tight">
            Xush kelibsiz, {user?.fullName}!
          </h1>
          <p className="text-slate-300 dark:text-slate-300 text-sm mt-2 leading-relaxed">
            Sharof Rashidov nomidagi SamDU elektron hujjatlar aylanishi va ijro nazorati tizimi orqali xizmat xatlari, bildirgilar va topshiriqlar holatini real vaqtda nazorat qiling.
          </p>
        </div>
        <div className="w-16 h-16 rounded-full bg-white p-1 shrink-0 hidden md:flex items-center justify-center shadow-lg border border-white/20">
          <img src="/samdu-logo.png" alt="SamDU Gerbi" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jami Hujjatlar"
          value={counts.total || 0}
          subtitle="Tizimdagi barcha yozuvlar"
          icon={FileText}
          variant="blue"
        />
        <StatCard
          title="Kiruvchi Hujjatlar"
          value={counts.incoming || 0}
          subtitle="Yuqori tashkilotlar xatlari"
          icon={Inbox}
          variant="purple"
        />
        <StatCard
          title="Chiquvchi Hujjatlar"
          value={counts.outgoing || 0}
          subtitle="Tashqi yuborilgan xatlar"
          icon={Send}
          variant="slate"
        />
        <StatCard
          title="Ichki Bildirgilar"
          value={counts.internal || 0}
          subtitle="Kafedra va dekanat xatlari"
          icon={FileCheck2}
          variant="emerald"
        />
      </div>

      {/* Execution Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Ijroda Turganlar"
          value={counts.inExecution || 0}
          subtitle="Jarayondagi hujjatlar"
          icon={Clock}
          variant="blue"
        />
        <StatCard
          title="Muddati Yaqinlashgan"
          value={counts.approachingDeadline || 0}
          subtitle="Kelgusi 3 kun ichida"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          title="Muddati O‘tgan Topshiriqlar"
          value={counts.overdue || 0}
          subtitle="Kechikayotgan topshiriqlar"
          icon={AlertTriangle}
          variant="rose"
        />
      </div>

      {/* Lower Section: Recent Activity & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities (Audit Log) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Oxirgi Amallar va Harakatlar Tarixi</h3>
            </div>
            <Link href="/documents" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1">
              Barchasini ko‘rish <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">Hozircha amallar qayd etilmagan.</p>
            ) : (
              recentActivities.map((act: any) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{act.details || act.action}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 dark:text-slate-500">
                      <span>{act.user?.fullName || 'Tizim'}</span>
                      <span>•</span>
                      <span>{new Date(act.createdAt).toLocaleString('uz-UZ')}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {act.entity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Departments Stat */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Bo‘limlar Faolligi</h3>
          </div>

          <div className="space-y-4">
            {departmentsStat.map((dep: any) => (
              <div key={dep.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <span className="truncate">{dep.name}</span>
                  <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">{dep._count?.documents || 0} ta hujjat</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                  <span>Kodi: {dep.code}</span>
                  <span>{dep._count?.users || 0} nafar xodim</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
