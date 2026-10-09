import type { TypedSupabaseClient } from '@playverzus/db';

import { MatchStateError, NotFoundError, ValidationError } from '../errors';
import { namedLogger } from '../logger';
import { getEngine } from '../types/TypeRegistry';
import { validateParsed } from '../ocr/Validator';
import { analyzeScoreStream } from '../ocr/AntiCheat';
import { getWallet } from '../wallet';

import { assertTransition } from './MatchStateMachine';

import type { MatchFormat, MatchStatus } from '../constants';
import type { GameProfile, MatchContext, MatchRecord, ParsedResult, ScoreFrame } from '../types';

const log = namedLogger('MatchService');

export interface MatchServiceDeps {
  client: TypedSupabaseClient;
}

export interface CreateMatchInput {
  creatorId: string;
  profileId: string;
  playerA: string;
  playerB: string | null;
  format: MatchFormat;
  roomCode?: string | null;
}

export interface SubmitScoreInput {
  matchId: string;
  playerId: string;
  rawText: string;
  confidence: number;
  isFinal: boolean;
  imageHash?: string | null;
  source?: ScoreFrame['source'];
}

/**
 * Orchestrates the match lifecycle: creation, score submission, settlement.
 * All database work goes through Supabase RPC.
 */
export class MatchService {
  constructor(private readonly deps: MatchServiceDeps) {}

  async create(input: CreateMatchInput): Promise<MatchRecord> {
    const { data, error } = await this.deps.client.rpc('create_match', {
      p_creator: input.creatorId,
      p_profile_id: input.profileId,
      p_player_a: input.playerA,
      p_player_b: input.playerB,
      p_format: input.format,
      p_room_code: input.roomCode ?? null,
    });
    if (error) throw new MatchStateError(error.message);
    return this.mapMatch(data as unknown as Record<string, unknown>);
  }

  async accept(matchId: string, userId: string): Promise<MatchRecord> {
    const { data, error } = await this.deps.client.rpc('accept_match', {
      p_match_id: matchId,
      p_user_id: userId,
    });
    if (error) throw new MatchStateError(error.message);
    return this.mapMatch(data as unknown as Record<string, unknown>);
  }

  async start(matchId: string): Promise<MatchRecord> {
    const { data, error } = await this.deps.client.rpc('start_match', { p_match_id: matchId });
    if (error) throw new MatchStateError(error.message);
    return this.mapMatch(data as unknown as Record<string, unknown>);
  }

  async submitScore(input: SubmitScoreInput): Promise<ScoreFrame> {
    const match = await this.get(input.matchId);
    if (!match) throw new NotFoundError('Match', input.matchId);

    const profile = await this.getProfile(match.profileId);
    if (!profile) throw new NotFoundError('GameProfile', match.profileId);

    const engine = getEngine(profile.gameType);
    const parsed = engine.parse(input.rawText, profile);
    if (!parsed) {
      log.info({ matchId: input.matchId, rawText: input.rawText }, 'parse failed');
      throw new ValidationError('Could not parse score from OCR text', ['parse_failed']);
    }

    const previousFrames = await this.recentFrames(input.matchId);
    const ctx: MatchContext = {
      matchId: input.matchId,
      playerA: match.playerA,
      playerB: match.playerB ?? '',
      profile,
      format: match.format,
      previousFrames,
    };

    const validation = validateParsed(parsed, ctx);
    if (!validation.ok) {
      log.info({ errors: validation.errors }, 'score validation failed');
    }

    const { data, error } = await this.deps.client.rpc('submit_score', {
      p_match_id: input.matchId,
      p_player_id: input.playerId,
      p_raw_text: input.rawText,
      p_confidence: validation.confidence,
      p_is_final: input.isFinal,
      p_image_hash: input.imageHash ?? null,
      p_source: input.source ?? 'CLIENT_OCR',
      p_parsed: parsed as unknown as never,
    });
    if (error) throw new MatchStateError(error.message);

    const frame = this.mapFrame(data as unknown as Record<string, unknown>);
    return frame;
  }

  /**
   * Attempts to settle the match. Returns the settled record, or the
   * current record with winner=null if we don't yet have enough data.
   */
  async settle(matchId: string): Promise<MatchRecord> {
    const match = await this.get(matchId);
    if (!match) throw new NotFoundError('Match', matchId);
    if (match.status === 'SETTLED') return match;

    const profile = await this.getProfile(match.profileId);
    if (!profile) throw new NotFoundError('GameProfile', match.profileId);

    const frames = await this.finalFrames(matchId);
    if (frames.length < 2) {
      log.info({ matchId }, 'settle called before both players submitted final frames');
      return match;
    }

    const antiCheat = analyzeScoreStream(frames, profile);
    if (antiCheat.suspicious) {
      log.warn({ matchId, reasons: antiCheat.reasons }, 'anti-cheat flagged match');
      await this.enqueueReview(matchId, frames[0]!.id, 10);
      return { ...match, status: 'REVIEW' };
    }

    const a = frames.find((f) => f.playerId === match.playerA);
    const b = frames.find((f) => f.playerId === match.playerB);
    if (!a?.parsed || !b?.parsed) return match;

    const engine = getEngine(profile.gameType);
    const decision = engine.compare(a.parsed, b.parsed, match.format);
    const confidence = Math.min(a.confidence, b.confidence);

    let winnerId: string | null = null;
    if (decision.winnerId === 'A') winnerId = match.playerA;
    else if (decision.winnerId === 'B') winnerId = match.playerB;

    if (confidence < 0.8 || winnerId === null) {
      await this.enqueueReview(matchId, a.id, 5);
      return { ...match, status: 'REVIEW' };
    }

    try {
      assertTransition(match.status as MatchStatus, 'VERIFYING');
      assertTransition('VERIFYING', 'VERIFIED');
      assertTransition('VERIFIED', 'SETTLED');
    } catch (err) {
      log.warn({ err, from: match.status }, 'state transition failed');
    }

    const wallet = getWallet();
    if (match.entryFee > 0 && winnerId) {
      await wallet.settle(match.id, winnerId, match.entryFee * 2);
    }

    const { error } = await this.deps.client
      .from('matches')
      .update({
        status: 'SETTLED',
        winner: winnerId,
        confidence,
        verified_by: 'AI',
        score_a: a.parsed as unknown as never,
        score_b: b.parsed as unknown as never,
        settled_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (error) throw new MatchStateError(error.message);

    return (await this.get(matchId)) as MatchRecord;
  }

  async get(matchId: string): Promise<MatchRecord | null> {
    const { data, error } = await this.deps.client
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw new MatchStateError(error.message);
    return data ? this.mapMatch(data as unknown as Record<string, unknown>) : null;
  }

  async getProfile(profileId: string): Promise<GameProfile | null> {
    const { data, error } = await this.deps.client
      .from('game_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();
    if (error) throw new MatchStateError(error.message);
    if (!data) return null;
    return {
      id: data.id,
      displayName: data.display_name,
      gameType: data.game_type,
      platform: data.platform,
      roi: data.roi as unknown as GameProfile['roi'],
      constraints: data.constraints as unknown as GameProfile['constraints'],
      endKeywords: data.end_keywords ?? [],
      regexPattern: data.regex_pattern,
      approved: data.approved,
      isOfficial: data.is_official,
      submittedBy: data.submitted_by,
    };
  }

  private async recentFrames(matchId: string): Promise<ScoreFrame[]> {
    const { data, error } = await this.deps.client
      .from('score_frames')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new MatchStateError(error.message);
    return (data ?? []).map((f) => this.mapFrame(f as unknown as Record<string, unknown>));
  }

  private async finalFrames(matchId: string): Promise<ScoreFrame[]> {
    const { data, error } = await this.deps.client
      .from('score_frames')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_final', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw new MatchStateError(error.message);
    return (data ?? []).map((f) => this.mapFrame(f as unknown as Record<string, unknown>));
  }

  private async enqueueReview(matchId: string, frameId: string, priority: number): Promise<void> {
    await this.deps.client.rpc('enqueue_review_task', {
      p_score_frame_id: frameId,
      p_match_id: matchId,
      p_priority: priority,
    });
  }

  private mapMatch(row: Record<string, unknown>): MatchRecord {
    return {
      id: row.id as string,
      profileId: row.profile_id as string,
      format: row.format as MatchFormat,
      status: row.status as MatchStatus,
      playerA: row.player_a as string,
      playerB: (row.player_b as string | null) ?? null,
      winner: (row.winner as string | null) ?? null,
      scoreA: (row.score_a as ParsedResult | null) ?? null,
      scoreB: (row.score_b as ParsedResult | null) ?? null,
      confidence: (row.confidence as number | null) ?? null,
      verifiedBy: (row.verified_by as string | null) ?? null,
      roomCode: (row.room_code as string | null) ?? null,
      tournamentId: (row.tournament_id as string | null) ?? null,
      entryFee: Number(row.entry_fee ?? 0),
      prizePool: Number(row.prize_pool ?? 0),
    };
  }

  private mapFrame(row: Record<string, unknown>): ScoreFrame {
    return {
      id: row.id as string,
      matchId: row.match_id as string,
      playerId: row.player_id as string,
      rawText: row.raw_text as string,
      parsed: (row.parsed as ParsedResult | null) ?? null,
      confidence: Number(row.confidence),
      isVerified: Boolean(row.is_verified),
      isFinal: Boolean(row.is_final),
      imageHash: (row.image_hash as string | null) ?? null,
      source: row.source as ScoreFrame['source'],
      createdAt: new Date(row.created_at as string),
    };
  }
}
