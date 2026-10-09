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

  async getMyMatches(userId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select('*, game_profiles(display_name, game_type)')
      .or(`player_a.eq.${userId},player_b.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback without relation if foreign key cache is stale
      const fallback = await this.supabase
        .from('matches')
        .select('*')
        .or(`player_a.eq.${userId},player_b.eq.${userId}`)
        .order('created_at', { ascending: false });
      return fallback.data || [];
    }
    return data || [];
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
      return fallback.data || [];
    }
    return data || [];
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
    return match;
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
      .insert({
        match_id: matchId,
        raised_by: userId,
        reason,
        status: 'OPEN',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Update match status to DISPUTED
    await this.supabase.from('matches').update({ status: 'DISPUTED' }).eq('id', matchId);

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

    return this.coreMatchService.accept(match.id, userId);
  }
}
