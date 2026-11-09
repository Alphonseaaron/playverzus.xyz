'use client';

import { create } from 'zustand';
import { apiClient } from './api';

export interface GameAccount {
  gameId: string;
  gamertag: string;
  platformName: string;
  verified: boolean;
}

interface GameAccountsState {
  accounts: Record<string, string>; // gameId -> gamertag
  hasHydrated: boolean;
  setGamertag: (gameId: string, gamertag: string) => void;
  getGamertag: (gameId: string) => string | null;
  getGamertagLabel: (gameId: string) => string;
  hydrate: () => void;
}

const STORAGE_KEY = 'playverzus_game_accounts';

const PLATFORM_LABELS: Record<string, string> = {
  cs2: 'Steam ID / Gamertag',
  '00000000-0000-0000-0000-000000000001': 'Steam ID / Gamertag',
  apex: 'EA ID / Gamertag',
  '00000000-0000-0000-0000-000000000010': 'EA ID / Gamertag',
  eafc: 'EA ID',
  '00000000-0000-0000-0000-000000000002': 'EA ID',
  rl: 'Epic Games ID',
  '00000000-0000-0000-0000-000000000003': 'Epic Games ID',
  val: 'Riot ID (Name#TAG)',
  '00000000-0000-0000-0000-000000000004': 'Riot ID (Name#TAG)',
  dota2: 'Steam ID / Friend Code',
  '00000000-0000-0000-0000-000000000005': 'Steam ID / Friend Code',
  cod: 'Activision ID',
  '00000000-0000-0000-0000-000000000006': 'Activision ID',
  fortnite: 'Epic Games ID',
  '00000000-0000-0000-0000-000000000007': 'Epic Games ID',
  tekken8: 'Tekken ID / PSN / Gamertag',
  '00000000-0000-0000-0000-000000000008': 'Tekken ID / PSN / Gamertag',
  subway: 'Gamer Handle',
  '11111111-1111-1111-1111-111111111111': 'Gamer Handle',
  '00000000-0000-0000-0000-000000000016': 'Gamer Handle / Subway Tag',
  'subway-surfers': 'Gamer Handle / Subway Tag',
  pubgm: 'PUBG Character ID / IGN',
  '00000000-0000-0000-0000-000000000014': 'PUBG Character ID / IGN',
  pubgpc: 'Steam ID / PUBG In-Game Name',
  '00000000-0000-0000-0000-000000000015': 'Steam ID / PUBG In-Game Name',
  chess: 'Chess.com Username',
  'chess.com': 'Chess.com Username',
  '00000000-0000-0000-0000-000000000009': 'Chess.com Username',
  efootballm: 'Konami ID / Owner Name',
  '00000000-0000-0000-0000-000000000017': 'Konami ID / Owner Name',
  'efootball-mobile': 'Konami ID / Owner Name',
  efootball: 'Konami ID / PSN / Gamertag',
  '00000000-0000-0000-0000-000000000018': 'Konami ID / PSN / Gamertag',
  'efootball-console': 'Konami ID / PSN / Gamertag',
  eafcm: 'EA ID / In-Game Name',
  '00000000-0000-0000-0000-000000000019': 'EA ID / In-Game Name',
  'fc-mobile': 'EA ID / In-Game Name',
  'fcmobile': 'EA ID / In-Game Name',
  'fifa-mobile': 'EA ID / In-Game Name',
  '8ballpool': 'Miniclip ID / Unique ID',
  '00000000-0000-0000-0000-000000000020': 'Miniclip ID / Unique ID',
  '8-ball-pool': 'Miniclip ID / Unique ID',
  '8bp': 'Miniclip ID / Unique ID',
  'eightballpool': 'Miniclip ID / Unique ID',
};

export const useGameAccountsStore = create<GameAccountsState>((set, get) => ({
  accounts: {},
  hasHydrated: false,

  setGamertag: (gameId: string, gamertag: string) => {
    const cleanId = gameId.toLowerCase();
    const cleanTag = gamertag.trim();
    const updated = { ...get().accounts, [cleanId]: cleanTag };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage exceptions
      }
      // Sync with backend profile for cross-device & opponent MatchRoom visibility + anti-fraud binding
      apiClient<{ game_accounts?: Record<string, string> }>('/profile/me/gamertag', {
        method: 'POST',
        body: JSON.stringify({ gameId: cleanId, gamertag: cleanTag }),
      })
        .then((res) => {
          if (res?.game_accounts) {
            const merged = { ...get().accounts, ...res.game_accounts };
            set({ accounts: merged });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
          }
        })
        .catch(() => {
          // Local storage remains primary offline fallback
        });
    }
    set({ accounts: updated });
  },

  getGamertag: (gameId: string) => {
    if (!gameId) return null;
    return get().accounts[gameId.toLowerCase()] || null;
  },

  getGamertagLabel: (gameId: string) => {
    if (!gameId) return 'In-Game Gamertag';
    return PLATFORM_LABELS[gameId.toLowerCase()] || 'In-Game Gamertag / ID';
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      let localParsed: Record<string, string> = {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          localParsed = JSON.parse(saved);
          set({ accounts: localParsed, hasHydrated: true });
        }
      } catch {
        // Ignore storage exceptions
      }
      set({ hasHydrated: true });

      // Hydrate server-linked gamertags from authenticated profile
      apiClient<{ game_accounts?: Record<string, string> }>('/profile/me')
        .then((me) => {
          if (me?.game_accounts && Object.keys(me.game_accounts).length > 0) {
            const merged = { ...localParsed, ...get().accounts, ...me.game_accounts };
            set({ accounts: merged });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
          }
        })
        .catch(() => {});
    }
  },
}));

// Hydrate client-side after mount to guarantee deterministic initial hydration
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useGameAccountsStore.getState().hydrate();
  }, 0);
}
