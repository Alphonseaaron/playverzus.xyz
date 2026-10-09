import type { TypedSupabaseClient } from '@playverzus/db';

import type { GameType } from '../constants';
import type { RatingRecord } from './RatingService';

export class Leaderboard {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getTop(gameType: GameType, limit = 100): Promise<RatingRecord[]> {
    const { data, error } = await this.client
      .from('ratings')
      .select('*')
      .eq('game_type', gameType)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((d) => ({
      userId: d.user_id,
      gameType: d.game_type,
      rating: Number(d.rating),
      gamesPlayed: Number(d.games_played),
      wins: Number(d.wins),
      losses: Number(d.losses),
    }));
  }

  async getRank(userId: string, gameType: GameType): Promise<number | null> {
    const { data: userRating } = await this.client
      .from('ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .maybeSingle();

    if (!userRating) return null;

    const { count } = await this.client
      .from('ratings')
      .select('*', { count: 'exact', head: true })
      .eq('game_type', gameType)
      .gt('rating', userRating.rating);

    return (count ?? 0) + 1;
  }
}
