'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  isMobileOpen: boolean;
  isDesktopCollapsed: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
  toggleDesktopCollapsed: () => void;
  setDesktopCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Load desktop collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shortdoc_sidebar_collapsed');
      if (saved !== null) {
        setIsDesktopCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  // Automatically close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Menyu ochiq turib ekran kengaysa (masalan, planshet gorizontal burilsa) u yopiladi,
  // Escape bosilganda ham yopiladi
  useEffect(() => {
    if (!isMobileOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobileOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    desktop.addEventListener('change', onResize);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      desktop.removeEventListener('change', onResize);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileOpen]);

  // Barmoq bilan surish: chap chetdan o‘ngga — menyu ochiladi, ochiq menyuni chapga surish — yopiladi
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 1023px)');
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (!mobile.matches || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = isMobileOpen || startX <= 24;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dy > Math.abs(dx) * 0.6 || Math.abs(dx) < 60) return;
      if (!isMobileOpen && dx > 0) setIsMobileOpen(true);
      else if (isMobileOpen && dx < 0) setIsMobileOpen(false);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobileOpen]);

  const openMobile = () => setIsMobileOpen(true);
  const closeMobile = () => setIsMobileOpen(false);
  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  const toggleDesktopCollapsed = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('shortdoc_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const setDesktopCollapsed = (collapsed: boolean) => {
    setIsDesktopCollapsed(collapsed);
    try {
      localStorage.setItem('shortdoc_sidebar_collapsed', String(collapsed));
    } catch {}
  };

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        isDesktopCollapsed,
        openMobile,
        closeMobile,
        toggleMobile,
        toggleDesktopCollapsed,
        setDesktopCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
