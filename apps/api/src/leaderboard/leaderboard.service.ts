import { Injectable } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { Leaderboard as CoreLeaderboard, type GameType } from '@playverzus/core';

@Injectable()
export class LeaderboardService {
  private supabase: TypedSupabaseClient;
  private coreLeaderboard: CoreLeaderboard;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.coreLeaderboard = new CoreLeaderboard(this.supabase);
  }

  async getTop(gameType: GameType, limit = 50) {
    return this.coreLeaderboard.getTop(gameType, limit);
  }

  async getRank(userId: string, gameType: GameType) {
    const rank = await this.coreLeaderboard.getRank(userId, gameType);
    return { userId, gameType, rank };
  }
}
