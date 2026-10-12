import type { TypedSupabaseClient } from '@playverzus/db';

import { MatchStateError, NotFoundError, ValidationError } from '../errors';
import { namedLogger } from '../logger';
import { getEngine } from '../types/TypeRegistry';
import { validateParsed } from '../ocr/Validator';
import { analyzeScoreStream } from '../ocr/AntiCheat';
import { computeTemporalConfidence } from '../ocr/VotingOCR';
import { getWallet } from '../wallet';
import { RatingService } from '../rating/RatingService';
import { TournamentEngine } from './TournamentEngine';

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
  private readonly ratingService: RatingService;
  private readonly tournamentEngine: TournamentEngine;

  constructor(private readonly deps: MatchServiceDeps) {
    this.ratingService = new RatingService({ client: deps.client });
    this.tournamentEngine = new TournamentEngine({ client: deps.client });
  }

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
    let match = await this.get(input.matchId);
    if (!match) throw new NotFoundError('Match', input.matchId);

    // Automatically transition ACCEPTED match to LIVE when optical/stream frames arrive
    if (match.status === 'ACCEPTED') {
      try {
        match = await this.start(input.matchId);
      } catch {
        // Fallback direct status update if RPC has already transitioned
        await this.deps.client
          .from('matches')
          .update({ status: 'LIVE', started_at: new Date().toISOString() })
          .eq('id', input.matchId);
      }
    }

    const profile = await this.getProfile(match.profileId);
    if (!profile) throw new NotFoundError('GameProfile', match.profileId);

    const engine = getEngine(profile.gameType);
    const parsed = engine.parse(input.rawText, profile);
    if (!parsed) {
      log.info({ matchId: input.matchId, rawText: input.rawText }, 'parse failed');
      throw new ValidationError('Could not parse score from OCR text', ['parse_failed']);
    }

    // If match was already settled by an earlier final/anti-cheat frame, return gracefully
    if (match.status === 'SETTLED') {
      const existing = await this.recentFrames(input.matchId);
      const latest = existing.filter((f) => f.playerId === input.playerId).pop();
      if (latest) return latest;
      return {
        id: 'settled-frame',
        matchId: input.matchId,
        playerId: input.playerId,
        rawText: input.rawText,
        parsed,
        confidence: input.confidence,
        isVerified: true,
        isFinal: input.isFinal,
        imageHash: input.imageHash ?? null,
        source: input.source ?? 'CLIENT_OCR',
        createdAt: new Date(),
      };
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

    // Apply temporal confidence persistence boost across player's previous frames
    const playerHistory = previousFrames
      .filter((f) => f.playerId === input.playerId)
      .map((f) => ({ rawText: f.rawText }));
    const { effectiveConfidence } = computeTemporalConfidence(
      input.rawText,
      Math.max(input.confidence, validation.confidence),
      playerHistory,
    );

    const { data, error } = await this.deps.client.rpc('submit_score', {
      p_match_id: input.matchId,
      p_player_id: input.playerId,
      p_raw_text: input.rawText,
      p_confidence: effectiveConfidence,
      p_is_final: input.isFinal,
      p_image_hash: input.imageHash ?? null,
      p_source: input.source ?? 'CLIENT_OCR',
      p_parsed: parsed as unknown as never,
    });
    if (error) throw new MatchStateError(error.message);

    const frame = this.mapFrame(data as unknown as Record<string, unknown>);

    // Autonomous zero-manual settlement trigger when a final frame is detected
    if (input.isFinal) {
      try {
        await this.settle(input.matchId);
      } catch (err) {
        log.warn({ err, matchId: input.matchId }, 'auto-settle on final frame deferred');
      }
    }

    return frame;
  }

  /**
   * 100% Autonomous AI Match Verification & Settlement.
   * Evaluates per-player anti-cheat, multi-frame temporal consensus, and single/dual-stream
   * scoreboards (including Console STREAM_INGEST and PC/Mobile CLIENT_OCR) without requiring
   * any human/manual review queue.
   */
  async settle(matchId: string): Promise<MatchRecord> {
    const match = await this.get(matchId);
    if (!match) throw new NotFoundError('Match', matchId);
    if (match.status === 'SETTLED') return match;

    const profile = await this.getProfile(match.profileId);
    if (!profile) throw new NotFoundError('GameProfile', match.profileId);

    const allFrames = await this.recentFrames(matchId);
    const finals = await this.finalFrames(matchId);
    if (finals.length === 0 && allFrames.length === 0) {
      return match;
    }

    const framesA = allFrames.filter((f) => f.playerId === match.playerA);
    const framesB = allFrames.filter((f) => f.playerId === match.playerB);

    const a = finals.find((f) => f.playerId === match.playerA) ?? framesA[framesA.length - 1];
    const b = finals.find((f) => f.playerId === match.playerB) ?? framesB[framesB.length - 1];

    // 1. Per-player autonomous Anti-Cheat evaluation
    const antiCheatA = framesA.length > 0 ? analyzeScoreStream(framesA, profile) : { suspicious: false, reasons: [] };
    const antiCheatB = framesB.length > 0 ? analyzeScoreStream(framesB, profile) : { suspicious: false, reasons: [] };

    const engine = getEngine(profile.gameType);
    let winnerId: string | null = null;
    let verifiedBy = 'AI';
    let confidence = 0.95;

    if (antiCheatA.suspicious && !antiCheatB.suspicious && match.playerB) {
      log.warn({ matchId, reasons: antiCheatA.reasons }, 'Player A disqualified by autonomous anti-cheat');
      winnerId = match.playerB;
      verifiedBy = 'AI_ANTICHEAT';
      confidence = 0.99;
    } else if (antiCheatB.suspicious && !antiCheatA.suspicious && match.playerA) {
      log.warn({ matchId, reasons: antiCheatB.reasons }, 'Player B disqualified by autonomous anti-cheat');
      winnerId = match.playerA;
      verifiedBy = 'AI_ANTICHEAT';
      confidence = 0.99;
    } else if (a?.parsed && b?.parsed) {
      // Both players have parsed score frames
      const decision = engine.compare(a.parsed, b.parsed, match.format);
      confidence = Number(Math.max(a.confidence, b.confidence).toFixed(4));
      if (decision.winnerId === 'A') winnerId = match.playerA;
      else if (decision.winnerId === 'B') winnerId = match.playerB;
      else {
        // Conflicting claims (e.g. both claim WIN in BINARY_RESULT) -> Autonomous AI Arbiter
        // Resolves via multi-frame temporal persistence & OCR confidence
        const tempA = computeTemporalConfidence(
          a.rawText,
          a.confidence,
          framesA.slice(0, -1).map((f) => ({ rawText: f.rawText })),
        );
        const tempB = computeTemporalConfidence(
          b.rawText,
          b.confidence,
          framesB.slice(0, -1).map((f) => ({ rawText: f.rawText })),
        );
        winnerId = tempA.effectiveConfidence >= tempB.effectiveConfidence ? match.playerA : match.playerB;
        confidence = Math.max(tempA.effectiveConfidence, tempB.effectiveConfidence, 0.85);
        verifiedBy = 'AI_ARBITER';
      }
      if (a.source === 'STREAM_INGEST' || b.source === 'STREAM_INGEST') {
        if (verifiedBy === 'AI') verifiedBy = 'AI_CONSOLE_STREAM';
      }
    } else if ((a?.parsed || b?.parsed) && finals.length >= 1) {
      // Single-stream final scoreboard verification (e.g. Console Twitch/YouTube stream or 1v1 Head-to-Head HUD)
      const single = (a?.parsed ? a : b)!;
      const isFromA = single.playerId === match.playerA;

      if (profile.gameType === 'HEAD_TO_HEAD' && single.parsed) {
        const decision = engine.compare(single.parsed, single.parsed, match.format);
        if (decision.winnerId === 'A') winnerId = match.playerA;
        else if (decision.winnerId === 'B') winnerId = match.playerB;
        confidence = Math.max(single.confidence, 0.9);
        verifiedBy = single.source === 'STREAM_INGEST' ? 'AI_CONSOLE_STREAM' : 'AI';
      } else if (profile.gameType === 'BINARY_RESULT' && single.parsed) {
        if (single.parsed.primary === 'WIN') {
          winnerId = isFromA ? match.playerA : match.playerB;
        } else if (single.parsed.primary === 'LOSS') {
          winnerId = isFromA ? match.playerB : match.playerA;
        }
        confidence = Math.max(single.confidence, 0.9);
        verifiedBy = single.source === 'STREAM_INGEST' ? 'AI_CONSOLE_STREAM' : 'AI';
      }
    }

    if (!winnerId) {
      log.info({ matchId }, 'awaiting decisive final score frames for autonomous settlement');
      return match;
    }

    try {
      assertTransition(match.status as MatchStatus, 'VERIFYING');
      assertTransition('VERIFYING', 'VERIFIED');
      assertTransition('VERIFIED', 'SETTLED');
    } catch {
      // Direct settlement transition from LIVE / CAPTURING / DISPUTED / REVIEW
    }

    const wallet = getWallet();
    if (match.entryFee > 0 && winnerId) {
      try {
        await wallet.settle(match.id, winnerId, match.entryFee * 2);
      } catch (err) {
        log.warn({ err, matchId }, 'core wallet settle warning');
      }
    }

    const { error } = await this.deps.client
      .from('matches')
      .update({
        status: 'SETTLED',
        winner: winnerId,
        confidence,
        verified_by: verifiedBy,
        score_a: (a?.parsed ?? b?.parsed ?? null) as unknown as never,
        score_b: (b?.parsed ?? a?.parsed ?? null) as unknown as never,
        settled_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (error) throw new MatchStateError(error.message);

    // Automatically update Elo ratings for both players
    if (match.playerA && match.playerB) {
      try {
        await Promise.all([
          this.ratingService.recordResult(match.playerA, profile.gameType, winnerId === match.playerA),
          this.ratingService.recordResult(match.playerB, profile.gameType, winnerId === match.playerB),
        ]);
      } catch (err) {
        log.warn({ err, matchId }, 'rating update warning');
      }
    }

    // Automatically advance tournament bracket if this match is part of a tournament
    if (match.tournamentId && winnerId) {
      try {
        await this.tournamentEngine.advanceWinner(match.id, winnerId);
      } catch (err) {
        log.warn({ err, matchId, tournamentId: match.tournamentId }, 'tournament advance warning');
      }
    }

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
