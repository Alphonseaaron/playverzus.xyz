'use client';

import { create } from 'zustand';

export type WalletMode = 'REAL' | 'DEMO';

interface WalletModeState {
  mode: WalletMode;
  hasHydrated: boolean;
  setMode: (mode: WalletMode) => void;
  toggleMode: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'playverzus_wallet_mode';

export const useWalletModeStore = create<WalletModeState>((set) => ({
  mode: 'REAL',
  hasHydrated: false,

  setMode: (mode: WalletMode) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Ignore storage exceptions
      }
    }
    set({ mode });
  },

  toggleMode: () => {
    set((state) => {
      const nextMode: WalletMode = state.mode === 'REAL' ? 'DEMO' : 'REAL';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, nextMode);
        } catch {
          // Ignore storage exceptions
        }
      }
      return { mode: nextMode };
    });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as WalletMode;
        if (saved === 'REAL' || saved === 'DEMO') {
          set({ mode: saved, hasHydrated: true });
          return;
        }
      } catch {
        // Ignore storage exceptions
      }
      set({ hasHydrated: true });
    }
  },
}));

// Automatically hydrate client-side after mounting without blocking initial render
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useWalletModeStore.getState().hydrate();
  }, 0);
}
