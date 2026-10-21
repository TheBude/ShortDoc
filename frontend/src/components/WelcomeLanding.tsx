'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Building2,
  BarChart3,
  Search,
  ArrowRight,
  Layers,
  Inbox,
  Send,
  Sparkles,
  Smartphone,
  Laptop,
  Lock,
  ChevronRight,
  HelpCircle,
  FileCheck2,
  FileSpreadsheet,
  AlertTriangle,
  Building,
  MapPin,
  Calendar
} from 'lucide-react';

export const WelcomeLanding = () => {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* 1. TOP NAVBAR (SamDU Header) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-12 h-12 rounded-full bg-white p-0.5 border-2 border-primary-200 flex items-center justify-center shadow-md shadow-primary-500/10 group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/samdu-logo.png"
                alt="Samarqand Davlat Universiteti Gerbi"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900">SamDU ShortDoc</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 uppercase tracking-wide">
                  1420 • SamDU
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Sharof Rashidov nomidagi Samarqand davlat universiteti
              </p>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-primary-600 transition-colors">Bosh sahifa</a>
            <a href="#features" className="hover:text-primary-600 transition-colors">Tizim imkoniyatlari</a>
            <a href="#benefits" className="hover:text-primary-600 transition-colors">Qulayliklar</a>
            <a href="#hierarchy" className="hover:text-primary-600 transition-colors">SamDU Tuzilmasi</a>
          </nav>

          {/* Action Buttons (Right) */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ONE ID</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-primary-600/30 hover:shadow-lg hover:shadow-primary-600/40 transition-all group"
            >
              <span>Tizimga kirish</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (Customized for SamDU) */}
      <section id="about" className="pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden relative bg-gradient-to-b from-slate-50/70 via-white to-white">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-20 left-10 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Title & System Description */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>Sharof Rashidov nomidagi Samarqand davlat universiteti (SamDU)</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  SAMDU.UZ • SHORTDOC <br />
                  <span className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-900 bg-clip-text text-transparent">
                    Universitet elektron hujjat aylanishi
                  </span> va ijro nazorati tizimi
                </h1>
              </div>

              {/* Exact Description customized for SamDU */}
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed text-justify sm:text-left">
                Sharof Rashidov nomidagi Samarqand davlat universitetida ijro intizomi nazoratini ta’minlovchi yagona
                elektron hujjat aylanishi tizimi. Ushbu platforma universitet rektorati, 16 ta fakultet, 70 dan ortiq
                kafedralar, ilmiy markazlar va barcha bo‘limlar o‘rtasida xizmat xatlari, bildirgi, arizalar hamda
                rahbariyat topshiriqlari ijrosini to‘liq avtomatlashtirish, bir vaqtning o‘zida hujjat ustida bir nechta
                mas’ullarning ishlashini, tezkor imzo qo‘yishini va ijro intizomi monitoringini ta’minlaydi.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 transition-all"
                >
                  <span>Tizimga kirish</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/login?mode=register"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border-2 border-slate-200 hover:border-primary-500 bg-white hover:bg-primary-50/50 text-slate-800 hover:text-primary-700 text-sm font-bold transition-all"
                >
                  <Users className="w-4 h-4 text-primary-600" />
                  <span>Xodim arizasi (Ro‘yxatdan o‘tish)</span>
                </Link>
              </div>

              {/* Convenience Platform Badges */}
              <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 font-medium">
                  <Laptop className="w-4 h-4 text-slate-700" />
                  <span>SamDU Veb-portali</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 font-medium">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>Moslashuvchan mobil interfeys</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ichki tarmoq va SSL himoyasi</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Showcase Card featuring SamDU Official Seal */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-primary-900/40 border border-primary-700/50 relative overflow-hidden group">
                
                {/* Background decorative mesh rings */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-primary-600/30 blur-2xl pointer-events-none" />

                {/* SamDU Official Seal */}
                <div className="flex flex-col items-center text-center space-y-4 py-2 relative z-10">
                  <div className="w-32 h-32 rounded-full bg-white p-2 shadow-2xl border-4 border-primary-300/60 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                    <img
                      src="/samdu-logo.png"
                      alt="Samarqand Davlat Universiteti"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold tracking-[0.25em] text-primary-300 uppercase">
                      SAMARQAND DAVLAT UNIVERSITETI
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      SHAROF RASHIDOV NOMIDAGI SAMDU
                    </h3>
                    <p className="text-[11px] text-primary-100/80 font-medium max-w-xs uppercase tracking-wider">
                      Elektron Hujjat Aylanishi va Ijro Tizimi
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SamDU Tizimi faol va himoyalangan</span>
                  </div>
                </div>

                {/* Floating Metric highlights inside card */}
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/10 text-left relative z-10">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Qog‘oz tejamkorligi</div>
                    <div className="text-lg font-bold text-white mt-0.5">90% gacha</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">To‘liq elektron</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">O‘rtacha imzolash vaqti</div>
                    <div className="text-lg font-bold text-white mt-0.5">15 daqiqa</div>
                    <div className="text-[10px] text-primary-300 mt-0.5 font-medium">Onlayn tasdiqlash</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. SYSTEM CAPABILITIES SECTION */}
      <section id="features" className="py-16 lg:py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="max-w-3xl mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-800 text-xs font-bold uppercase tracking-wider">
              SamDU Imkoniyatlari
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tizim imkoniyatlari
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              <span className="font-semibold text-primary-700">SamDU ShortDoc</span> — Sharof Rashidov nomidagi
              Samarqand davlat universitetida ma’muriy ish yuritish va ijro intizomini yagona elektron standartga
              keltirish, an’anaviy qog‘ozbozlikdan to‘liq voz kechish va shaffoflikni ta’minlash uchun ishlab chiqilgan.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Ma'lumotlarni saqlanish tartibi */}
            <div className="p-6 rounded-2xl border border-slate-200/90 hover:border-primary-300 bg-white hover:bg-primary-50/20 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-5 shadow-md shadow-primary-600/20 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Ma’lumotlarni saqlanish tartibi
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Elektron arxivda SamDU hujjatlari (rektor buyruqlari, kengash qarorlari, bildirgilar) markazlashtirilgan,
                turkumlangan va tizimlashtirilgan holatda xavfsiz saqlanadi.
              </p>
            </div>

            {/* Card 2: Xarajatlarning qisqarishi */}
            <div className="p-6 rounded-2xl border border-slate-200/90 hover:border-primary-300 bg-white hover:bg-primary-50/20 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-5 shadow-md shadow-primary-600/20 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Xarajatlarning keskin qisqarishi
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                SamDU korpuslari va fakultetlari o‘rtasida qog‘oz tashish, chop etish va arxiv xonalari xarajatlarini
                90% gacha kamaytiradi. Xodimlar vaqti tejaladi.
              </p>
            </div>

            {/* Card 3: Tizimning umumiyligi */}
            <div className="p-6 rounded-2xl border border-slate-200/90 hover:border-primary-300 bg-white hover:bg-primary-50/20 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-5 shadow-md shadow-primary-600/20 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Tizimning umumiyligi va standarti
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Universitetning barcha 16 ta fakulteti, kafedralari va departamentlarida hujjatni shakllantirish,
                ro‘yxatga olish va imzo qo‘yish tartiblariga yagona yondashuv.
              </p>
            </div>

            {/* Card 4: Ko'p bosqichli Imzo zanjiri */}
            <div className="p-6 rounded-2xl border border-slate-200/90 hover:border-primary-300 bg-white hover:bg-primary-50/20 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-5 shadow-md shadow-primary-600/20 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Elektron Imzo va Kelishuv zanjiri
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Bildirgi va arizalar kafedra mudiridan dekan, bo‘lim boshliqlari va rektoratgacha avtomatik ketma-ketlikda
                elektron yo‘naltiriladi va tasdiqlanadi (imzolanadi).
              </p>
            </div>

            {/* Card 5: Ijro intizomi va Dedlayn nazorati */}
            <div className="p-6 rounded-2xl border border-slate-200/90 hover:border-primary-300 bg-white hover:bg-primary-50/20 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-5 shadow-md shadow-primary-600/20 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Ijro intizomi va Dedlayn nazorati
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Har bir topshiriq va rasmiy xat uchun aniq bajarilish muddati belgilanadi. Kechikayotgan topshiriqlar
                bo‘yicha tizim mas’ullarni darhol ogohlantiradi.
              </p>
            </div>

            {/* Card 6: Rolga asoslangan xavfsizlik */}
            <div className="p-6 rounded-2xl border border-slate-200/90 hover:border-primary-300 bg-white hover:bg-primary-50/20 shadow-sm hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mb-5 shadow-md shadow-primary-600/20 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Rolga asoslangan vakolatlar (RBAC)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                SamDU Rektori, prorektorlar, dekanlar, kafedra mudirlari, devonxona va o‘qituvchilar uchun alohida
                vakolatlar belgilangan bo‘lib, maxfiylik to‘liq ta’minlanadi.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. CONVENIENCES & BENEFITS SECTION */}
      <section id="benefits" className="py-16 lg:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-100/70 px-3 py-1 rounded-full">
              SamDU Qulayliklari
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Dasturimiz beradigan qulayliklar va afzalliklar
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Samarqand davlat universitetida zamonaviy ShortDoc elektron platformasiga o‘tish orqali erishiladigan natijalar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                01
              </div>
              <h4 className="font-bold text-slate-900 text-base">Tezkor Hujjat Almashinuvi</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fakultet yoki kafedrada tayyorlangan hujjat bir zumda rektorat yoki tegishli bo‘limga yetib boradi.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                02
              </div>
              <h4 className="font-bold text-slate-900 text-base">Sekundlik Aqlli Qidiruv</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                SamDU arxividagi minglab hujjatlar ichidan reg. raqami, sana yoki ijrochi bo‘yicha bir zumda toping.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                03
              </div>
              <h4 className="font-bold text-slate-900 text-base">Masofaviy Elektron Imzo</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rahbariyat xizmat safarida yoki yig‘ilishda bo‘lsa ham istalgan qurilmadan elektron imzo qo‘ya oladi.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                04
              </div>
              <h4 className="font-bold text-slate-900 text-base">Shaffoflik va Audit</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Har bir xat kim tomonidan qachon ko‘rildi, qachon tasdiqlandi — to‘liq tarixiy jurnal yuritiladi.
              </p>
            </div>

          </div>

          {/* Comparison Banner */}
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Eski qog‘ozbozlik tartibi</span>
                <h3 className="text-lg font-bold text-slate-900">An’anaviy usuldagi muammolar:</h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">✕</span>
                    Hujjatlar SamDU korpuslari bo‘ylab qo‘lda ko‘tarib yuriladi
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">✕</span>
                    Topshiriq ijro muddati o‘tgachgina esga olinadi
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">✕</span>
                    Eski xatlar va protokollarni arxivdan topish soatlab vaqt oladi
                  </li>
                </ul>
              </div>

              <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-200 md:pl-8 pt-6 md:pt-0">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">SamDU ShortDoc Yechimi</span>
                <h3 className="text-lg font-bold text-slate-900">Elektron tizimdagi qulaylik:</h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2 font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    Barcha jarayonlar 100% raqamli va yagona bazada
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    Dedlayn va muddatlar avtomatik monitoring qilinadi
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    Barcha statistika va hisobotlar bir tugma bilan tayyorlanadi
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. SAMDU ORGANIZATIONAL HIERARCHY */}
      <section id="hierarchy" className="py-16 lg:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-100/70 px-3 py-1 rounded-full">
              SamDU Tuzilmasi
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tizim universitetning qaysi bo‘g‘inlari uchun?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              ShortDoc SamDUning barcha ma’muriy va ilmiy-o‘quv bo‘linmalarini yagona zanjirga birlashtiradi
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* SamDU Rektorati */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Rektorat va Rahbariyat</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rektor, prorektorlar va rektorat qarorlari, buyruqlar chiqarish, imzo qo‘yish va universitet bo‘yicha ijro intizomi monitoringi.
              </p>
            </div>

            {/* Devonxona */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold shadow-md">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Devonxona (Umumiy bo‘lim)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vazirlik, viloyat hokimligi va hamkor tashkilotlardan kiruvchi hamda chiquvchi rasmiy xatlarni avtomatik reg-raqam bilan ro‘yxatga olish.
              </p>
            </div>

            {/* 16 ta Fakultet & Kafedralar */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Dekanatlar va Kafedralar</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                16 ta fakultet va 70+ kafedralar: ichki xizmat xatlari, bildirgilar, kafedra bayonnomalari va o‘quv jarayoni hujjatlarini shakllantirish.
              </p>
            </div>

            {/* Xodimlar va O'qituvchilar */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Professor-o‘qituvchilar</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Elektron arizalar topshirish, o‘ziga yuklatilgan topshiriqlar ijrosini belgilash va natijalar bo‘yicha hisobot kiritish.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION BANNER */}
      <section className="py-16 bg-gradient-to-r from-primary-900 via-primary-800 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white p-1 mx-auto flex items-center justify-center shadow-xl border-2 border-primary-300">
            <img
              src="/samdu-logo.png"
              alt="SamDU Gerbi"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
            SamDU boshqaruvini yangi raqamli bosqichga olib chiqing
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Sharof Rashidov nomidagi Samarqand davlat universitetida hujjatlar aylanishini tezlashtiring, qog‘oz xarajatlaridan voz keching va ijro intizomini to‘liq ta’minlang.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-white hover:bg-primary-50 text-primary-900 text-sm font-bold shadow-xl transition-all"
            >
              Tizimga kirish
            </Link>

            <Link
              href="/login?mode=register"
              className="px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold backdrop-blur-md transition-all"
            >
              Yangi hisob ochish
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
              <img src="/samdu-logo.png" alt="SamDU" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-slate-200">SamDU ShortDoc</span>
              <span className="hidden sm:inline"> — Sharof Rashidov nomidagi Samarqand davlat universiteti</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Samarqand sh., Universitet xiyoboni, 15
            </span>
            <span>•</span>
            <span>© {new Date().getFullYear()} SamDU. Barcha huquqlar himoyalangan.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};