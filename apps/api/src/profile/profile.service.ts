import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { OFFICIAL_SLUG_TO_UUID } from '../game-profile/game-profile.service';

// In-memory cache & fallback for per-user game accounts (gameId -> gamertag)
export const globalGameAccountsCache = new Map<string, Record<string, string>>();

export function resolveGamertagForProfile(
  gameAccounts: Record<string, string> | undefined | null,
  profileIdOrSlug: string,
): string | undefined {
  if (!gameAccounts || !profileIdOrSlug) return undefined;
  const key = profileIdOrSlug.toLowerCase();
  if (gameAccounts[key]) return gameAccounts[key];
  const uuid = OFFICIAL_SLUG_TO_UUID[key];
  if (uuid && gameAccounts[uuid]) return gameAccounts[uuid];
  // Reverse lookup: if profileIdOrSlug is a UUID, check matching slugs
  for (const [slug, mappedUuid] of Object.entries(OFFICIAL_SLUG_TO_UUID)) {
    if (mappedUuid === key && gameAccounts[slug]) {
      return gameAccounts[slug];
    }
  }
  return undefined;
}

function normalizeHandle(handle: string): string {
  return handle
    .toLowerCase()
    .replace(/[0o]/g, 'o')
    .replace(/[1li|]/g, 'l')
    .replace(/[5s]/g, 's')
    .replace(/[2z]/g, 'z')
    .replace(/[^a-z0-9]/g, '');
}

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
    const dbAccounts = ((data as Record<string, unknown>).game_accounts as Record<string, string>) || {};
    const cachedAccounts = globalGameAccountsCache.get(userId) || {};
    const mergedAccounts = { ...cachedAccounts, ...dbAccounts };
    globalGameAccountsCache.set(userId, mergedAccounts);

    return {
      ...data,
      country_code: (data as Record<string, unknown>).country_code || data.region || null,
      game_accounts: mergedAccounts,
    };
  }

  async getProfileByUsername(username: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) throw new NotFoundException(`User @${username} not found`);
    const dbAccounts = ((data as Record<string, unknown>).game_accounts as Record<string, string>) || {};
    const cachedAccounts = globalGameAccountsCache.get(data.id) || {};
    return {
      ...data,
      country_code: (data as Record<string, unknown>).country_code || data.region || null,
      game_accounts: { ...cachedAccounts, ...dbAccounts },
    };
  }

  async linkGamertag(userId: string, gameId: string, gamertag: string) {
    const cleanGameId = (gameId || '').trim().toLowerCase();
    const cleanTag = (gamertag || '').trim();
    if (!cleanGameId || !cleanTag) {
      throw new BadRequestException('Both gameId and gamertag are required');
    }

    const normTarget = normalizeHandle(cleanTag);
    const canonicalUuid = OFFICIAL_SLUG_TO_UUID[cleanGameId] || cleanGameId;

    // Anti-smurfing / Anti-collusion check: prevent two different Playverzus accounts from claiming the same in-game handle on the same game
    for (const [otherUserId, accounts] of globalGameAccountsCache.entries()) {
      if (otherUserId === userId) continue;
      const existingTag = resolveGamertagForProfile(accounts, cleanGameId);
      if (existingTag && normalizeHandle(existingTag) === normTarget) {
        throw new BadRequestException(
          `In-game handle '${cleanTag}' is already linked to another Playverzus account for this game. Sharing game accounts across multiple platform accounts is prohibited.`,
        );
      }
    }

    const current = globalGameAccountsCache.get(userId) || {};
    const updated: Record<string, string> = {
      ...current,
      [cleanGameId]: cleanTag,
      [canonicalUuid]: cleanTag,
    };
    globalGameAccountsCache.set(userId, updated);

    try {
      await this.supabase
        .from('profiles')
        .update({
          game_accounts: updated as never,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', userId);
    } catch {
      // Non-fatal if column migration hasn't been executed yet; in-memory cache remains active
    }

    return {
      userId,
      gameId: cleanGameId,
      canonicalGameId: canonicalUuid,
      gamertag: cleanTag,
      game_accounts: updated,
    };
  }

  async updateProfile(
    userId: string,
    updates: {
      displayName?: string;
      fullName?: string;
      dateOfBirth?: string;
      address?: string;
      avatarUrl?: string;
      region?: string;
      country_code?: string;
      phone?: string;
      gameAccounts?: Record<string, string>;
    },
  ) {
    if (updates.gameAccounts) {
      for (const [gId, tag] of Object.entries(updates.gameAccounts)) {
        if (tag && tag.trim()) {
          await this.linkGamertag(userId, gId, tag);
        }
      }
    }

    const resolvedRegion = updates.country_code || updates.region;
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        display_name: updates.displayName,
        full_name: updates.fullName,
        date_of_birth: updates.dateOfBirth ? (updates.dateOfBirth as any) : undefined,
        address: updates.address,
        avatar_url: updates.avatarUrl,
        region: resolvedRegion,
        phone: updates.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, username, display_name, full_name, date_of_birth, address, avatar_url, region, phone, trust_score, role, kyc_status, kyc_provider_ref')
      .single();

    if (error) throw new Error(error.message);
    return {
      ...data,
      country_code: data.region || null,
      game_accounts: globalGameAccountsCache.get(userId) || {},
    };
  }

  async getUserMatches(username: string) {
    const profile = await this.getProfileByUsername(username);

    const { data, error } = await this.supabase
      .from('matches')
      .select('id, profile_id, player_a, player_b, format, status, entry_fee, prize_pool, winner, confidence, created_at')
      .or(`player_a.eq.${profile.id},player_b.eq.${profile.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data || [];
  }
}
