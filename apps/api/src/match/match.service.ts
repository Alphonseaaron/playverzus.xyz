import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { MatchService as CoreMatchService, generateRoomCode, type MatchFormat, type ScoreFrame } from '@playverzus/core';

@Injectable()
export class MatchService {
  private supabase: TypedSupabaseClient;
  private coreMatchService: CoreMatchService;

  constructor() {
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
      (profiles || []).map((p) => [
        p.id,
        {
          username: p.username,
          countryCode: ((p as Record<string, unknown>).country_code as string) || p.region || undefined,
        },
      ]),
    );

    return matches.map((m) => {
      const creatorId = m.player_a || m.created_by || m.playerA;
      const opponentId = m.player_b || m.playerB;
      const creator = creatorId ? profileMap.get(creatorId) : undefined;
      const opponent = opponentId ? profileMap.get(opponentId) : undefined;
      return {
        ...m,
        created_by: m.created_by || creatorId,
        creator_username: creator?.username,
        creator_country_code: creator?.countryCode,
        playerAUsername: creator?.username,
        playerACountry: creator?.countryCode,
        playerBUsername: opponent?.username,
        playerBCountry: opponent?.countryCode,
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
    let query = this.supabase
      .from('matches')
      .select('*, game_profiles(display_name, game_type)')
      .eq('status', 'OPEN')
      .is('player_b', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (profileId) {
      query = query.eq('profile_id', profileId);
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
    const roomCode = generateRoomCode();
    const match = await this.coreMatchService.create({
      creatorId,
      profileId,
      playerA: creatorId,
      playerB: opponentId,
      format,
      roomCode,
    });

    if (entryFee && entryFee > 0 && match?.id) {
      await this.supabase.from('matches').update({ entry_fee: entryFee }).eq('id', match.id);
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
    return this.coreMatchService.accept(matchId, userId);
  }

  async startMatch(matchId: string) {
    return this.coreMatchService.start(matchId);
  }

  async submitScore(
    matchId: string,
    playerId: string,
    rawText: string,
    confidence: number,
    isFinal: boolean,
    imageHash?: string,
    source?: ScoreFrame['source'],
  ) {
    return this.coreMatchService.submitScore({
      matchId,
      playerId,
      rawText,
      confidence,
      isFinal,
      imageHash,
      source,
    });
  }

  async settleMatch(matchId: string) {
    return this.coreMatchService.settle(matchId);
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
      throw new Error('You cannot join your own duel as an opponent');
    }

    return this.coreMatchService.accept(match.id, userId);
  }
}
