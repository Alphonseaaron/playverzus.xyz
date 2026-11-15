import { Injectable } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { Leaderboard as CoreLeaderboard, type GameType } from '@playverzus/core';

@Injectable()
export class LeaderboardService {
  private supabase: TypedSupabaseClient;
  private coreLeaderboard: CoreLeaderboard;
  private readonly topCache = new Map<string, { data: any[]; expiresAt: number }>();

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.coreLeaderboard = new CoreLeaderboard(this.supabase);
  }

  async getTop(gameType: GameType, limit = 50) {
    const cacheKey = `${gameType}:${limit}`;
    const cached = this.topCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const records = await this.coreLeaderboard.getTop(gameType, limit);
    if (!records || records.length === 0) return [];

    const userIds = Array.from(new Set(records.map((r) => r.userId).filter(Boolean)));
    if (userIds.length === 0) return records;

    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, username, display_name, region')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        {
          username: p.username,
          countryCode: (p as Record<string, unknown>).country_code || p.region || undefined,
        },
      ]),
    );

    const result = records.map((r) => {
      const prof = profileMap.get(r.userId);
      return {
        ...r,
        username: prof?.username,
        countryCode: prof?.countryCode,
      };
    });

    this.topCache.set(cacheKey, { data: result, expiresAt: Date.now() + 30_000 }); // 30s TTL
    return result;
  }

  async getRank(userId: string, gameType: GameType) {
    const rank = await this.coreLeaderboard.getRank(userId, gameType);
    return { userId, gameType, rank };
  }
}
