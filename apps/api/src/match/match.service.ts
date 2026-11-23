import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { MatchService as CoreMatchService, generateRoomCode, type MatchFormat, type ScoreFrame } from '@playverzus/core';
import { resolveAndEnsureGameProfileId } from '../game-profile/game-profile.service';
import { globalGameAccountsCache, resolveGamertagForProfile } from '../profile/profile.service';
import { RedisService } from '../redis/redis.service';
import { SecurityService } from '../security/security.service';

@Injectable()
export class MatchService {
  private supabase: TypedSupabaseClient;
  private coreMatchService: CoreMatchService;
  private readyMap = new Map<string, { readyA: boolean; readyB: boolean }>();
  private readonly redis: RedisService;

  constructor(
    @Optional() redis?: RedisService,
    @Optional() private readonly securityService?: SecurityService,
  ) {
    this.redis =
      redis ??
      ({
        get: async () => null,
        set: async () => {},
        del: async () => {},
        checkCooldown: async () => 0,
        withLock: async <T>(_k: string, _t: number, fn: () => Promise<T>) => fn(),
      } as unknown as RedisService);
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.coreMatchService = new CoreMatchService({ client: this.supabase });
  }

  private async enrichMatchesWithProfiles(matches: any[]) {
    if (!matches || matches.length === 0) return [];
    const userIds = Array.from(
      new Set(
        matches
          .flatMap((m) => [m.player_a, m.player_b, m.created_by, m.playerA, m.playerB])
          .filter(Boolean),
      ),
    );
    if (userIds.length === 0) return matches;

    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, username, region')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => {
        const dbAccounts = ((p as Record<string, unknown>).game_accounts as Record<string, string>) || {};
        const cachedAccounts = globalGameAccountsCache.get(p.id) || {};
        return [
          p.id,
          {
            username: p.username,
            countryCode: ((p as Record<string, unknown>).country_code as string) || p.region || undefined,
            gameAccounts: { ...cachedAccounts, ...dbAccounts },
          },
        ];
      }),
    );

    return matches.map((m) => {
      const creatorId = m.player_a || m.created_by || m.playerA;
      const opponentId = m.player_b || m.playerB;
      const gameId = m.profile_id || m.profileId;
      const creator = creatorId ? profileMap.get(creatorId) : undefined;
      const opponent = opponentId ? profileMap.get(opponentId) : undefined;
      const creatorTag =
        (creatorId ? resolveGamertagForProfile(creator?.gameAccounts || globalGameAccountsCache.get(creatorId), gameId) : undefined) ||
        undefined;
      const opponentTag =
        (opponentId ? resolveGamertagForProfile(opponent?.gameAccounts || globalGameAccountsCache.get(opponentId), gameId) : undefined) ||
        undefined;
      const mId = m.id || m.matchId;
      const readyState = this.readyMap.get(mId) || {
        readyA: m.status === 'LIVE' || m.status === 'CAPTURING' || m.status === 'SETTLED',
        readyB: m.status === 'LIVE' || m.status === 'CAPTURING' || m.status === 'SETTLED',
      };
      return {
        ...m,
        readyA: readyState.readyA,
        readyB: readyState.readyB,
        allReady: readyState.readyA && readyState.readyB,
        created_by: m.created_by || creatorId,
        creator_username: creator?.username,
        creator_country_code: creator?.countryCode,
        playerAUsername: creator?.username,
        playerACountry: creator?.countryCode,
        playerAGamertag: creatorTag,
        playerBUsername: opponent?.username,
        playerBCountry: opponent?.countryCode,
        playerBGamertag: opponentTag,
      };
    });
  }

  async getMyMatches(userId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select('*, game_profiles(display_name, game_type)')
      .or(`player_a.eq.${userId},player_b.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Fallback without relation if foreign key cache is stale
      const fallback = await this.supabase
        .from('matches')
        .select('*')
        .or(`player_a.eq.${userId},player_b.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      return this.enrichMatchesWithProfiles(fallback.data || []);
    }
    return this.enrichMatchesWithProfiles(data || []);
  }

  async getOpenMatches(profileId?: string) {
    const resolvedProfileId = profileId
      ? await resolveAndEnsureGameProfileId(this.supabase, profileId)
      : undefined;

    let query = this.supabase
      .from('matches')
      .select('*, game_profiles(display_name, game_type)')
      .eq('status', 'OPEN')
      .is('player_b', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (resolvedProfileId) {
      query = query.eq('profile_id', resolvedProfileId);
    }

    const { data, error } = await query;
    if (error) {
      const fallback = await this.supabase
        .from('matches')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(50);
      return this.enrichMatchesWithProfiles(fallback.data || []);
    }
    return this.enrichMatchesWithProfiles(data || []);
  }

  async createMatch(
    creatorId: string,
    profileId: string,
    opponentId: string | null,
    format: MatchFormat = 'BO1',
    entryFee?: number,
  ) {
    const resolvedProfileId = await resolveAndEnsureGameProfileId(this.supabase, profileId);
    let resolvedOpponentId = opponentId ? opponentId.trim() : null;
    if (
      resolvedOpponentId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedOpponentId)
    ) {
      const { data: oppProfile } = await this.supabase
        .from('profiles')
        .select('id')
        .ilike('username', resolvedOpponentId.replace(/^@/, '').toLowerCase())
        .maybeSingle();
      if (!oppProfile?.id) {
        throw new NotFoundException(`Could not find rival player "@${resolvedOpponentId}".`);
      }
      resolvedOpponentId = oppProfile.id;
    }
    const roomCode = generateRoomCode();
    const match = await this.coreMatchService.create({
      creatorId,
      profileId: resolvedProfileId,
      playerA: creatorId,
      playerB: resolvedOpponentId,
      format,
      roomCode,
    });

    if (entryFee && entryFee > 0 && match?.id) {
      await this.supabase
        .from('matches')
        .update({ entry_fee: entryFee, prize_pool: entryFee * 2 })
        .eq('id', match.id);
    }

    return match;
  }

  async getMatch(matchId: string) {
    const match = await this.coreMatchService.get(matchId);
    if (!match) throw new NotFoundException('Match not found');
    const [enriched] = await this.enrichMatchesWithProfiles([match]);
    return enriched || match;
  }

  async acceptMatch(matchId: string, userId: string) {
    const accepted = await this.coreMatchService.accept(matchId, userId);
    const [enriched] = await this.enrichMatchesWithProfiles([accepted]);
    return enriched || accepted;
  }

  async startMatch(matchId: string) {
    return this.coreMatchService.start(matchId);
  }

  async setPlayerReady(matchId: string, userId: string, isReady: boolean) {
    const match = await this.coreMatchService.get(matchId);
    if (!match) throw new NotFoundException('Match not found');

    const current = this.readyMap.get(matchId) || { readyA: false, readyB: false };
    if (match.playerA === userId) {
      current.readyA = isReady;
    } else if (match.playerB === userId) {
      current.readyB = isReady;
    } else {
      throw new ForbiddenException('Only match participants can declare readiness');
    }

    this.readyMap.set(matchId, current);

    let updatedMatch = match;
    // When both players are confirmed ready, automatically transition to LIVE
    if (current.readyA && current.readyB && (match.status === 'ACCEPTED' || match.status === 'OPEN')) {
      try {
        updatedMatch = await this.startMatch(matchId);
      } catch {
        await this.supabase
          .from('matches')
          .update({ status: 'LIVE', started_at: new Date().toISOString() })
          .eq('id', matchId);
      }
    }

    const [enriched] = await this.enrichMatchesWithProfiles([updatedMatch]);
    return {
      match: enriched || updatedMatch,
      readyA: current.readyA,
      readyB: current.readyB,
      allReady: current.readyA && current.readyB,
    };
  }

  async submitScore(
    matchId: string,
    playerId: string,
    rawText: string,
    confidence: number,
    isFinal: boolean,
    imageHash?: string,
    source?: ScoreFrame['source'],
    gamertag?: string,
  ) {
    let effectiveGamertag = gamertag?.trim() || undefined;
    try {
      const m = await this.coreMatchService.get(matchId);
      if (m?.profileId) {
        if (effectiveGamertag) {
          const current = globalGameAccountsCache.get(playerId) || {};
          globalGameAccountsCache.set(playerId, {
            ...current,
            [m.profileId.toLowerCase()]: effectiveGamertag,
          });
        } else {
          effectiveGamertag = resolveGamertagForProfile(
            globalGameAccountsCache.get(playerId),
            m.profileId,
          );
        }
      }
    } catch {
      // Non-fatal gamertag lookup
    }

    return this.coreMatchService.submitScore({
      matchId,
      playerId,
      rawText,
      confidence,
      isFinal,
      imageHash,
      source,
      gamertag: effectiveGamertag,
    });
  }

  async handleCs2Gsi(matchId: string, playerId: string, payload: any) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Invalid CS2 GSI payload');
    }

    // Extract CS2 team scores and map phase from native Valve GSI schema
    const ctScore = payload.map?.team_ct?.score ?? payload.round?.team_ct_score ?? 0;
    const tScore = payload.map?.team_t?.score ?? payload.round?.team_t_score ?? 0;
    const isGameOver = payload.map?.phase === 'gameover' || payload.round?.phase === 'over';

    const rawScoreText = `${ctScore} - ${tScore}`;

    return this.submitScore(
      matchId,
      playerId,
      rawScoreText,
      1.0, // GSI provides 100% native telemetry confidence
      Boolean(isGameOver),
      undefined,
      'CLIENT_OCR',
    );
  }

  async settleMatch(matchId: string) {
    if (this.securityService?.isSettlementHalted()) {
      throw new BadRequestException('Match settlements are temporarily halted by Security Operations');
    }

    try {
      return await this.redis.withLock(`settle:${matchId}`, 15_000, async () => {
        return this.coreMatchService.settle(matchId);
      });
    } catch (err: any) {
      if (err.message && err.message.includes('financial transaction is currently in progress')) {
        this.securityService?.logEvent({
          severity: 'CRITICAL',
          category: 'SETTLEMENT_LOCK',
          matchId,
          description: `Concurrent duplicate settlement race condition prevented by distributed lock on match #${matchId}. Payout executed exactly once.`,
          metadata: { lockKey: `settle:${matchId}` },
        });
      }
      throw err;
    }
  }

  async disputeMatch(matchId: string, userId: string, reason: string) {
    const { data, error } = await this.supabase
      .from('disputes')
      .upsert(
        {
          match_id: matchId,
          raised_by: userId,
          reason,
          status: 'OPEN',
        },
        { onConflict: 'match_id' },
      )
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Update match status to DISPUTED, then immediately run Autonomous AI Arbiter
    await this.supabase.from('matches').update({ status: 'DISPUTED' }).eq('id', matchId);

    try {
      const settled = await this.coreMatchService.settle(matchId);
      if (settled && settled.status === 'SETTLED' && settled.winner) {
        const resolutionText = `Automatically verified and resolved by Autonomous AI Arbiter (${settled.verifiedBy || 'AI_ARBITER'}). Winner: ${settled.winner}`;
        const { data: resolvedDispute } = await this.supabase
          .from('disputes')
          .update({
            status: 'RESOLVED',
            resolution: resolutionText,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', data.id)
          .select('*')
          .single();
        return resolvedDispute || { ...data, status: 'RESOLVED', resolution: resolutionText };
      }
    } catch {
      // If no frames exist yet, background worker will auto-resolve once frames or no-show deadline arrive
    }

    return data;
  }

  async cancelMatch(matchId: string, userId: string) {
    const match = await this.getMatch(matchId);
    if (match.playerA !== userId && match.playerB !== userId) {
      throw new Error('Only participants can cancel this match');
    }

    const { data, error } = await this.supabase
      .from('matches')
      .update({ status: 'CANCELLED' })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Automatically refund any locked escrow stakes
    try {
      await this.supabase.rpc('wallet_refund', { p_match_id: matchId });
    } catch {
      // Non-fatal if no locks existed
    }

    return data;
  }

  async joinByRoomCode(code: string, userId: string) {
    const { data: match, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('room_code', code.toUpperCase().trim())
      .eq('status', 'OPEN')
      .maybeSingle();

    if (error || !match) throw new NotFoundException('Open match with this room code not found');

    if (match.player_a === userId) {
      throw new BadRequestException('You cannot join your own duel as an opponent');
    }

    const accepted = await this.coreMatchService.accept(match.id, userId);
    const [enriched] = await this.enrichMatchesWithProfiles([accepted]);
    return enriched || accepted;
  }
}
