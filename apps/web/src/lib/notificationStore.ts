'use client';

import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'match' | 'party';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type?: NotificationType;
  actionLabel?: string;
  actionUrl?: string;
  timestamp: number;
  read: boolean;
  autoDismiss?: boolean;
  durationMs?: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  activeToasts: NotificationItem[];
  addNotification: (item: {
    title: string;
    body: string;
    type?: NotificationType;
    actionLabel?: string;
    actionUrl?: string;
    autoDismiss?: boolean;
    durationMs?: number;
  }) => string;
  dismissToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'welcome-init',
      title: 'Welcome to PlayVerzus Arena',
      body: 'Automated game sync active. Join duels or browse cups.',
      type: 'info',
      timestamp: 1728500000000,
      read: false,
    },
  ],
  activeToasts: [],

  addNotification: (item) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newItem: NotificationItem = {
      id,
      title: item.title,
      body: item.body,
      type: item.type || 'info',
      actionLabel: item.actionLabel,
      actionUrl: item.actionUrl,
      timestamp: Date.now(),
      read: false,
      autoDismiss: item.autoDismiss ?? true,
      durationMs: item.durationMs ?? 6000,
    };

    set((state) => ({
      notifications: [newItem, ...state.notifications].slice(0, 30), // keep latest 30
      activeToasts: [...state.activeToasts, newItem].slice(-4), // display up to 4 toasts at once
    }));

    if (newItem.autoDismiss) {
      setTimeout(() => {
        get().dismissToast(id);
      }, newItem.durationMs);
    }

    return id;
  },

  dismissToast: (id: string) => {
    set((state) => ({
      activeToasts: state.activeToasts.filter((t) => t.id !== id),
    }));
  },

  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => {
    set({
      notifications: [],
      activeToasts: [],
    });
  },
}));
