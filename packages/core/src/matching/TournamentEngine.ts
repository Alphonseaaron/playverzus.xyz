import type { TypedSupabaseClient } from '@playverzus/db';

import { namedLogger } from '../logger';
import { getWallet } from '../wallet';

import type { TournamentFormat } from '../constants';

const log = namedLogger('TournamentEngine');

export interface TournamentEngineDeps {
  client: TypedSupabaseClient;
}

export interface Entry {
  userId: string;
  seed?: number | null;
}

export interface MatchDraft {
  round: number;
  position: number;
  playerA: string | null;
  playerB: string | null;
  isLosersBracket: boolean;
  parentPosition?: number;
}

/**
 * Generates brackets and advances winners.
 * All reads/writes go through the Supabase client.
 */
export class TournamentEngine {
  constructor(private readonly deps: TournamentEngineDeps) {}

  /** Generate the first round of a single-elimination bracket. */
  generateSingleElim(entries: Entry[]): MatchDraft[] {
    const uniqueEntries = this.sanitizeEntries(entries);
    if (uniqueEntries.length < 2) return [];

    const ordered = this.order(uniqueEntries);
    const size = 1 << Math.ceil(Math.log2(Math.max(2, ordered.length)));
    const padded: (string | null)[] = [...ordered.map((e) => e.userId)];
    while (padded.length < size) padded.push(null);

    const rounds = Math.log2(size);
    const drafts: MatchDraft[] = [];
    for (let i = 0; i < size / 2; i++) {
      drafts.push({
        round: 1,
        position: i,
        playerA: padded[i * 2] ?? null,
        playerB: padded[i * 2 + 1] ?? null,
        isLosersBracket: false,
      });
    }

    let round = 2;
    let matchesInRound = size / 4;
    while (round <= rounds) {
      for (let i = 0; i < matchesInRound; i++) {
        drafts.push({
          round,
          position: i,
          playerA: null,
          playerB: null,
          isLosersBracket: false,
          parentPosition: i,
        });
      }
      round += 1;
      matchesInRound = Math.floor(matchesInRound / 2);
    }

    return drafts;
  }

  /** Double elimination - Winners + Losers brackets drafts. */
  generateDoubleElim(entries: Entry[]): MatchDraft[] {
    const uniqueEntries = this.sanitizeEntries(entries);
    if (uniqueEntries.length < 2) return [];

    const winnersDrafts = this.generateSingleElim(uniqueEntries);
    const count = winnersDrafts.length;
    const losersDrafts: MatchDraft[] = winnersDrafts.map((m, idx) => ({
      ...m,
      position: idx + count,
      isLosersBracket: true,
      playerA: null,
      playerB: null,
    }));
    return [...winnersDrafts, ...losersDrafts];
  }

  /** Round robin — every pair plays once. */
  generateRoundRobin(entries: Entry[]): MatchDraft[] {
    const uniqueEntries = this.sanitizeEntries(entries);
    if (uniqueEntries.length < 2) return [];

    const ordered = this.order(uniqueEntries);
    const drafts: MatchDraft[] = [];
    let position = 0;
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        drafts.push({
          round: 1,
          position: position++,
          playerA: ordered[i]!.userId,
          playerB: ordered[j]!.userId,
          isLosersBracket: false,
        });
      }
    }
    return drafts;
  }

  /** Swiss pairing for the given round (assumes previous rounds already played). */
  generateSwiss(entries: Entry[], round = 1): MatchDraft[] {
    const uniqueEntries = this.sanitizeEntries(entries);
    if (uniqueEntries.length < 2) return [];

    const ordered = this.order(uniqueEntries);
    const drafts: MatchDraft[] = [];
    for (let i = 0; i < ordered.length - 1; i += 2) {
      drafts.push({
        round,
        position: i / 2,
        playerA: ordered[i]!.userId,
        playerB: ordered[i + 1]!.userId,
        isLosersBracket: false,
      });
    }
    return drafts;
  }

  /** Advance winner to the next round in a bracket tournament. */
  async advanceWinner(matchId: string, winnerId: string): Promise<void> {
    const { data: m, error } = await this.deps.client
      .from('matches')
      .select('tournament_id, bracket_round, bracket_position, next_match_id')
      .eq('id', matchId)
      .maybeSingle();

    if (error || !m || !m.tournament_id) return;

    if (m.next_match_id) {
      const { data: nextMatch } = await this.deps.client
        .from('matches')
        .select('player_a, player_b')
        .eq('id', m.next_match_id)
        .maybeSingle();

      if (nextMatch) {
        if (!nextMatch.player_a) {
          await this.deps.client
            .from('matches')
            .update({ player_a: winnerId })
            .eq('id', m.next_match_id);
        } else if (!nextMatch.player_b) {
          await this.deps.client
            .from('matches')
            .update({ player_b: winnerId, status: 'ACCEPTED' })
            .eq('id', m.next_match_id);
        }
      }
    }
  }

  /**
   * Distributing prizes for the tournament.
   * `distribution` maps placement (as string) -> fraction 0..1.
   */
  async distributePrizes(tournamentId: string): Promise<void> {
    const { data: t, error } = await this.deps.client
      .from('tournaments')
      .select('prize_pool, prize_distribution')
      .eq('id', tournamentId)
      .maybeSingle();
    if (error || !t) {
      log.warn({ tournamentId, err: error?.message }, 'tournament not found for prize distribution');
      return;
    }

    const { data: entries, error: eErr } = await this.deps.client
      .from('tournament_entries')
      .select('user_id, final_placement')
      .eq('tournament_id', tournamentId)
      .not('final_placement', 'is', null);
    if (eErr) {
      log.warn({ tournamentId, err: eErr.message }, 'failed to load tournament entries');
      return;
    }

    const pool = Number(t.prize_pool ?? 0);
    if (pool <= 0) return;

    const dist = (t.prize_distribution ?? {}) as Record<string, number>;
    const wallet = getWallet();
    let totalAwarded = 0;

    for (const e of entries ?? []) {
      const placement = String(e.final_placement);
      const fraction = dist[placement] ?? 0;
      let amount = Math.floor(pool * fraction);
      if (amount <= 0) continue;

      if (totalAwarded + amount > pool) {
        amount = Math.max(0, pool - totalAwarded);
      }
      if (amount <= 0) break;

      totalAwarded += amount;
      await wallet.credit(e.user_id as string, amount, 'tournament_prize', {
        metadata: { tournamentId, placement },
        idempotencyKey: `tournament:${tournamentId}:prize:${e.user_id}`,
      });
      await this.deps.client
        .from('tournament_entries')
        .update({ prize_awarded: amount })
        .eq('tournament_id', tournamentId)
        .eq('user_id', e.user_id);
    }
  }

  /** Forfeit a match if a player hasn't submitted a final frame by deadline. */
  async handleNoShow(matchId: string): Promise<void> {
    const { data: m, error } = await this.deps.client
      .from('matches')
      .select('player_a, player_b, status, no_show_deadline')
      .eq('id', matchId)
      .maybeSingle();
    if (error || !m) return;
    if (m.status !== 'LIVE' && m.status !== 'ACCEPTED') return;
    if (!m.no_show_deadline) return;
    if (new Date(m.no_show_deadline).getTime() > Date.now()) return;

    const { data: frames } = await this.deps.client
      .from('score_frames')
      .select('player_id, is_final')
      .eq('match_id', matchId);

    const aSubmitted = (frames ?? []).some((f) => f.player_id === m.player_a && f.is_final);
    const bSubmitted = (frames ?? []).some((f) => f.player_id === m.player_b && f.is_final);

    let winner: string | null = null;
    if (aSubmitted && !bSubmitted) winner = m.player_a as string;
    else if (bSubmitted && !aSubmitted) winner = m.player_b as string;

    if (!winner) return;

    await this.deps.client
      .from('matches')
      .update({ status: 'SETTLED', winner, verified_by: 'NO_SHOW', settled_at: new Date().toISOString() })
      .eq('id', matchId);

    log.info({ matchId, winner }, 'no-show forfeited');
  }

  private sanitizeEntries(entries: Entry[]): Entry[] {
    const uniqueMap = new Map<string, Entry>();
    for (const e of entries) {
      if (e.userId && !uniqueMap.has(e.userId)) {
        uniqueMap.set(e.userId, e);
      }
    }
    return Array.from(uniqueMap.values());
  }

  private order(entries: Entry[]): Entry[] {
    if (entries.every((e) => e.seed !== undefined && e.seed !== null)) {
      return [...entries].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
    }
    return shuffle([...entries]);
  }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export type { TournamentFormat };
