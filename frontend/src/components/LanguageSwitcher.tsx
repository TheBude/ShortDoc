'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/i18n/translate';

const ITEM_HEIGHT = 52; // px — siljuvchi belgi balandligi bilan mos bo‘lishi shart

export const LanguageSwitcher = ({ tone = 'default' }: { tone?: 'default' | 'glass' }) => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // pointerdown: iOS Safari sahifaning bo‘sh joyiga bosilganda mousedown yubormaydi
    function handleClickOutside(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const activeIndex = Math.max(0, LANGUAGES.findIndex((l) => l.code === lang));
  const active = LANGUAGES[activeIndex];

  return (
    <div className="relative" ref={rootRef} translate="no">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Til / Тил / Язык"
        title="Til / Тил / Язык"
        className={`group flex items-center gap-1.5 h-10 lg:h-[34px] pl-2.5 pr-2 rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
          open
            ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-300'
            : tone === 'glass'
              ? 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300 hover:text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Languages
          className={`w-4 h-4 transition-transform duration-500 ease-out ${open ? 'rotate-[360deg] scale-110' : 'group-hover:rotate-12'}`}
        />
        <span className="relative h-4 w-5 overflow-hidden text-[11px] font-bold leading-4 text-center">
          {LANGUAGES.map((l, i) => (
            <span
              key={l.code}
              className="absolute inset-0 transition-all duration-300 ease-out"
              style={{
                transform: `translateY(${(i - activeIndex) * 100}%)`,
                opacity: i === activeIndex ? 1 : 0,
              }}
            >
              {l.short}
            </span>
          ))}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Telefonda menyu ekran pastidan chiqadi, sm dan boshlab tugma tagida ochiladi */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 sm:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
      )}

      <div
        role="listbox"
        aria-label={active.label}
        className={`fixed inset-x-3 bottom-3 z-50 origin-bottom sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:w-60 sm:origin-top-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
          open
            ? 'visible opacity-100 scale-100 translate-y-0'
            : 'invisible opacity-0 scale-95 translate-y-2 sm:-translate-y-1 pointer-events-none'
        }`}
      >
        <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Til • Тил • Язык
        </div>

        <div className="relative p-1.5">
          {/* Faol tilga siljuvchi belgi */}
          <div
            aria-hidden="true"
            className="absolute left-1.5 right-1.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900/60 transition-transform duration-300 ease-out"
            style={{ top: 6, height: ITEM_HEIGHT, transform: `translateY(${activeIndex * ITEM_HEIGHT}px)` }}
          />
          {LANGUAGES.map((l, i) => {
            const selected = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                style={{ height: ITEM_HEIGHT, transitionDelay: open ? `${60 + i * 45}ms` : '0ms' }}
                className={`relative w-full flex items-center gap-3 px-2.5 rounded-xl text-left cursor-pointer transition-all duration-300 ${
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
                } ${selected ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
              >
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold border transition-colors duration-300 ${
                    selected
                      ? 'bg-primary-700 text-white border-primary-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {l.short}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white leading-tight">{l.label}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{l.native}</span>
                </span>
                <Check
                  className={`w-4 h-4 text-primary-600 dark:text-primary-400 transition-all duration-300 ${
                    selected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
