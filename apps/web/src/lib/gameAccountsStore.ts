'use client';

import { create } from 'zustand';
import { apiClient } from './api';
import { findCatalogGame, UUID_TO_CATALOG_SLUG } from './gamesCatalog';

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

export function getAllGameAliases(gameIdOrSlug: string): string[] {
  if (!gameIdOrSlug) return [];
  const clean = gameIdOrSlug.toLowerCase().trim();
  const aliases = new Set<string>([clean]);

  // If this ID is in UUID_TO_CATALOG_SLUG, add the mapped slug
  const mappedSlug = UUID_TO_CATALOG_SLUG[clean];
  if (mappedSlug) {
    aliases.add(mappedSlug.toLowerCase());
  }

  // Find in official games catalog
  const catalog = findCatalogGame(clean);
  if (catalog) {
    aliases.add(catalog.id.toLowerCase());
    if (catalog.shortName) {
      aliases.add(catalog.shortName.toLowerCase());
    }
  }

  // Check all UUID_TO_CATALOG_SLUG entries that map to any known alias
  for (const [uuidOrAlias, targetSlug] of Object.entries(UUID_TO_CATALOG_SLUG)) {
    if (aliases.has(targetSlug.toLowerCase()) || aliases.has(uuidOrAlias.toLowerCase())) {
      aliases.add(uuidOrAlias.toLowerCase());
      aliases.add(targetSlug.toLowerCase());
    }
  }

  return Array.from(aliases);
}

function expandAccountsWithAliases(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = { ...raw };
  for (const [key, val] of Object.entries(raw)) {
    if (!val) continue;
    const aliases = getAllGameAliases(key);
    for (const alias of aliases) {
      if (!result[alias]) {
        result[alias] = val;
      }
    }
  }
  return result;
}

const PLATFORM_LABELS: Record<string, string> = {
  cs2: 'Steam ID / Gamertag',
  '00000000-0000-0000-0000-000000000001': 'Steam ID / Gamertag',
  apex: 'EA ID / Gamertag',
  '00000000-0000-0000-0000-000000000010': 'EA ID / Gamertag',
  marvelrivals: 'Marvel Rivals UID / Username',
  '00000000-0000-0000-0000-000000000011': 'Marvel Rivals UID / Username',
  'marvel-rivals': 'Marvel Rivals UID / Username',
  'marvel_rivals': 'Marvel Rivals UID / Username',
  mr: 'Marvel Rivals UID / Username',
  rivals: 'Marvel Rivals UID / Username',
  eafc: 'EA ID',
  '00000000-0000-0000-0000-000000000002': 'EA ID',
  rl: 'Epic Games ID / Gamertag',
  '00000000-0000-0000-0000-000000000003': 'Epic Games ID / Gamertag',
  'rocket-league': 'Epic Games ID / Gamertag',
  'rocketleague': 'Epic Games ID / Gamertag',
  val: 'Riot ID (Name#TAG)',
  '00000000-0000-0000-0000-000000000004': 'Riot ID (Name#TAG)',
  valorant: 'Riot ID (Name#TAG)',
  'riot-valorant': 'Riot ID (Name#TAG)',
  lol: 'Riot ID (Name#TAG) / Summoner Name',
  '00000000-0000-0000-0000-000000000012': 'Riot ID (Name#TAG) / Summoner Name',
  'league-of-legends': 'Riot ID (Name#TAG) / Summoner Name',
  leagueoflegends: 'Riot ID (Name#TAG) / Summoner Name',
  league_of_legends: 'Riot ID (Name#TAG) / Summoner Name',
  league: 'Riot ID (Name#TAG) / Summoner Name',
  'riot-lol': 'Riot ID (Name#TAG) / Summoner Name',
  mlbb: 'MLBB User ID (Server ID) / IGN',
  '00000000-0000-0000-0000-000000000013': 'MLBB User ID (Server ID) / IGN',
  'mobile-legends': 'MLBB User ID (Server ID) / IGN',
  'mobile-legends-bang-bang': 'MLBB User ID (Server ID) / IGN',
  mobilelegends: 'MLBB User ID (Server ID) / IGN',
  mobile_legends: 'MLBB User ID (Server ID) / IGN',
  dota2: 'Steam ID / Friend Code',
  '00000000-0000-0000-0000-000000000005': 'Steam ID / Friend Code',
  cod: 'Activision ID',
  '00000000-0000-0000-0000-000000000006': 'Activision ID',
  warzone: 'Activision ID',
  'cod-warzone': 'Activision ID',
  'call-of-duty': 'Activision ID',
  'call-of-duty-warzone': 'Activision ID',
  wz: 'Activision ID',
  fortnite: 'Epic Games ID',
  '00000000-0000-0000-0000-000000000007': 'Epic Games ID',
  fn: 'Epic Games ID',
  'fortnite-br': 'Epic Games ID',
  'fortnite-battle-royale': 'Epic Games ID',
  tekken8: 'Tekken ID / PSN / Gamertag',
  '00000000-0000-0000-0000-000000000008': 'Tekken ID / PSN / Gamertag',
  'tekken-8': 'Tekken ID / PSN / Gamertag',
  tekken: 'Tekken ID / PSN / Gamertag',
  tk8: 'Tekken ID / PSN / Gamertag',
  mk11: 'WB Games ID / PSN / Gamertag',
  '00000000-0000-0000-0000-000000000021': 'WB Games ID / PSN / Gamertag',
  mk: 'WB Games ID / PSN / Gamertag',
  mk1: 'WB Games ID / PSN / Gamertag',
  'mortal-kombat': 'WB Games ID / PSN / Gamertag',
  'mortal-kombat-11': 'WB Games ID / PSN / Gamertag',
  'mortal-kombat-1': 'WB Games ID / PSN / Gamertag',
  mortalkombat: 'WB Games ID / PSN / Gamertag',
  mortal_kombat: 'WB Games ID / PSN / Gamertag',
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
    const cleanId = gameId.toLowerCase().trim();
    const cleanTag = gamertag.trim();
    const aliases = getAllGameAliases(cleanId);

    const updated = { ...get().accounts };
    for (const alias of aliases) {
      updated[alias] = cleanTag;
    }
    updated[cleanId] = cleanTag;

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
            const expandedServer = expandAccountsWithAliases(res.game_accounts);
            const merged = { ...get().accounts, ...expandedServer };
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
    const accounts = get().accounts;
    const cleanId = gameId.toLowerCase().trim();
    if (accounts[cleanId]) return accounts[cleanId];
    const aliases = getAllGameAliases(cleanId);
    for (const alias of aliases) {
      if (accounts[alias]) return accounts[alias];
    }
    return null;
  },

  getGamertagLabel: (gameId: string) => {
    if (!gameId) return 'In-Game Gamertag';
    const cleanId = gameId.toLowerCase().trim();
    if (PLATFORM_LABELS[cleanId]) return PLATFORM_LABELS[cleanId];
    const aliases = getAllGameAliases(cleanId);
    for (const alias of aliases) {
      if (PLATFORM_LABELS[alias]) return PLATFORM_LABELS[alias];
    }
    return 'In-Game Gamertag / ID';
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      let localParsed: Record<string, string> = {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          localParsed = expandAccountsWithAliases(JSON.parse(saved));
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
            const expandedServer = expandAccountsWithAliases(me.game_accounts);
            const merged = { ...localParsed, ...get().accounts, ...expandedServer };
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
