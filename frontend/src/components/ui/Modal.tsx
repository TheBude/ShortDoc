import React from 'react';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

interface ModalProps {
  children: React.ReactNode;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Telefonda ekran pastidan chiqadigan oyna (bottom sheet), kattaroq ekranlarda markazdagi oyna.
 * Mazmun ekrandan uzun bo‘lsa, oyna ichida siljiydi. Oyna ochiq turganda orqadagi sahifa
 * siljimaydi (globals.css dagi [data-scroll-lock] qoidasi).
 */
export const Modal: React.FC<ModalProps> = ({ children, size = 'md', className = '' }) => (
  <div
    data-scroll-lock
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm sm:p-4 overflow-y-auto overscroll-contain"
  >
    <div
      className={`sheet-enter w-full ${SIZES[size]} max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-6 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  </div>
);
