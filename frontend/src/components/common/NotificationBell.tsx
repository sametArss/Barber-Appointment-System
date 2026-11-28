import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  CheckCheck,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import { useAuthStore } from '@/store/useAuthStore';
import type { NotificationResponse } from '@/types/notification';

const getNotificationIcon = (item: NotificationResponse) => {
  const titleLower = item.title.toLocaleLowerCase('tr');
  if (titleLower.includes('no-show') || titleLower.includes('ceza')) {
    return {
      icon: ShieldAlert,
      boxClass: 'border-orange-500/30 bg-orange-500/12 text-orange-600 dark:text-orange-400',
    };
  }
  switch (item.type) {
    case 2: // AppointmentCreated
      return {
        icon: CalendarPlus,
        boxClass: 'border-amber-500/30 bg-amber-500/12 text-[#D97706] dark:text-amber-400',
      };
    case 3: // AppointmentConfirmed
      return {
        icon: CalendarCheck2,
        boxClass: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
      };
    case 4: // AppointmentCancelled
      return {
        icon: CalendarX2,
        boxClass: 'border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-400',
      };
    case 6: // AppointmentCompleted
      return {
        icon: Sparkles,
        boxClass: 'border-sky-500/30 bg-sky-500/12 text-sky-600 dark:text-sky-400',
      };
    default:
      return {
        icon: Bell,
        boxClass: 'border-amber-500/25 bg-amber-500/10 text-[#D97706] dark:text-amber-400',
      };
  }
};

export const NotificationBell: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPollRef = useRef<number>(0);

  const PAGE_SIZE = 20;

  const fetchUnreadCount = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    if (!force && document.hidden) return;
    const now = Date.now();
    if (!force && now - lastPollRef.current < 15000) return;
    lastPollRef.current = now;

    try {
      const res = await notificationService.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationService.getMyNotifications(false, 0, PAGE_SIZE);
      if (res.success && res.data) {
        setNotifications(res.data);
        setHasMore(res.data.length === PAGE_SIZE);
      }
      void fetchUnreadCount(true);
    } catch {
      // preserve
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  const handleLoadMore = async () => {
    if (!isAuthenticated || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await notificationService.getMyNotifications(false, notifications.length, PAGE_SIZE);
      if (res.success && res.data) {
        const incoming = res.data;
        setNotifications((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...incoming.filter((n) => !seen.has(n.id))];
        });
        setHasMore(incoming.length === PAGE_SIZE);
      }
    } catch {
      // preserve
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      setHasMore(false);
      return;
    }

    void fetchUnreadCount(true);
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void fetchUnreadCount(false);
      }
    }, 30000);
    const onFocus = () => void fetchUnreadCount(false);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void fetchUnreadCount(false);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      toast.info('Bildirimleri görmek için oturum açmalısınız.');
      return;
    }

    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Bildirim okundu olarak işaretlenemedi.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Tüm bildirimler okundu olarak işaretlendi.');
    } catch {
      toast.error('Bildirimler güncellenemedi.');
    }
  };

  const visibleItems = tab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-label="Bildirimler"
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200/90 bg-white/85 text-slate-600 shadow-sm transition-colors hover:border-amber-500/50 hover:text-[#D97706] dark:border-white/15 dark:bg-slate-900/75 dark:text-slate-300 dark:hover:border-amber-400/50 dark:hover:text-amber-400"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D97706] px-1 text-[9px] font-bold text-white shadow-sm dark:bg-amber-500 dark:text-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2.5 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-amber-500/25 dark:bg-slate-900/95">
          {/* Header */}
          <div className="border-b border-slate-100 px-4 py-3.5 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold text-slate-900 dark:text-white">
                  Bildirimler
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-[#B45309] dark:text-amber-300">
                    {unreadCount} yeni
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#D97706] hover:underline dark:text-amber-400"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tümünü Oku
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="mt-2.5 inline-flex rounded-xl border border-slate-200/80 bg-slate-50/80 p-0.5 dark:border-white/10 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => setTab('all')}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  tab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setTab('unread')}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  tab === 'unread'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                Okunmamış ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Yükleniyor...</div>
            ) : visibleItems.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tab === 'unread'
                    ? 'Okunmamış bildiriminiz kalmadı.'
                    : 'Henüz bildiriminiz bulunmuyor.'}
                </p>
              </div>
            ) : (
              <>
                {visibleItems.map((item) => {
                  const { icon: Icon, boxClass } = getNotificationIcon(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !item.isRead && void handleMarkAsRead(item.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5',
                        !item.isRead && 'bg-amber-50/45 dark:bg-amber-500/8',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                          boxClass,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </p>
                          {!item.isRead && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D97706] dark:bg-amber-400" />
                          )}
                        </div>
                        <p className="mt-1 whitespace-normal break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {item.message}
                        </p>
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdDate).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {hasMore && (
                  <div className="p-2.5 text-center">
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => void handleLoadMore()}
                      className="w-full cursor-pointer rounded-xl border border-slate-200/80 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-500/40 hover:text-amber-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:text-amber-300"
                    >
                      {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Bildirim Yükle'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
