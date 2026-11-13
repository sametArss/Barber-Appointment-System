import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import { useAuthStore } from '@/store/useAuthStore';
import type { NotificationResponse } from '@/types/notification';

export const NotificationBell: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    let cancelled = false;
    notificationService
      .getUnreadCount()
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setUnreadCount(res.data.unreadCount);
        }
      })
      .catch(() => {
        // silent
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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
      setLoading(true);
      try {
        const res = await notificationService.getMyNotifications(false);
        if (res.success && res.data) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n) => !n.isRead).length);
        }
      } catch {
        // preserve
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
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
    } catch {
      toast.error('Bildirimler güncellenemedi.');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Bildirimler"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-amber-500/50 hover:text-amber-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:border-amber-500/40 dark:hover:text-amber-400 cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950 shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-2xl dark:shadow-black/60 backdrop-blur-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-4 py-3">
            <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">Bildirimler</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tümünü Oku
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/70">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Henüz yeni bildiriminiz bulunmuyor.
              </div>
            ) : (
              notifications.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer',
                    !item.isRead && 'bg-amber-50/50 dark:bg-amber-500/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100">{item.title}</p>
                    {!item.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">{item.message}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {new Date(item.createdDate).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
