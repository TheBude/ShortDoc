'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchApi, getApiBaseUrl } from '@/lib/api';
import { AppNotification, RealtimeCounts } from '@/types';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock, FileCheck2, X } from 'lucide-react';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
}

interface RealtimeContextType {
  counts: RealtimeCounts;
  notifications: AppNotification[];
  unreadCount: number;
  decrementPendingSignatures: () => void;
  incrementPendingSignatures: () => void;
  refreshCounts: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio autoplay restrictions or blocked
  }
}

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<RealtimeCounts>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((toast: ToastItem) => {
    playNotificationSound();
    setActiveToast(toast);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchApi('/reports/dashboard');
      if (res.success && res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch {}
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetchApi<{ notifications: AppNotification[]; unreadCount: number }>('/notifications');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {}
  }, [user]);

  const decrementPendingSignatures = useCallback(() => {
    setCounts((prev) => ({
      ...prev,
      pendingSignatures: Math.max(0, (prev.pendingSignatures || 1) - 1),
      inApproval: Math.max(0, (prev.inApproval || 1) - 1),
    }));
  }, []);

  const incrementPendingSignatures = useCallback(() => {
    setCounts((prev) => ({
      ...prev,
      pendingSignatures: (prev.pendingSignatures || 0) + 1,
      inApproval: (prev.inApproval || 0) + 1,
    }));
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetchApi('/notifications/read-all', { method: 'PATCH' });
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      refreshCounts();
      refreshNotifications();
    } else {
      setCounts({});
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, refreshCounts, refreshNotifications]);

  // Periodic polling fallback (every 12s) to guarantee resilience
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshCounts();
      refreshNotifications();
    }, 12000);
    return () => clearInterval(interval);
  }, [user, refreshCounts, refreshNotifications]);

  // Real-time SSE Connection
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const token = localStorage.getItem('shortdoc_token');
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectSSE = async () => {
      if (isDisposed) return;
      try {
        const ticketRes = await fetchApi<{ ticket: string }>('/auth/stream-ticket', { method: 'POST' });
        if (isDisposed) return;

        if (!ticketRes.success || !ticketRes.data?.ticket) {
          if (!reconnectTimeout && !isDisposed) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 6000);
          }
          return;
        }

        const baseUrl = getApiBaseUrl();
        const sseUrl = `${baseUrl}/notifications/stream?ticket=${encodeURIComponent(ticketRes.data.ticket)}`;

        eventSource = new EventSource(sseUrl);

        // APPROVAL_NEEDED: A new document needs this user's signature
        eventSource.addEventListener('APPROVAL_NEEDED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            incrementPendingSignatures();
            refreshCounts();
            refreshNotifications();
            showToast({
              id: data.documentId || String(Date.now()),
              title: 'Imzolash uchun yangi hujjat',
              message: `${data.creatorName || 'Xodim'} sizga imzolash uchun hujjat yubordi: "${data.title || ''}" (${data.regNumber || ''})`,
              link: `/documents/${data.documentId}`,
            });
          } catch {}
        });

        // APPROVAL_SUBMITTED: Current user just signed a document -> decrement badge instantly
        eventSource.addEventListener('APPROVAL_SUBMITTED', (e: MessageEvent) => {
          try {
            decrementPendingSignatures();
            refreshCounts();
          } catch {}
        });

        // NOTIFICATION: General notification
        eventSource.addEventListener('NOTIFICATION', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setUnreadCount((c) => c + 1);
            setNotifications((prev) => [
              {
                id: String(Date.now()),
                userId: user.id,
                title: data.title || 'Bildirishnoma',
                message: data.message || '',
                link: data.link,
                isRead: false,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
            showToast({
              id: String(Date.now()),
              title: data.title || 'Bildirishnoma',
              message: data.message || '',
              link: data.link,
            });
          } catch {}
        });

        // COUNTS_UPDATE: Server says counts changed
        eventSource.addEventListener('COUNTS_UPDATE', () => {
          refreshCounts();
        });

        // NOTIFICATIONS_READ_ALL
        eventSource.addEventListener('NOTIFICATIONS_READ_ALL', () => {
          setUnreadCount(0);
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect with backoff and fresh ticket
          if (!reconnectTimeout && !isDisposed) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 5000);
          }
        };
      } catch {
        // Fallback polling will handle it
      }
    };

    connectSSE();

    return () => {
      isDisposed = true;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, incrementPendingSignatures, decrementPendingSignatures, refreshCounts, refreshNotifications, showToast]);

  return (
    <RealtimeContext.Provider
      value={{
        counts,
        notifications,
        unreadCount,
        decrementPendingSignatures,
        incrementPendingSignatures,
        refreshCounts,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}

      {/* Floating Real-time Toast Banner */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-[99999] max-w-sm w-full bg-white dark:bg-slate-900 border-2 border-primary-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                {activeToast.message}
              </p>
              {activeToast.link && (
                <Link
                  href={activeToast.link}
                  onClick={() => setActiveToast(null)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline mt-2"
                >
                  <span>Hujjatni ko‘rish →</span>
                </Link>
              )}
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              aria-label="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};
