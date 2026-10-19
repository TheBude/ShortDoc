'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { GraduationCap, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      router.push('/');
    } else {
      setError(res.message || 'Email yoki parol noto‘g‘ri kiritildi');
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-900/50 mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ShortDoc</h1>
          <p className="text-sm text-slate-400 mt-1">Universitet Elektron Hujjat Aylanishi va Ijro Nazorati Tizimi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Tizimga kirish</h2>
          <p className="text-xs text-slate-500 mb-6">Xizmat hisobingizga kirish uchun login va parolingizni kiriting</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Elektron pochta (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nomi@shortdoc.uz"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Maxfiy parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Tekshirilmoqda...</span>
              ) : (
                <>
                  <span>Tizimga kirish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Tezkor sinov uchun rollar (Demo):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@shortdoc.uz', 'Admin123!')}
                className="p-2 text-left rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-purple-900 transition-colors"
              >
                <div className="font-semibold">Super Admin</div>
                <div className="text-[10px] text-purple-600">To‘liq boshqaruv</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rektor@shortdoc.uz', 'Rektor123!')}
                className="p-2 text-left rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 transition-colors"
              >
                <div className="font-semibold">Rektorat</div>
                <div className="text-[10px] text-amber-600">Monitoring & Viza</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('devonxona@shortdoc.uz', 'Devon123!')}
                className="p-2 text-left rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-900 transition-colors"
              >
                <div className="font-semibold">Devonxona</div>
                <div className="text-[10px] text-blue-600">Ro‘yxatga olish</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('dekan@shortdoc.uz', 'Dekan123!')}
                className="p-2 text-left rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 transition-colors"
              >
                <div className="font-semibold">Dekan</div>
                <div className="text-[10px] text-emerald-600">Bo‘lim boshqaruvi</div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleQuickLogin('xodim@shortdoc.uz', 'Xodim123!')}
              className="w-full mt-2 p-2 text-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Oddiy Xodim / O‘qituvchi (xodim@shortdoc.uz)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          © 2026 ShortDoc EDMS. Barcha huquqlar himoyalangan.
        </div>
      </div>
    </div>
  );
}
