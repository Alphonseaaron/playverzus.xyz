import { Injectable } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { RatingService as CoreRatingService, type GameType } from '@playverzus/core';

@Injectable()
export class RatingService {
  private supabase: TypedSupabaseClient;
  private coreRating: CoreRatingService;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.coreRating = new CoreRatingService({ client: this.supabase });
  }

  async getUserRatings(userId: string) {
    const { data, error } = await this.supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }

  async getRating(userId: string, gameType: GameType) {
    return this.coreRating.get(userId, gameType);
  }

  async recordResult(userId: string, gameType: GameType, won: boolean) {
    return this.coreRating.recordResult(userId, gameType, won);
  }
}
