import type { TypedSupabaseClient } from '@playverzus/db';

export interface SeasonRecord {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
}

export class SeasonService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getActive(): Promise<SeasonRecord | null> {
    const { data } = await this.client
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      startsAt: new Date(data.starts_at),
      endsAt: new Date(data.ends_at),
      isActive: data.is_active,
    };
  }

  async createSeason(name: string, startsAt: Date, endsAt: Date): Promise<SeasonRecord> {
    const { data, error } = await this.client.rpc('create_season', {
      p_name: name,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
    });

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      name: data.name,
      startsAt: new Date(data.starts_at),
      endsAt: new Date(data.ends_at),
      isActive: data.is_active,
    };
  }

  async resetRatings(seasonId: string): Promise<void> {
    const { error } = await this.client.rpc('reset_season_ratings', {
      p_season_id: seasonId,
    });
    if (error) throw new Error(error.message);
  }
}
