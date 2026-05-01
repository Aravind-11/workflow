"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/features/notifications/actions";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [isPending, startTransition] = useTransition();

  const loadNotifications = useCallback(() => {
    startTransition(async () => {
      const res = await getNotificationsAction();
      if (res.ok && res.data) {
        setNotifications(
          res.data.notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
          })),
        );
        setUnread(res.data.unreadCount);
      }
    });
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnread((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-navy-surface">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-navy-border dark:bg-navy-surface">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-navy-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-50 px-4 py-3 dark:border-navy-border ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="ml-2 mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
                        title="Mark as read"
                      />
                    )}
                  </div>
                  {n.link && (
                    <a
                      href={n.link}
                      className="mt-1 inline-block text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => setOpen(false)}
                    >
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
