'use client';

import { create } from 'zustand';
import type { GameProfile } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById } from './gamesCatalog';

interface GameState {
  activeGame: GameProfile;
  activeGameId: string;
  hasHydrated: boolean;
  setActiveGame: (game: GameProfile) => void;
  setActiveGameById: (id: string, allGames?: GameProfile[]) => void;
  initializeDefaultGame: (allGames: GameProfile[]) => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'playverzus_active_game_id';
const defaultGame = OFFICIAL_GAMES[0]!;

export const useGameStore = create<GameState>((set, get) => ({
  activeGame: defaultGame,
  activeGameId: defaultGame.id,
  hasHydrated: false,

  setActiveGame: (game: GameProfile) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, game.id);
      } catch {
        // Ignore storage exceptions
      }
    }
    set({ activeGame: game, activeGameId: game.id });
  },

  setActiveGameById: (id: string, allGames?: GameProfile[]) => {
    const pool = allGames && allGames.length > 0 ? allGames : OFFICIAL_GAMES;
    const found = pool.find((g) => g.id.toLowerCase() === id.toLowerCase());
    if (found) {
      get().setActiveGame(found);
    } else {
      get().setActiveGame(getGameById(id));
    }
  },

  initializeDefaultGame: (allGames: GameProfile[]) => {
    if (!allGames || allGames.length === 0) return;

    let savedId: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        savedId = localStorage.getItem(STORAGE_KEY);
      } catch {
        // Ignore storage exceptions
      }
    }

    if (savedId) {
      const match =
        allGames.find((g) => g.id.toLowerCase() === savedId!.toLowerCase()) ||
        OFFICIAL_GAMES.find((g) => g.id.toLowerCase() === savedId!.toLowerCase());
      if (match) {
        set({ activeGame: match, activeGameId: match.id, hasHydrated: true });
        return;
      }
    }

    // Default to first official game
    const preferred = allGames.find((g) => g.isOfficial) || OFFICIAL_GAMES[0]!;
    if (preferred) {
      set({ activeGame: preferred, activeGameId: preferred.id, hasHydrated: true });
    }
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
          const game = getGameById(savedId);
          if (game) {
            set({ activeGame: game, activeGameId: game.id, hasHydrated: true });
            return;
          }
        }
      } catch {
        // Ignore storage exceptions
      }
      set({ hasHydrated: true });
    }
  },
}));

// Hydrate client-side after mount to guarantee deterministic initial hydration
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useGameStore.getState().hydrate();
  }, 0);
}
