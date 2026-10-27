'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi, clearApiCache } from '@/lib/api';
import { User } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { KeyRound, Copy, Check, Eye, EyeOff, Wand2, X } from 'lucide-react';

interface UserCredentialsModalProps {
  target: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const generatePassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

export const UserCredentialsModal: React.FC<UserCredentialsModalProps> = ({ target, onClose, onSaved }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEmail(target?.email || '');
    setPassword('');
    setError(null);
    setSavedPassword(null);
    setCopied(false);
  }, [target]);

  if (!target) return null;

  const emailChanged = email.trim().toLowerCase() !== target.email.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailChanged && !password) {
      setError('Login yoki parolni o‘zgartiring');
      return;
    }
    if (password && password.length < 8) {
      setError('Parol kamida 8 ta belgidan iborat bo‘lishi shart');
      return;
    }

    setSaving(true);
    const body: Record<string, string> = {};
    if (emailChanged) body.email = email.trim();
    if (password) body.password = password;

    const res = await fetchApi(`/users/${target.id}`, { method: 'PUT', body: JSON.stringify(body) });
    setSaving(false);

    if (res.success) {
      clearApiCache('/users');
      onSaved();
      if (password) {
        setSavedPassword(password);
      } else {
        onClose();
      }
    } else {
      setError(res.message || 'Saqlashda xatolik yuz berdi');
    }
  };

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`Login: ${email.trim()}\nParol: ${savedPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard ruxsati yo'q bo'lsa, foydalanuvchi qo'lda nusxalaydi
    }
  };

  const inputCls =
    'w-full p-2.5 sm:p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <Modal size="md">
      <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Login va parol
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{target.fullName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="text-slate-400 hover:text-slate-600 p-2 -m-2 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {savedPassword ? (
        <div className="space-y-3 text-xs">
          <p className="text-emerald-700 dark:text-emerald-400 font-semibold">Ma’lumotlar yangilandi.</p>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 font-mono space-y-1 break-all">
            <div>Login: {email.trim()}</div>
            <div>Parol: <span translate="no">{savedPassword}</span></div>
          </div>
          <p className="text-slate-500">
            Parol faqat hozir ko‘rinadi, keyin ko‘rib bo‘lmaydi. Foydalanuvchiga xavfsiz yo‘l bilan yetkazing. Uning
            eski sessiyalari bekor qilindi.
          </p>
          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={copyCredentials}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Nusxalandi' : 'Nusxalash'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Login (email)</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Yangi parol <span className="font-normal text-slate-400">(bo‘sh qoldirsangiz o‘zgarmaydi)</span>
            </label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Kamida 8 ta belgi"
                  className={`${inputCls} pr-8 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Parolni ko‘rsatish/yashirish"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassword(generatePassword());
                  setShowPassword(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                title="Tasodifiy parol yaratish"
              >
                <Wand2 className="w-3.5 h-3.5" /> Yaratish
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Eski parolni ko‘rib bo‘lmaydi (u shifrlangan holda saqlanadi), faqat yangisini belgilash mumkin.
              O‘zgartirilsa, foydalanuvchi qayta kirishi kerak bo‘ladi.
            </p>
          </div>

          <div className="flex gap-2 sm:justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
