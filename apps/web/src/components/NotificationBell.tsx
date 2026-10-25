'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2, BellOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useNotificationStore, type NotificationItem } from '../lib/notificationStore';
import { requestNotificationPermission } from '../lib/notifications';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

function formatTimeAgo(timestamp: number) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableDeviceAlerts = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition border border-border"
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell className="w-4 h-4" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] text-destructive hover:opacity-80 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {!permissionGranted && (
            <div className="my-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold text-[11px] text-foreground block">
                  Device Push Alerts
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Get popups when opponents join or matches end.
                </span>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={handleEnableDeviceAlerts}
                className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
              >
                Enable
              </Button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-border pr-1 py-1">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                <BellOff className="w-8 h-8 text-muted-foreground/60" />
                <span className="text-xs">You're all caught up! No notifications.</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3 transition-colors cursor-pointer flex flex-col gap-1.5 rounded-lg ${
                    !n.read ? 'bg-muted/70' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-foreground leading-snug">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                      {mounted ? formatTimeAgo(n.timestamp) : 'Recent'}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {n.body}
                  </p>

                  {n.actionUrl && n.actionLabel && (
                    <div className="pt-1">
                      <Link
                        href={n.actionUrl}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span>{n.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <Separator className="my-2" />

          <div className="text-[10px] text-muted-foreground text-center font-mono">
            Live match alerts & instant score sync active
          </div>
        </div>
      )}
    </div>
  );
}
