// src/components/layout/NotificationBell.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter }   from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import {
  useNotifications, useMarkRead, useMarkAllRead, Notification,
} from '@/hooks/useNotifications';

const TYPE_ICON: Record<string, string> = {
  new_report:           '🗂️',
  report_validated:     '✅',
  new_comment:          '💬',
  new_withdrawal:       '💰',
  withdrawal_processed: '🏦',
  new_category:         '🏷️',
};

function NotifItem({
  notif, onRead,
}: {
  notif:  Notification;
  onRead: (id: number, link: string | null) => void;
}) {
  return (
    <button
      onClick={() => onRead(notif.id, notif.link)}
      className={`
        w-full text-left px-4 py-3 border-b border-surface-border/50
        hover:bg-surface-raised transition-colors
        ${!notif.is_read ? 'bg-brand/5' : ''}
      `}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-base flex-shrink-0 mt-0.5">
          {TYPE_ICON[notif.type] ?? '🔔'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-xs font-medium truncate ${
              !notif.is_read ? 'text-ink' : 'text-ink-muted'
            }`}>
              {notif.title}
            </p>
            {!notif.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2 leading-relaxed">
            {notif.body}
          </p>
          <p className="text-[10px] text-ink-faint mt-1">
            {new Date(notif.created_at).toLocaleString('id-ID', {
              day: 'numeric', month: 'short',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open,  setOpen]  = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const router            = useRouter();

  const { data }    = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const unread        = data?.unread ?? 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleRead(id: number, link: string | null) {
    markRead.mutate(id);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-overlay border border-transparent hover:border-surface-border transition-all"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-overlay border border-surface-border rounded-xl shadow-modal animate-fade-in overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-brand" />
              <span className="text-sm font-medium text-ink">Notifications</span>
              {unread > 0 && (
                <span className="text-xs text-brand-300">({unread} unread)</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-brand transition-colors"
              >
                <CheckCheck size={12} />
                Read All
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={24} className="text-ink-faint" />
                <p className="text-sm text-ink-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifItem key={n.id} notif={n} onRead={handleRead} />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-surface-border">
              <p className="text-[10px] text-ink-faint text-center">
                Showing last 30 notifications · Updates every 15s
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}