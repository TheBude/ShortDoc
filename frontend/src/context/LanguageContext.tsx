'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_LANG, LANGUAGES, LANG_STORAGE_KEY, Lang, isLang, translateText } from '@/lib/i18n/translate';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** O‘zbek (lotin) matnini joriy tilga o‘giradi — alert, confirm va dinamik matnlar uchun */
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'KBD', 'NOSCRIPT']);
const TRANSLATED_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

// Foydalanuvchi mazmunini o‘zgartirmaslik uchun: translate="no" bilan belgilangan joylar o‘tkazib yuboriladi
function isSkipped(node: Node): boolean {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return !!el.closest('[translate="no"]');
}

interface AttrRecord {
  source: string;
  output: string;
}

/**
 * Sahifadagi barcha matn tugunlarini va atributlarni tanlangan tilga o‘giradi.
 * Asl (o‘zbek lotin) matn eslab qolinadi, shuning uchun tilni qaytarib almashtirish xavfsiz.
 */
function createDomTranslator() {
  const textSource = new WeakMap<Text, string>();
  const textOutput = new WeakMap<Text, string>();
  const attrRecords = new WeakMap<Element, Map<string, AttrRecord>>();
  let lang: Lang = DEFAULT_LANG;

  const translateTextNode = (node: Text) => {
    if (isSkipped(node)) return;
    const current = node.data;
    const known = textOutput.get(node);
    // Tugun qiymatini React yangilagan bo‘lsa — bu yangi manba matni
    const source = known !== undefined && known === current ? textSource.get(node) ?? current : current;
    const output = translateText(source, lang);
    if (output === source && known === undefined) return;
    textSource.set(node, source);
    textOutput.set(node, output);
    if (node.data !== output) node.data = output;
  };

  const translateAttrs = (el: Element) => {
    if (el.closest('[translate="no"]')) return;
    let records = attrRecords.get(el);
    for (const attr of TRANSLATED_ATTRS) {
      const current = el.getAttribute(attr);
      if (current === null) continue;
      const rec = records?.get(attr);
      const source = rec && rec.output === current ? rec.source : current;
      const output = translateText(source, lang);
      if (output === source && !rec) continue;
      if (!records) {
        records = new Map();
        attrRecords.set(el, records);
      }
      records.set(attr, { source, output });
      if (current !== output) el.setAttribute(attr, output);
    }
  };

  const processSubtree = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root as Text);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const rootEl = root as Element;
    if (rootEl.closest('[translate="no"]')) return;
    translateAttrs(rootEl);
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) translateTextNode(n as Text);
      else translateAttrs(n as Element);
      n = walker.nextNode();
    }
  };

  const observer = new MutationObserver((mutations) => {
    observer.disconnect();
    try {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(processSubtree);
        } else if (m.type === 'characterData') {
          translateTextNode(m.target as Text);
        } else if (m.type === 'attributes') {
          translateAttrs(m.target as Element);
        }
      }
    } finally {
      start();
    }
  });

  function start() {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATED_ATTRS,
    });
  }

  return {
    setLang(next: Lang) {
      lang = next;
      observer.disconnect();
      processSubtree(document.documentElement);
      start();
    },
    start,
    stop() {
      observer.disconnect();
    },
  };
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const translatorRef = useRef<ReturnType<typeof createDomTranslator> | null>(null);
  const langRef = useRef<Lang>(DEFAULT_LANG);

  const applyLang = useCallback((next: Lang, animate: boolean) => {
    langRef.current = next;
    const meta = LANGUAGES.find((l) => l.code === next);
    document.documentElement.lang = meta?.htmlLang ?? 'uz';
    document.documentElement.dataset.lang = next;
    if (animate) {
      document.body.classList.remove('lang-swap');
      // reflow — animatsiyani qayta ishga tushirish uchun
      void document.body.offsetWidth;
      document.body.classList.add('lang-swap');
    }
    translatorRef.current?.setLang(next);
  }, []);

  useEffect(() => {
    const translator = createDomTranslator();
    translatorRef.current = translator;

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      saved = null;
    }
    const initial = isLang(saved) ? saved : DEFAULT_LANG;
    setLangState(initial);
    applyLang(initial, false);

    // alert va confirm oynalari ham tanlangan tilda chiqishi uchun
    const originalAlert = window.alert.bind(window);
    const originalConfirm = window.confirm.bind(window);
    window.alert = (message?: unknown) => originalAlert(translateText(String(message ?? ''), langRef.current));
    window.confirm = (message?: string) => originalConfirm(translateText(String(message ?? ''), langRef.current));

    return () => {
      translator.stop();
      translatorRef.current = null;
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [applyLang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // saqlash imkoni bo‘lmasa ham til almashadi
      }
      applyLang(next, true);
    },
    [applyLang]
  );

  const t = useCallback((text: string) => translateText(text, lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
