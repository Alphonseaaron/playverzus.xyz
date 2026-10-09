import type { TypedSupabaseClient } from '@playverzus/db';

import { DEFAULT_ELO, type GameType } from '../constants';
import { namedLogger } from '../logger';

const log = namedLogger('RatingService');

export interface RatingServiceDeps {
  client: TypedSupabaseClient;
}

export interface RatingRecord {
  userId: string;
  gameType: GameType;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

/** Persists per-game-type Elo ratings. */
export class RatingService {
  constructor(private readonly deps: RatingServiceDeps) {}

  async get(userId: string, gameType: GameType): Promise<RatingRecord> {
    const { data, error } = await this.deps.client
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .maybeSingle();
    if (error) log.warn({ err: error.message }, 'rating read failed');
    if (!data) {
      return { userId, gameType, rating: DEFAULT_ELO, gamesPlayed: 0, wins: 0, losses: 0 };
    }
    return {
      userId: data.user_id,
      gameType: data.game_type,
      rating: Number(data.rating),
      gamesPlayed: Number(data.games_played),
      wins: Number(data.wins),
      losses: Number(data.losses),
    };
  }

  async recordResult(userId: string, gameType: GameType, won: boolean): Promise<RatingRecord> {
    const { error } = await this.deps.client.rpc('update_rating', {
      p_user_id: userId,
      p_game_type: gameType,
      p_won: won,
    });
    if (error) log.warn({ err: error.message }, 'rating update failed');
    return this.get(userId, gameType);
  }

  async leaderboard(gameType: GameType, limit = 50): Promise<RatingRecord[]> {
    const { data, error } = await this.deps.client
      .from('ratings')
      .select('*')
      .eq('game_type', gameType)
      .order('rating', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((d) => ({
      userId: d.user_id,
      gameType: d.game_type,
      rating: Number(d.rating),
      gamesPlayed: Number(d.games_played),
      wins: Number(d.wins),
      losses: Number(d.losses),
    }));
  }
}
