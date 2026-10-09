import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import type { GameType, Platform, ROI } from '@playverzus/core';

@Injectable()
export class GameProfileService {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  private mapProfile(p: any) {
    if (!p) return null;
    return {
      ...p,
      displayName: p.display_name ?? p.displayName,
      gameType: p.game_type ?? p.gameType,
      isOfficial: p.is_official ?? p.isOfficial ?? false,
      playCount: p.play_count ?? p.playCount ?? 0,
      endKeywords: p.end_keywords ?? p.endKeywords ?? [],
      regexPattern: p.regex_pattern ?? p.regexPattern,
    };
  }

  async listApproved() {
    const { data, error } = await this.supabase
      .from('game_profiles')
      .select('*')
      .eq('approved', true)
      .order('play_count', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((p) => this.mapProfile(p));
  }

  async getById(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      const { data } = await this.supabase
        .from('game_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data) return this.mapProfile(data);
    }

    const SLUG_TO_UUID: Record<string, string> = {
      'cs2': '00000000-0000-0000-0000-000000000001',
      'counter-strike-2': '00000000-0000-0000-0000-000000000001',
      'eafc': '00000000-0000-0000-0000-000000000002',
      'eafc24': '00000000-0000-0000-0000-000000000002',
      'fc25': '00000000-0000-0000-0000-000000000002',
      'rl': '00000000-0000-0000-0000-000000000003',
      'rocket-league': '00000000-0000-0000-0000-000000000003',
      'val': '00000000-0000-0000-0000-000000000004',
      'valorant': '00000000-0000-0000-0000-000000000004',
      'dota2': '00000000-0000-0000-0000-000000000005',
      'dota': '00000000-0000-0000-0000-000000000005',
      'cod': '00000000-0000-0000-0000-000000000006',
      'warzone': '00000000-0000-0000-0000-000000000006',
      'fortnite': '00000000-0000-0000-0000-000000000007',
      'tekken8': '00000000-0000-0000-0000-000000000008',
      'tekken': '00000000-0000-0000-0000-000000000008',
    };

    const targetUuid = SLUG_TO_UUID[id.toLowerCase()];
    if (targetUuid) {
      const { data } = await this.supabase
        .from('game_profiles')
        .select('*')
        .eq('id', targetUuid)
        .maybeSingle();

      if (data) return this.mapProfile(data);
    }

    // Fallback: search by display_name
    const { data: nameMatches } = await this.supabase
      .from('game_profiles')
      .select('*')
      .ilike('display_name', `%${id}%`)
      .limit(1);

    if (nameMatches && nameMatches.length > 0) {
      return this.mapProfile(nameMatches[0]);
    }

    throw new NotFoundException(`Game profile '${id}' not found`);
  }

  async submitProfile(
    userId: string,
    profile: {
      displayName: string;
      gameType: GameType;
      platform: Platform;
      roi: ROI;
      constraints?: Record<string, unknown>;
      endKeywords?: string[];
      regexPattern?: string;
    },
  ) {
    const { data, error } = await this.supabase
      .from('game_profiles')
      .insert({
        display_name: profile.displayName,
        game_type: profile.gameType,
        platform: profile.platform,
        roi: profile.roi as never,
        constraints: (profile.constraints ?? {}) as never,
        end_keywords: profile.endKeywords ?? [],
        regex_pattern: profile.regexPattern ?? null,
        submitted_by: userId,
        approved: false,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async approveProfile(id: string, adminId: string) {
    const { data, error } = await this.supabase
      .from('game_profiles')
      .update({ approved: true, approved_by: adminId })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateCalibration(id: string, roi: ROI) {
    const { data, error } = await this.supabase
      .from('game_profiles')
      .update({ roi: roi as never })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
