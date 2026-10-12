import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import type { GameType, Platform, ROI } from '@playverzus/core';

export const OFFICIAL_SLUG_TO_UUID: Record<string, string> = {
  cs2: '00000000-0000-0000-0000-000000000001',
  'counter-strike-2': '00000000-0000-0000-0000-000000000001',
  eafc: '00000000-0000-0000-0000-000000000002',
  eafc24: '00000000-0000-0000-0000-000000000002',
  'ea-fc-25': '00000000-0000-0000-0000-000000000002',
  fc25: '00000000-0000-0000-0000-000000000002',
  rl: '00000000-0000-0000-0000-000000000003',
  'rocket-league': '00000000-0000-0000-0000-000000000003',
  val: '00000000-0000-0000-0000-000000000004',
  valorant: '00000000-0000-0000-0000-000000000004',
  dota2: '00000000-0000-0000-0000-000000000005',
  dota: '00000000-0000-0000-0000-000000000005',
  cod: '00000000-0000-0000-0000-000000000006',
  'cod-warzone': '00000000-0000-0000-0000-000000000006',
  warzone: '00000000-0000-0000-0000-000000000006',
  fortnite: '00000000-0000-0000-0000-000000000007',
  tekken8: '00000000-0000-0000-0000-000000000008',
  'tekken-8': '00000000-0000-0000-0000-000000000008',
  tekken: '00000000-0000-0000-0000-000000000008',
  subway: '11111111-1111-1111-1111-111111111111',
  'subway-surfers': '11111111-1111-1111-1111-111111111111',
  'high-score': '11111111-1111-1111-1111-111111111111',
  'time-trial': '22222222-2222-2222-2222-222222222222',
  'win-loss': '33333333-3333-3333-3333-333333333333',
};

export const OFFICIAL_SEED_BY_UUID: Record<
  string,
  {
    id: string;
    display_name: string;
    game_type: GameType;
    platform: Platform;
    roi: ROI;
    constraints: Record<string, unknown>;
    end_keywords: string[];
    regex_pattern: string | null;
    approved: boolean;
    is_official: boolean;
  }
> = {
  '00000000-0000-0000-0000-000000000001': {
    id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Counter-Strike 2',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.4, y: 0.02, w: 0.2, h: 0.08 },
    constraints: { min: 0, max: 30 },
    end_keywords: ['MATCH POINT', 'VICTORY', 'DEFEAT', 'TERRORISTS WIN', 'COUNTER-TERRORISTS WIN'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000002': {
    id: '00000000-0000-0000-0000-000000000002',
    display_name: 'EA Sports FC 25',
    game_type: 'HEAD_TO_HEAD',
    platform: 'CONSOLE',
    roi: { x: 0.05, y: 0.05, w: 0.2, h: 0.08 },
    constraints: { min: 0, max: 20 },
    end_keywords: ['FULL TIME', 'MATCH OVER', 'FINAL SCORE'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000003': {
    id: '00000000-0000-0000-0000-000000000003',
    display_name: 'Rocket League',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.42, y: 0.02, w: 0.16, h: 0.08 },
    constraints: { min: 0, max: 25 },
    end_keywords: ['WINNER', 'GAME OVER', 'FINAL'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000004': {
    id: '00000000-0000-0000-0000-000000000004',
    display_name: 'Valorant',
    game_type: 'BINARY_RESULT',
    platform: 'PC',
    roi: { x: 0.35, y: 0.2, w: 0.3, h: 0.15 },
    constraints: {},
    end_keywords: ['VICTORY', 'DEFEAT', 'MATCH COMPLETED'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000005': {
    id: '00000000-0000-0000-0000-000000000005',
    display_name: 'Dota 2',
    game_type: 'BINARY_RESULT',
    platform: 'PC',
    roi: { x: 0.3, y: 0.25, w: 0.4, h: 0.2 },
    constraints: {},
    end_keywords: ['VICTORY', 'DEFEAT', 'RADIANT VICTORY', 'DIRE VICTORY'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000006': {
    id: '00000000-0000-0000-0000-000000000006',
    display_name: 'Call of Duty: Warzone',
    game_type: 'HEAD_TO_HEAD',
    platform: 'PC',
    roi: { x: 0.05, y: 0.02, w: 0.25, h: 0.08 },
    constraints: { min: 0, max: 100 },
    end_keywords: ['VICTORY', 'ELIMINATED', 'WARZONE VICTORY'],
    regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000007': {
    id: '00000000-0000-0000-0000-000000000007',
    display_name: 'Fortnite',
    game_type: 'BINARY_RESULT',
    platform: 'PC',
    roi: { x: 0.3, y: 0.1, w: 0.4, h: 0.2 },
    constraints: {},
    end_keywords: ['VICTORY ROYALE', 'MATCH COMPLETED', 'ELIMINATED'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
  '00000000-0000-0000-0000-000000000008': {
    id: '00000000-0000-0000-0000-000000000008',
    display_name: 'Tekken 8',
    game_type: 'BINARY_RESULT',
    platform: 'CONSOLE',
    roi: { x: 0.3, y: 0.3, w: 0.4, h: 0.2 },
    constraints: {},
    end_keywords: ['K.O.', 'PERFECT', 'GREAT', 'WINNER', 'YOU WIN', 'YOU LOSE'],
    regex_pattern: null,
    approved: true,
    is_official: true,
  },
  '11111111-1111-1111-1111-111111111111': {
    id: '11111111-1111-1111-1111-111111111111',
    display_name: 'Subway Surfers',
    game_type: 'HIGH_SCORE',
    platform: 'MOBILE',
    roi: { x: 0.65, y: 0.05, w: 0.3, h: 0.08 },
    constraints: { min: 0, max: 100000000, maxJumpPerSec: 5000 },
    end_keywords: ['Game Over', 'Try Again', 'High Score'],
    regex_pattern: '([0-9][0-9,\\.]*)',
    approved: true,
    is_official: true,
  },
};

export async function resolveAndEnsureGameProfileId(
  supabase: TypedSupabaseClient,
  idOrSlug: string,
): Promise<string> {
  if (!idOrSlug) return idOrSlug;

  // 1. Check if this exact ID already exists in game_profiles (supports custom UUIDs & test IDs)
  try {
    const { data: existing } = await supabase
      .from('game_profiles')
      .select('id')
      .eq('id', idOrSlug)
      .maybeSingle();
    if (existing?.id) return existing.id;
  } catch {
    // Ignore if non-UUID on Postgres and fall through to slug lookup
  }

  // 2. Translate official catalog slug to canonical UUID and ensure it is seeded
  const targetUuid = OFFICIAL_SLUG_TO_UUID[idOrSlug.toLowerCase()] || idOrSlug;
  const seed = OFFICIAL_SEED_BY_UUID[targetUuid];
  if (seed) {
    try {
      await supabase.from('game_profiles').upsert(seed as never, { onConflict: 'id' });
    } catch {
      // Non-fatal if already present
    }
    return targetUuid;
  }

  return targetUuid;
}

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
    const resolvedId = await resolveAndEnsureGameProfileId(this.supabase, id);

    try {
      const { data } = await this.supabase
        .from('game_profiles')
        .select('*')
        .eq('id', resolvedId)
        .maybeSingle();

      if (data) return this.mapProfile(data);
    } catch {
      // Fall back to static seed if DB query failed
    }

    const staticSeed = OFFICIAL_SEED_BY_UUID[resolvedId];
    if (staticSeed) {
      return this.mapProfile(staticSeed);
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
    // Autonomous AI validation of ROI geometry & regex syntax -> auto-approve valid calibrations immediately
    const roiValid =
      profile.roi &&
      typeof profile.roi.x === 'number' &&
      typeof profile.roi.y === 'number' &&
      typeof profile.roi.w === 'number' &&
      typeof profile.roi.h === 'number' &&
      profile.roi.w > 0 &&
      profile.roi.h > 0 &&
      profile.roi.x >= 0 &&
      profile.roi.y >= 0 &&
      profile.roi.x + profile.roi.w <= 1.05 &&
      profile.roi.y + profile.roi.h <= 1.05;

    let regexValid = true;
    if (profile.regexPattern) {
      try {
        new RegExp(profile.regexPattern);
      } catch {
        regexValid = false;
      }
    }

    const isAutoApproved = Boolean(profile.displayName?.trim() && roiValid && regexValid);

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
        approved: isAutoApproved,
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
