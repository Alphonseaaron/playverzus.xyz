import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import {
  MatchService as CoreMatchService,
  generateRoomCode,
  getDuelRakeRate,
  type MatchFormat,
  type ScoreFrame,
} from '@playverzus/core';
import { resolveAndEnsureGameProfileId } from '../game-profile/game-profile.service';
import { globalGameAccountsCache, resolveGamertagForProfile } from '../profile/profile.service';
import { RedisService } from '../redis/redis.service';
import { SecurityService } from '../security/security.service';
import { WalletService } from '../wallet/wallet.service';

export interface MatchEscrowConfig {
  isRealCash: boolean;
  stakeUsdc: number;
  mode?: string;
  squadSize?: string;
}

@Injectable()
export class MatchService {
  private supabase: TypedSupabaseClient;
  private coreMatchService: CoreMatchService;
  private readyMap = new Map<string, { readyA: boolean; readyB: boolean }>();
  private readonly redis: RedisService;

  constructor(
    @Optional() redis?: RedisService,
    @Optional() private readonly securityService?: SecurityService,
    @Optional() private readonly walletService?: WalletService,
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

  private async saveMatchEscrowConfig(
    matchId: string,
    cfg: MatchEscrowConfig,
    actorId: string,
  ): Promise<void> {
    try {
      await this.redis.set(
        `match:escrow:${matchId}`,
        JSON.stringify(cfg),
        60 * 60 * 24 * 60,
      );
    } catch {}

    try {
      await this.supabase.from('audit_log').insert({
        actor_id: actorId,
        action: 'MATCH_ESCROW_CONFIG',
        entity_type: 'match',
        entity_id: matchId,
        metadata: cfg as any,
      });
    } catch {}
  }

  private async getMatchEscrowConfig(
    matchId: string,
    fallbackDbEntryFee = 0,
  ): Promise<MatchEscrowConfig> {
    try {
      const raw = await this.redis.get(`match:escrow:${matchId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as MatchEscrowConfig;
        if (typeof parsed?.stakeUsdc === 'number') {
          return parsed;
        }
      }
    } catch {}

    try {
      const { data } = await this.supabase
        .from('audit_log')
        .select('metadata')
        .eq('action', 'MATCH_ESCROW_CONFIG')
        .eq('entity_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const meta = data?.metadata as Record<string, any> | null;
      if (meta && typeof meta.stakeUsdc === 'number') {
        const cfg: MatchEscrowConfig = {
          isRealCash: meta.isRealCash !== false && meta.stakeUsdc > 0,
          stakeUsdc: meta.stakeUsdc,
          mode: typeof meta.mode === 'string' ? meta.mode : undefined,
          squadSize: typeof meta.squadSize === 'string' ? meta.squadSize : undefined,
        };
        await this.redis.set(`match:escrow:${matchId}`, JSON.stringify(cfg), 60 * 60 * 24 * 60);
        return cfg;
      }
    } catch {}

    const dbFee = Number(fallbackDbEntryFee || 0);
    return {
      isRealCash: false,
      stakeUsdc: dbFee,
    };
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

    const profileMap = new Map<
      string,
      { username: string; countryCode?: string; gameAccounts: Record<string, string> }
    >();

    if (userIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, username, region')
        .in('id', userIds);

      for (const p of profiles || []) {
        const dbAccounts = ((p as Record<string, unknown>).game_accounts as Record<string, string>) || {};
        const cachedAccounts = globalGameAccountsCache.get(p.id) || {};
        profileMap.set(p.id, {
          username: p.username,
          countryCode: ((p as Record<string, unknown>).country_code as string) || p.region || undefined,
          gameAccounts: { ...cachedAccounts, ...dbAccounts },
        });
      }
    }

    const escrows = await Promise.all(
      matches.map((m) =>
        this.getMatchEscrowConfig(
          String(m.id || m.matchId || ''),
          Number(m.entry_fee ?? m.entryFee ?? 0),
        ),
      ),
    );

    return matches.map((m, idx) => {
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
      const escrow = escrows[idx] || { isRealCash: false, stakeUsdc: 0 };
      const stakeUsdc = escrow.stakeUsdc > 0 ? escrow.stakeUsdc : Number(m.entry_fee ?? m.entryFee ?? 0);
      const rakeRate = getDuelRakeRate(stakeUsdc);
      const prizePool =
        escrow.isRealCash && stakeUsdc > 0
          ? Math.round(stakeUsdc * 2 * (1 - rakeRate) * 100) / 100
          : Number(m.prize_pool ?? m.prizePool ?? stakeUsdc * 2);

      return {
        ...m,
        entry_fee: stakeUsdc,
        entryFee: stakeUsdc,
        prize_pool: prizePool,
        prizePool,
        isCash: escrow.isRealCash,
        ...(escrow.mode ? { mode: escrow.mode } : {}),
        ...(escrow.squadSize ? { squadSize: escrow.squadSize } : {}),
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
    isCash?: boolean,
    mode?: string,
    squadSize?: string,
  ) {
    const resolvedProfileId = await resolveAndEnsureGameProfileId(this.supabase, profileId);
    let resolvedOpponentId = opponentId ? opponentId.trim() : null;
    if (
      resolvedOpponentId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedOpponentId)
    ) {
      let matchedId: string | null = null;
      try {
        const { data: oppByUsername } = await this.supabase
          .from('profiles')
          .select('id')
          .ilike('username', resolvedOpponentId.replace(/^@/, '').toLowerCase())
          .maybeSingle();
        matchedId = oppByUsername?.id || null;
      } catch {}

      if (!matchedId && !resolvedOpponentId.startsWith('@')) {
        try {
          const { data: oppById } = await this.supabase
            .from('profiles')
            .select('id')
            .eq('id', resolvedOpponentId)
            .maybeSingle();
          matchedId = oppById?.id || null;
        } catch {}
      }

      if (!matchedId) {
        throw new NotFoundException(`Could not find rival player "@${resolvedOpponentId}".`);
      }
      resolvedOpponentId = matchedId;
    }

    const stakeUsdc = Math.max(0, Math.round(Number(entryFee || 0) * 100) / 100);
    const useRealCash =
      stakeUsdc > 0 && (isCash === true || (isCash !== false && Boolean(this.walletService)));

    // Pre-check creator funds before creating DB match row
    if (useRealCash && this.walletService) {
      const cash = await this.walletService.getRealCash(creatorId);
      const available = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);
      if (available + 0.001 < stakeUsdc) {
        throw new BadRequestException(
          `Insufficient Real Cash balance: available $${available.toFixed(2)} USDC, required $${stakeUsdc.toFixed(2)} USDC`,
        );
      }
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

    if (useRealCash && match?.id) {
      try {
        if (this.walletService) {
          await this.walletService.lockMatchStake(creatorId, stakeUsdc, match.id, true);
        }
        await this.saveMatchEscrowConfig(
          match.id,
          { isRealCash: true, stakeUsdc, mode, squadSize },
          creatorId,
        );
      } catch (err) {
        await this.supabase.from('matches').delete().eq('id', match.id);
        throw err;
      }
    } else if (!useRealCash && stakeUsdc > 0 && match?.id) {
      const ptsFee = Math.round(stakeUsdc);
      await this.supabase
        .from('matches')
        .update({ entry_fee: ptsFee, prize_pool: ptsFee * 2 })
        .eq('id', match.id);
      await this.saveMatchEscrowConfig(
        match.id,
        { isRealCash: false, stakeUsdc: ptsFee, mode, squadSize },
        creatorId,
      );
    }

    const [enriched] = await this.enrichMatchesWithProfiles([match]);
    return enriched || match;
  }

  async getMatch(matchId: string) {
    const match = await this.coreMatchService.get(matchId);
    if (!match) throw new NotFoundException('Match not found');
    const [enriched] = await this.enrichMatchesWithProfiles([match]);
    return enriched || match;
  }

  async acceptMatch(matchId: string, userId: string) {
    const match = await this.coreMatchService.get(matchId);
    if (!match) throw new NotFoundException('Match not found');

    const escrow = await this.getMatchEscrowConfig(matchId, match.entryFee);
    if (escrow.isRealCash && escrow.stakeUsdc > 0 && this.walletService) {
      // Ensure Player A + Player B both hold real USDC escrow cleanly
      await this.walletService.lockMatchStake(match.playerA, escrow.stakeUsdc, matchId, true);
      await this.walletService.lockMatchStake(userId, escrow.stakeUsdc, matchId, true);
    }

    try {
      const accepted = await this.coreMatchService.accept(matchId, userId);
      const [enriched] = await this.enrichMatchesWithProfiles([accepted]);
      return enriched || accepted;
    } catch (err) {
      if (escrow.isRealCash && escrow.stakeUsdc > 0 && this.walletService) {
        await this.walletService.unlockMatchStake(
          matchId,
          null,
          userId,
          escrow.stakeUsdc,
          true,
        );
      }
      throw err;
    }
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
    } catch {}

    const frame = await this.coreMatchService.submitScore({
      matchId,
      playerId,
      rawText,
      confidence,
      isFinal,
      imageHash,
      source,
      gamertag: effectiveGamertag,
    });

    await this.reconcileMatchPayouts(matchId);
    return frame;
  }

  async handleCs2Gsi(matchId: string, playerId: string, payload: any) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Invalid CS2 GSI payload');
    }

    const ctScore = payload.map?.team_ct?.score ?? payload.round?.team_ct_score ?? 0;
    const tScore = payload.map?.team_t?.score ?? payload.round?.team_t_score ?? 0;
    const isGameOver = payload.map?.phase === 'gameover' || payload.round?.phase === 'over';

    const rawScoreText = `${ctScore} - ${tScore}`;

    return this.submitScore(
      matchId,
      playerId,
      rawScoreText,
      1.0,
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
      const settled = await this.redis.withLock(`settle-core:${matchId}`, 15_000, async () => {
        return this.coreMatchService.settle(matchId);
      });
      await this.reconcileMatchPayouts(matchId);
      return settled;
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

    await this.supabase.from('matches').update({ status: 'DISPUTED' }).eq('id', matchId);

    try {
      const settled = await this.coreMatchService.settle(matchId);
      await this.reconcileMatchPayouts(matchId);
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
    } catch {}

    return data;
  }

  async cancelMatch(matchId: string, userId: string) {
    const match = await this.getMatch(matchId);
    if (match.playerA !== userId && match.playerB !== userId) {
      throw new ForbiddenException('Only participants can cancel this match');
    }
    if (match.status === 'SETTLED' || match.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel a match with status ${match.status}`);
    }

    const { data, error } = await this.supabase
      .from('matches')
      .update({ status: 'CANCELLED' })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const escrow = await this.getMatchEscrowConfig(matchId, match.entryFee);
    if (escrow.isRealCash && escrow.stakeUsdc > 0 && this.walletService) {
      await this.walletService.unlockMatchStake(
        matchId,
        match.playerA,
        match.playerB ?? null,
        escrow.stakeUsdc,
        true,
      );
    } else {
      try {
        await this.supabase.rpc('wallet_refund', { p_match_id: matchId });
      } catch {}
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

    return this.acceptMatch(match.id, userId);
  }

  /**
   * Reconciles Real Cash (`USDC`) settlement for settled 1v1 duels and completed
   * cash tournaments. Idempotent via WalletService locks & DB keys.
   */
  private async reconcileMatchPayouts(matchId: string): Promise<void> {
    if (!this.walletService) return;

    const { data: row } = await this.supabase
      .from('matches')
      .select('id, status, winner, player_a, player_b, tournament_id, entry_fee')
      .eq('id', matchId)
      .maybeSingle();

    if (!row || row.status !== 'SETTLED' || !row.winner) return;

    if (!row.tournament_id) {
      const escrow = await this.getMatchEscrowConfig(matchId, Number(row.entry_fee || 0));
      if (escrow.isRealCash && escrow.stakeUsdc > 0 && row.player_a && row.player_b) {
        await this.walletService.settleMatchStake(
          matchId,
          row.player_a,
          row.player_b,
          row.winner,
          escrow.stakeUsdc,
          true,
        );
      }
      return;
    }

    // Check if parent cash tournament has completed & distribute real USDC prizes
    const { data: t } = await this.supabase
      .from('tournaments')
      .select('id, status, entry_fee, prize_pool, prize_distribution, currency')
      .eq('id', row.tournament_id)
      .maybeSingle();

    if (!t || t.status !== 'COMPLETED') return;
    const isUsdcCash = String((t as any).currency || '').toUpperCase() === 'USDC';
    if (!isUsdcCash) return;

    const { data: allEntries } = await this.supabase
      .from('tournament_entries')
      .select('user_id, final_placement')
      .eq('tournament_id', t.id);

    const prizePool = Number(t.prize_pool || 0);
    const entryFee = Number(t.entry_fee || 0);
    const dist = (t.prize_distribution || {}) as Record<string, number>;
    const placed = (allEntries || []).filter((e) => e.final_placement != null);

    let totalAwarded = 0;
    const winners: Array<{ userId: string; placement: number; prizeUsdc: number }> = [];
    for (const e of placed) {
      const placement = Number(e.final_placement);
      const frac = Number(dist[String(placement)] || 0);
      let amt = Math.round(prizePool * frac * 100) / 100;
      if (amt <= 0) continue;
      if (totalAwarded + amt > prizePool) {
        amt = Math.max(0, Math.round((prizePool - totalAwarded) * 100) / 100);
      }
      if (amt <= 0) break;
      totalAwarded = Math.round((totalAwarded + amt) * 100) / 100;
      winners.push({ userId: e.user_id, placement, prizeUsdc: amt });
    }

    const grossPoolUsdc = entryFee * Math.max(placed.length, (allEntries || []).length);
    await this.walletService.settleTournamentRealCash(t.id, winners, grossPoolUsdc);
  }
}
