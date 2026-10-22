'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { fetchApi } from '@/lib/api';
import { Department } from '@/types';
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Phone,
  User as UserIcon,
  Building2,
  Briefcase,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  UserPlus,
  Check,
  X,
  PhoneCall,
  Sun,
  Moon,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register' | 'submitted'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Department & Position state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [customPos, setCustomPos] = useState('');

  // Email validation state
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);

  // Register submission state
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Default departments list fallback
  const defaultDepartments = [
    "Raqamli ta'limni rivojlantirish bo‘limi",
    "ATM",
    "HEMIS",
    "Magistratura Qabul",
    "Bakalavr Qabul",
    "Bilimni baholash",
    "Rektorat",
    "Devonxona va umumiy bo‘lim",
    "Axborot texnologiyalari fakulteti",
    "Dasturiy injiniring kafedrasi",
    "Buxgalteriya va moliya-reja boshqarmasi"
  ];

  // Positions catalog
  const positionOptions = [
    "Yetakchi mutaxassis",
    "Muhandis dasturchi",
    "Bo‘lim boshlig‘i",
    "Katta o‘qituvchi",
    "Assistent o‘qituvchi",
    "Bosh mutaxassis",
    "Boshqa"
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') {
        setMode('register');
      }
    }
  }, []);

  useEffect(() => {
    // Fetch departments for registration dropdown
    fetchApi<Department[]>('/departments')
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setDepartments(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time email check
  useEffect(() => {
    if (!regEmail || !regEmail.includes('@') || !regEmail.includes('.')) {
      setEmailTaken(false);
      setEmailChecked(false);
      return;
    }

    const timer = setTimeout(async () => {
      setEmailCheckLoading(true);
      try {
        const res = await fetchApi<{ available: boolean }>(
          `/auth/check-email?email=${encodeURIComponent(regEmail.trim())}`
        );
        if (res.success && res.data) {
          setEmailTaken(!res.data.available);
          setEmailChecked(true);
        }
      } catch {
        // Ignore network errors in debounce
      } finally {
        setEmailCheckLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [regEmail]);

  // Real-time password strength calculation
  const passwordCriteria = useMemo(() => {
    const p = regPassword;
    return {
      minLength: p.length >= 8,
      hasUpper: /[A-Z]/.test(p),
      hasLower: /[a-z]/.test(p),
      hasDigit: /[0-9]/.test(p),
      hasSpecial: /[^A-Za-z0-9]/.test(p),
    };
  }, [regPassword]);

  const passwordScore = useMemo(() => {
    if (!regPassword) return 0;
    let score = 0;
    if (passwordCriteria.minLength) score += 25;
    if (passwordCriteria.hasUpper) score += 25;
    if (passwordCriteria.hasLower) score += 25;
    if (passwordCriteria.hasDigit) score += 25;
    return score;
  }, [passwordCriteria, regPassword]);

  const isPasswordValid = useMemo(() => {
    return (
      passwordCriteria.minLength &&
      passwordCriteria.hasUpper &&
      passwordCriteria.hasLower &&
      passwordCriteria.hasDigit
    );
  }, [passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (passwordScore === 0) return { label: 'Kiritilmagan', color: 'bg-slate-200', text: 'text-slate-400' };
    if (passwordScore <= 25) return { label: 'Juda oddiy', color: 'bg-rose-500', text: 'text-rose-600' };
    if (passwordScore <= 50) return { label: 'Kuchsiz', color: 'bg-amber-500', text: 'text-amber-600' };
    if (passwordScore <= 75) return { label: 'O‘rtacha', color: 'bg-yellow-500', text: 'text-yellow-600' };
    return { label: 'Mustahkam & To‘liq', color: 'bg-emerald-500', text: 'text-emerald-600' };
  }, [passwordScore]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });

    setLoginLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      router.push('/');
    } else {
      setLoginError(res.message || 'Email yoki parol noto‘g‘ri kiritildi');
    }
  };

  // Handle Quick Demo Login
  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setLoginEmail(demoEmail);
    setLoginPassword(demoPass);
    setLoginError(null);
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (emailTaken) {
      setRegError('Bu email bilan allaqachon ro‘yxatdan o‘tilgan. Boshqa email kiriting.');
      return;
    }

    if (!isPasswordValid) {
      setRegError('Parol talabga javob bermaydi: kamida 8 ta belgi, katta harf, kichik harf va son qatnashishi shart.');
      return;
    }

    if (!selectedDept) {
      setRegError('Iltimos, bo‘limingizni tanlang.');
      return;
    }

    if (selectedDept === 'Boshqa' && !customDept.trim()) {
      setRegError('Iltimos, o‘z bo‘lim nomingizni kiriting.');
      return;
    }

    if (!selectedPos) {
      setRegError('Iltimos, lavozimingizni tanlang.');
      return;
    }

    if (selectedPos === 'Boshqa' && !customPos.trim()) {
      setRegError('Iltimos, o‘z lavozimingiz nomini kiriting.');
      return;
    }

    setRegLoading(true);

    // Prepare payload
    const isCustomDepartment = selectedDept === 'Boshqa';
    const isCustomPosition = selectedPos === 'Boshqa';

    const payload = {
      fullName: regFullName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim() || undefined,
      password: regPassword,
      departmentId: !isCustomDepartment ? selectedDept : undefined,
      customDepartment: isCustomDepartment ? customDept.trim() : selectedDept,
      position: !isCustomPosition ? selectedPos : customPos.trim(),
      customPosition: isCustomPosition ? customPos.trim() : undefined,
    };

    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setRegLoading(false);

    if (res.success) {
      setMode('submitted');
    } else {
      setRegError(res.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-xl">
        {/* Navigation back to landing page */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/10 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Asosiy sahifaga qaytish</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
              title={theme === 'dark' ? "Yorug' rejim" : "Qorong'u rejim"}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
            </button>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide">
              SamDU • 1420
            </span>
          </div>
        </div>

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white p-1 shadow-2xl shadow-primary-950/50 mb-3 transform hover:scale-105 transition-transform border-2 border-primary-400/40">
            <img src="/samdu-logo.png" alt="Samarqand Davlat Universiteti" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">SamDU ShortDoc</h1>
          <p className="text-xs sm:text-sm text-primary-200 font-medium mt-1 max-w-md mx-auto">
            Sharof Rashidov nomidagi Samarqand Davlat Universiteti
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Elektron Hujjat Aylanishi va Ijro Nazorati Tizimi
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 transition-all">
          {/* SUCCESS SCREEN AFTER REGISTRATION */}
          {mode === 'submitted' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/10 mb-4 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Arizangiz SuperAdminga yuborildi!
              </h2>

              <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
                Adminga barcha ma&apos;lumotlar yuborildi. <span className="font-semibold text-slate-900">1 soat ichida</span> javob ma&apos;lum bo&apos;ladi yoki admin bilan quyidagi raqam orqali bog&apos;lanishingiz mumkin.
              </p>

              {/* Contact box */}
              <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-200/70 rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-primary-600/20">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-primary-700 font-semibold uppercase tracking-wider">
                      Admin bilan bog&apos;lanish
                    </div>
                    <a
                      href="tel:+998500728270"
                      className="text-base sm:text-lg font-bold text-primary-900 hover:text-primary-700 transition-colors"
                    >
                      +998 50 072 82 70
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="tel:+998500728270"
                  className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Qo&apos;ng&apos;iroq qilish</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginEmail(regEmail);
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all"
                >
                  Kirish sahifasiga qaytish
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab selector */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Tizimga kirish</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setRegError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Ro‘yxatdan o‘tish</span>
                </button>
              </div>

              {/* LOGIN FORM */}
              {mode === 'login' ? (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Xush kelibsiz!</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                    Xizmat hisobingizga kirish uchun login va parolingizni kiriting
                  </p>

                  {loginError && (
                    <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div>
                        <div>{loginError}</div>
                        {loginError.includes('+998500728270') && (
                          <a
                            href="tel:+998500728270"
                            className="inline-flex items-center gap-1.5 mt-2 font-bold text-primary-700 dark:text-primary-400 hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Qo&apos;ng&apos;iroq qilish: +998 50 072 82 70</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Elektron pochta (email)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="xodim@shortdoc.uz"
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Parol
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loginLoading ? (
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
                  <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-3 text-center">
                      Sinov uchun namunaviy hisoblar:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('rektor@shortdoc.uz', 'Rektor123!')}
                        className="p-2.5 text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Rektorat</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Monitoring & imzo</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickLogin('dekan@shortdoc.uz', 'Dekan123!')}
                        className="p-2.5 text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Dekanat</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Fakultet boshqaruvi</div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('xodim@shortdoc.uz', 'Xodim123!')}
                      className="w-full mt-2 p-2.5 text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Xodim / O‘qituvchi hisobi (xodim@shortdoc.uz)
                    </button>
                  </div>
                </div>
              ) : (
                /* REGISTRATION FORM */
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Yangi hisob ochish</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                    Ma&apos;lumotlaringizni to&apos;ldiring, SuperAdmin tasdiqlagach tizimdan foydalanasiz
                  </p>

                  {regError && (
                    <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        To‘liq ism-familiya (F.I.Sh.) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Masalan: Aliyev Vali G‘aniyevich"
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {/* Email with real-time uniqueness check */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          E-mail manzil <span className="text-rose-500">*</span>
                        </label>
                        {emailCheckLoading && (
                          <span className="text-[11px] text-slate-400 animate-pulse">Tekshirilmoqda...</span>
                        )}
                        {!emailCheckLoading && emailChecked && !emailTaken && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Email bo‘sh
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="xodim@shortdoc.uz"
                          required
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                            emailTaken
                              ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/30 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500'
                          }`}
                        />
                      </div>
                      {emailTaken && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Bu email bilan allaqachon ro‘yxatdan o‘tilgan
                        </p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Telefon raqami
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+998 (90) 123-45-67"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {/* Password with real-time animated strength meter */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Maxfiy parol <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Katta, kichik harf va raqam"
                          required
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Animated Password Strength Bar */}
                      {regPassword && (
                        <div className="mt-2.5 space-y-2 transition-all">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400">Parol murakkabligi:</span>
                            <span className={`font-bold ${strengthLabel.text}`}>
                              {strengthLabel.label}
                            </span>
                          </div>

                          {/* Progress track */}
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ease-out rounded-full ${strengthLabel.color}`}
                              style={{ width: `${passwordScore}%` }}
                            />
                          </div>

                          {/* Criteria Badges */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                            <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                              {passwordCriteria.minLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>Kamida 8 ta belgi</span>
                            </div>
                            <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                              {passwordCriteria.hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>Katta harf (A-Z)</span>
                            </div>
                            <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                              {passwordCriteria.hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>Kichik harf (a-z)</span>
                            </div>
                            <div className={`flex items-center gap-1.5 ${passwordCriteria.hasDigit ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                              {passwordCriteria.hasDigit ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>Raqamlar (0-9)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Department Select (Katalog) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Bo‘limni tanlang <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={selectedDept}
                          onChange={(e) => setSelectedDept(e.target.value)}
                          required
                          className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                        >
                          <option value="">-- Bo‘limni tanlang --</option>
                          {departments.length > 0
                            ? departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))
                            : defaultDepartments.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                          <option value="Boshqa">Boshqa (Katalogda yo‘q)</option>
                        </select>
                      </div>

                      {/* Custom Department input when "Boshqa" is selected */}
                      {selectedDept === 'Boshqa' && (
                        <div className="mt-2 animate-fadeIn">
                          <input
                            type="text"
                            value={customDept}
                            onChange={(e) => setCustomDept(e.target.value)}
                            placeholder="O‘z bo‘limingiz nomini kiriting..."
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-primary-300 dark:border-primary-700 bg-primary-50/20 dark:bg-primary-950/40 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          />
                        </div>
                      )}
                    </div>

                    {/* Position Select (Katalog) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Lavozimni tanlang <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={selectedPos}
                          onChange={(e) => setSelectedPos(e.target.value)}
                          required
                          className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                        >
                          <option value="">-- Lavozimni tanlang --</option>
                          {positionOptions.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos === 'Boshqa' ? 'Boshqa (Katalogda yo‘q)' : pos}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Position input when "Boshqa" is selected */}
                      {selectedPos === 'Boshqa' && (
                        <div className="mt-2 animate-fadeIn">
                          <input
                            type="text"
                            value={customPos}
                            onChange={(e) => setCustomPos(e.target.value)}
                            placeholder="O‘z lavozimingiz nomini kiriting..."
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-primary-300 dark:border-primary-700 bg-primary-50/20 dark:bg-primary-950/40 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          />
                        </div>
                      )}
                    </div>

                    {/* Submit Registration button */}
                    <button
                      type="submit"
                      disabled={regLoading || emailTaken || !isPasswordValid || !selectedDept || !selectedPos}
                      className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {regLoading ? (
                        <span>Arizangiz yuborilmoqda...</span>
                      ) : (
                        <>
                          <span>Ro‘yxatdan o‘tishni yakunlash</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-slate-500 text-center mt-2">
                      Ma&apos;lumotlar to&apos;g&apos;ridan-to&apos;g&apos;ri SuperAdminga tasdiqlash uchun yuboriladi.
                    </p>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          © 2026 ShortDoc EDMS. Barcha huquqlar himoyalangan.
        </div>
      </div>
    </div>
  );
}
