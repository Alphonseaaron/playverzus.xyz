'use client';

import { create } from 'zustand';
import type { GameProfile } from '@playverzus/core';
import { OFFICIAL_GAMES, getGameById } from './gamesCatalog';

interface GameState {
  activeGame: GameProfile;
  activeGameId: string;
  setActiveGame: (game: GameProfile) => void;
  setActiveGameById: (id: string, allGames?: GameProfile[]) => void;
  initializeDefaultGame: (allGames: GameProfile[]) => void;
}

const STORAGE_KEY = 'verzus_active_game_id';

const getInitialGame = (): GameProfile => {
  if (typeof window !== 'undefined') {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        return getGameById(savedId);
      }
    } catch {
      // Ignore storage error
    }
  }
  return OFFICIAL_GAMES[0]!;
};

const initial = getInitialGame();

export const useGameStore = create<GameState>((set, get) => ({
  activeGame: initial,
  activeGameId: initial.id,

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
    const pool = (allGames && allGames.length > 0) ? allGames : OFFICIAL_GAMES;
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
      const match = allGames.find((g) => g.id === savedId) || OFFICIAL_GAMES.find((g) => g.id === savedId);
      if (match) {
        set({ activeGame: match, activeGameId: match.id });
        return;
      }
    }

    // Default to first official game
    const defaultGame = allGames.find((g) => g.isOfficial) || OFFICIAL_GAMES[0]!;
    if (defaultGame) {
      set({ activeGame: defaultGame, activeGameId: defaultGame.id });
    }
  },
}));
