import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { TournamentEngine, type TournamentFormat, TOURNAMENT_TIERS } from '@playverzus/core';
import { resolveAndEnsureGameProfileId } from '../game-profile/game-profile.service';

export const TOP_5_BLITZ_GAMES = [
  { id: '00000000-0000-0000-0000-000000000001', slug: 'cs2', name: 'Counter-Strike 2' },
  { id: '00000000-0000-0000-0000-000000000002', slug: 'eafc', name: 'EA Sports FC 25' },
  { id: '00000000-0000-0000-0000-000000000003', slug: 'rl', name: 'Rocket League' },
  { id: '00000000-0000-0000-0000-000000000004', slug: 'val', name: 'Valorant' },
  { id: '00000000-0000-0000-0000-000000000007', slug: 'fortnite', name: 'Fortnite' },
];

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

    const rawEntries = (data as any).tournament_entries as Array<{ user_id: string }> | undefined;
    if (rawEntries && rawEntries.length > 0) {
      const userIds = Array.from(new Set(rawEntries.map((e) => e.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await this.supabase
          .from('profiles')
          .select('id, username, region')
          .in('id', userIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [
            p.id,
            {
              username: p.username,
              country_code: ((p as Record<string, unknown>).country_code as string) || p.region || undefined,
            },
          ]),
        );

        (data as any).tournament_entries = rawEntries.map((entry) => {
          const prof = profileMap.get(entry.user_id);
          return {
            ...entry,
            username: prof?.username,
            country_code: prof?.country_code,
          };
        });
      }
    }

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
    const resolvedProfileId = await resolveAndEnsureGameProfileId(this.supabase, params.profileId);
    const { data, error } = await this.supabase.rpc('create_tournament', {
      p_creator: creatorId,
      p_name: params.name,
      p_profile_id: resolvedProfileId,
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

    // Zero-manual auto-start when tournament reaches full entrant capacity
    try {
      const tournament = await this.getTournament(tournamentId);
      const entries = (tournament as any).tournament_entries as Array<unknown> | undefined;
      if (
        tournament &&
        (tournament.status === 'REGISTRATION' || tournament.status === 'CHECKIN') &&
        entries &&
        entries.length >= tournament.size
      ) {
        await this.startTournament(tournamentId);

        // If this is an automated 5-player Sit & Go tournament, immediately spawn the next continuous instance
        if ((tournament as any).is_auto_sit_and_go) {
          await this.spawnNextSitAndGo(tournamentId);
        }
      }
    } catch {
      // Non-fatal auto-start check
    }

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

    // Idempotent check: if bracket matches already exist for this tournament, return them
    const { data: existingMatches } = await this.supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId);
    if (existingMatches && existingMatches.length > 0) {
      return { started: true, matchesCreated: existingMatches.length };
    }

    let { data: entries, error } = await this.supabase
      .from('tournament_entries')
      .select('user_id, seed, checked_in')
      .eq('tournament_id', tournamentId)
      .eq('checked_in', true);

    // If fewer than 2 players manually clicked check-in, auto-checkin all registered entrants
    if (!entries || entries.length < 2) {
      await this.supabase
        .from('tournament_entries')
        .update({ checked_in: true })
        .eq('tournament_id', tournamentId);

      const fallback = await this.supabase
        .from('tournament_entries')
        .select('user_id, seed, checked_in')
        .eq('tournament_id', tournamentId);
      entries = fallback.data;
      error = fallback.error;
    }

    if (error || !entries || entries.length < 2) {
      throw new Error('Not enough registered players to start tournament');
    }

    const drafts =
      tournament.format === 'ROUND_ROBIN'
        ? this.engine.generateRoundRobin(entries.map((e) => ({ userId: e.user_id, seed: e.seed })))
        : tournament.format === 'DOUBLE_ELIM'
        ? this.engine.generateDoubleElim(entries.map((e) => ({ userId: e.user_id, seed: e.seed })))
        : this.engine.generateSingleElim(entries.map((e) => ({ userId: e.user_id, seed: e.seed })));

    // Create matches for the drafts and record their IDs by (round, position)
    const createdByKey = new Map<string, { id: string; round: number; position: number; playerA: string | null; playerB: string | null; isLosers: boolean }>();

    for (const draft of drafts) {
      const isBye = Boolean(draft.round === 1 && draft.playerA && !draft.playerB && !draft.isLosersBracket);
      const { data: inserted } = await this.supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          profile_id: tournament.profile_id,
          player_a: draft.playerA,
          player_b: draft.playerB,
          winner: isBye ? draft.playerA : null,
          verified_by: isBye ? 'AI_BYE' : null,
          bracket_round: draft.round,
          bracket_position: draft.position,
          is_losers_bracket: draft.isLosersBracket,
          status: isBye ? 'SETTLED' : draft.playerA && draft.playerB ? 'LIVE' : 'DRAFT',
          started_at: draft.playerA && draft.playerB ? new Date().toISOString() : null,
          settled_at: isBye ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (inserted?.id) {
        createdByKey.set(`${draft.isLosersBracket ? 'L' : 'W'}:${draft.round}:${draft.position}`, {
          id: inserted.id,
          round: draft.round,
          position: draft.position,
          playerA: draft.playerA,
          playerB: draft.playerB,
          isLosers: draft.isLosersBracket,
        });
      }
    }

    // Link next_match_id between consecutive rounds and auto-advance any Round 1 byes
    for (const m of createdByKey.values()) {
      if (!m.isLosers) {
        const nextKey = `W:${m.round + 1}:${Math.floor(m.position / 2)}`;
        const nextMatch = createdByKey.get(nextKey);
        if (nextMatch) {
          await this.supabase
            .from('matches')
            .update({ next_match_id: nextMatch.id })
            .eq('id', m.id);

          // Auto-advance bye winner into next round
          if (m.round === 1 && m.playerA && !m.playerB) {
            await this.engine.advanceWinner(m.id, m.playerA);
          }
        }
      }
    }

    await this.supabase
      .from('tournaments')
      .update({ status: 'LIVE' })
      .eq('id', tournamentId);

    return { message: 'Tournament started and bracket generated', matchesCreated: createdByKey.size };
  }

  async getBracket(tournamentId: string) {
    const { data: matches, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('bracket_round', { ascending: true })
      .order('bracket_position', { ascending: true });

    if (error) throw new Error(error.message);
    if (!matches || matches.length === 0) return [];

    const userIds = Array.from(
      new Set(matches.flatMap((m) => [m.player_a, m.player_b]).filter((id): id is string => Boolean(id))),
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
          country: ((p as Record<string, unknown>).country_code as string) || p.region || undefined,
        },
      ]),
    );

    return matches.map((m) => {
      const profA = m.player_a ? profileMap.get(m.player_a) : undefined;
      const profB = m.player_b ? profileMap.get(m.player_b) : undefined;
      return {
        ...m,
        player_a_username: profA?.username,
        player_a_country: profA?.country,
        player_b_username: profB?.username,
        player_b_country: profB?.country,
      };
    });
  }

  // ─── 5-Player Automated Sit & Go Blitz Pools ──────────────────────────────

  /**
   * Retrieves a default system creator profile UUID for system-managed tournament queues.
   */
  private async getSystemCreatorId(): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      return data?.id || '00000000-0000-0000-0000-000000000000';
    } catch {
      return '00000000-0000-0000-0000-000000000000';
    }
  }

  /**
   * Spawns the next continuous tournament instance once 5 players have filled the previous one.
   */
  async spawnNextSitAndGo(previousTournamentId: string) {
    try {
      // 1. Try DB RPC first
      const { data: rpcRes, error: rpcErr } = await this.supabase.rpc('spawn_next_sit_and_go', {
        p_previous_tournament_id: previousTournamentId,
      });

      if (!rpcErr && rpcRes) {
        return rpcRes;
      }
    } catch {
      // Fall through to manual spawn
    }

    try {
      const prev = await this.getTournament(previousTournamentId);
      if (!prev || !(prev as any).is_auto_sit_and_go) return null;

      const tier = ((prev as any).tier as 1 | 2 | 3) || 1;
      const profileId = (prev as any).profile_id;

      // Check if open tournament already exists for this game and tier
      const { data: existing } = await this.supabase
        .from('tournaments')
        .select('id')
        .eq('profile_id', profileId)
        .eq('tier', tier)
        .eq('is_auto_sit_and_go', true)
        .in('status', ['REGISTRATION', 'CHECKIN'])
        .maybeSingle();

      if (existing) return existing;

      const creatorId = (prev as any).created_by || (await this.getSystemCreatorId());

      const { data: nextT, error } = await this.supabase
        .from('tournaments')
        .insert({
          name: (prev as any).name,
          description: (prev as any).description,
          profile_id: profileId,
          format: 'SINGLE_ELIM',
          size: 5,
          entry_fee: (prev as any).entry_fee,
          prize_pool: (prev as any).prize_pool,
          prize_distribution: (prev as any).prize_distribution || { '1': 0.7, '2': 0.3 },
          status: 'REGISTRATION',
          is_auto_sit_and_go: true,
          tier,
          currency: 'USDC',
          created_by: creatorId,
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return nextT;
    } catch {
      return null;
    }
  }

  /**
   * Guarantees that all 25 automated Sit & Go Blitz pools (Top 5 Games × 5 Tiers) are active in REGISTRATION.
   */
  async ensureAutomatedTournaments() {
    const creatorId = await this.getSystemCreatorId();
    const created: any[] = [];

    for (const game of TOP_5_BLITZ_GAMES) {
      const resolvedProfileId = await resolveAndEnsureGameProfileId(this.supabase, game.id);

      for (const tierKey of [1, 2, 3, 4, 5] as const) {
        const tierConfig = TOURNAMENT_TIERS[tierKey];

        // Check if an open tournament exists
        const { data: existing } = await this.supabase
          .from('tournaments')
          .select('id')
          .eq('profile_id', resolvedProfileId)
          .eq('tier', tierConfig.tier)
          .eq('is_auto_sit_and_go', true)
          .in('status', ['REGISTRATION', 'CHECKIN'])
          .maybeSingle();

        if (!existing) {
          try {
            const { data: newT } = await this.supabase
              .from('tournaments')
              .insert({
                name: `[5-Player Blitz] ${game.name} - $${tierConfig.entryFee.toFixed(2)} ${tierConfig.name.split('/')[0].trim()} Pool`,
                description: `Continuous 5-Player Sit & Go Blitz Tournament. Guaranteed Prize Pool: $${tierConfig.netPrizePool.toFixed(2)} USDC (1st: $${tierConfig.payouts.firstPlace.amount.toFixed(2)}, 2nd: $${tierConfig.payouts.secondPlace.amount.toFixed(2)}). Instant bracket generation upon 5 entries.`,
                profile_id: resolvedProfileId,
                format: 'SINGLE_ELIM',
                size: 5,
                entry_fee: tierConfig.entryFee,
                prize_pool: tierConfig.netPrizePool,
                prize_distribution: {
                  '1': tierConfig.payouts.firstPlace.percent / 100,
                  '2': tierConfig.payouts.secondPlace.percent / 100,
                },
                status: 'REGISTRATION',
                is_auto_sit_and_go: true,
                tier: tierConfig.tier,
                currency: 'USDC',
                created_by: creatorId,
              })
              .select()
              .single();

            if (newT) created.push(newT);
          } catch {
            // Ignore duplicate key race conditions
          }
        }
      }
    }

    return { ensured: true, createdCount: created.length };
  }

  /**
   * Returns all active 5-player blitz pools with live entrant count and tier metadata.
   */
  async listBlitzPools() {
    await this.ensureAutomatedTournaments();

    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*, game_profiles(id, display_name, game_type, platform), tournament_entries(id, user_id)')
      .eq('is_auto_sit_and_go', true)
      .in('status', ['REGISTRATION', 'CHECKIN'])
      .order('tier', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((t) => {
      const entries = (t as any).tournament_entries || [];
      return {
        ...t,
        enrolled_count: entries.length,
        slots_remaining: Math.max(0, 5 - entries.length),
      };
    });
  }
}
