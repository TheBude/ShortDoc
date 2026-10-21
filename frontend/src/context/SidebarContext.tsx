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
