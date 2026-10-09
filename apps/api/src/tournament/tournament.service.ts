import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { TournamentEngine, type TournamentFormat } from '@playverzus/core';

@Injectable()
export class TournamentService {
  private supabase: TypedSupabaseClient;
  private engine: TournamentEngine;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.engine = new TournamentEngine({ client: this.supabase });
  }

  async listTournaments() {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*, game_profiles(display_name, game_type, platform)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getTournament(id: string) {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*, game_profiles(*), tournament_entries(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Tournament not found');
    return data;
  }

  async createTournament(
    creatorId: string,
    params: {
      name: string;
      profileId: string;
      format: TournamentFormat;
      size: number;
      entryFee?: number;
      prizePool?: number;
      startsAt?: string;
    },
  ) {
    const { data, error } = await this.supabase.rpc('create_tournament', {
      p_creator: creatorId,
      p_name: params.name,
      p_profile_id: params.profileId,
      p_format: params.format,
      p_size: params.size,
      p_entry_fee: params.entryFee ?? 0,
      p_prize_pool: params.prizePool ?? 0,
      p_starts_at: params.startsAt ?? null,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async joinTournament(tournamentId: string, userId: string) {
    const { data, error } = await this.supabase.rpc('join_tournament', {
      p_tournament_id: tournamentId,
      p_user_id: userId,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async checkinTournament(tournamentId: string, userId: string) {
    const { data, error } = await this.supabase.rpc('checkin_tournament', {
      p_tournament_id: tournamentId,
      p_user_id: userId,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async startTournament(tournamentId: string) {
    const tournament = await this.getTournament(tournamentId);

    const { data: entries, error } = await this.supabase
      .from('tournament_entries')
      .select('user_id, seed, checked_in')
      .eq('tournament_id', tournamentId)
      .eq('checked_in', true);

    if (error || !entries || entries.length < 2) {
      throw new Error('Not enough checked-in players to start tournament');
    }

    const drafts =
      tournament.format === 'ROUND_ROBIN'
        ? this.engine.generateRoundRobin(entries.map((e) => ({ userId: e.user_id, seed: e.seed })))
        : tournament.format === 'DOUBLE_ELIM'
        ? this.engine.generateDoubleElim(entries.map((e) => ({ userId: e.user_id, seed: e.seed })))
        : this.engine.generateSingleElim(entries.map((e) => ({ userId: e.user_id, seed: e.seed })));

    // Create matches for the drafts
    for (const draft of drafts) {
      await this.supabase.from('matches').insert({
        tournament_id: tournamentId,
        profile_id: tournament.profile_id,
        player_a: draft.playerA,
        player_b: draft.playerB,
        bracket_round: draft.round,
        bracket_position: draft.position,
        is_losers_bracket: draft.isLosersBracket,
        status: draft.playerA && draft.playerB ? 'LIVE' : 'DRAFT',
      });
    }

    await this.supabase
      .from('tournaments')
      .update({ status: 'LIVE' })
      .eq('id', tournamentId);

    return { message: 'Tournament started and bracket generated' };
  }

  async getBracket(tournamentId: string) {
    const { data: matches, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('bracket_round', { ascending: true })
      .order('bracket_position', { ascending: true });

    if (error) throw new Error(error.message);
    return matches;
  }
}
