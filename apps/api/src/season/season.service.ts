import { Injectable } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { SeasonService as CoreSeasonService } from '@playverzus/core';

@Injectable()
export class SeasonService {
  private supabase: TypedSupabaseClient;
  private coreSeason: CoreSeasonService;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.coreSeason = new CoreSeasonService(this.supabase);
  }

  async listSeasons() {
    const { data, error } = await this.supabase
      .from('seasons')
      .select('*')
      .order('starts_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getActive() {
    return this.coreSeason.getActive();
  }

  async createSeason(name: string, startsAt: string, endsAt: string) {
    return this.coreSeason.createSeason(name, new Date(startsAt), new Date(endsAt));
  }
}
