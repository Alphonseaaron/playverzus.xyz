import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

@Injectable()
export class ProfileService {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  async getProfileById(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Profile not found');
    return data;
  }

  async getProfileByUsername(username: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) throw new NotFoundException(`User @${username} not found`);
    return data;
  }

  async updateProfile(userId: string, updates: { displayName?: string; avatarUrl?: string; region?: string; phone?: string }) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        display_name: updates.displayName,
        avatar_url: updates.avatarUrl,
        region: updates.region,
        phone: updates.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getUserMatches(username: string) {
    const profile = await this.getProfileByUsername(username);

    const { data, error } = await this.supabase
      .from('matches')
      .select('*')
      .or(`player_a.eq.${profile.id},player_b.eq.${profile.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data;
  }
}
