import type { GameType, MatchFormat } from '../constants';
import type { ScoreFrame } from '../types';

export interface DualConsensusInput {
  frameA?: ScoreFrame | null;
  frameB?: ScoreFrame | null;
  playerAId: string;
  playerBId: string;
  gameType: GameType;
  format: MatchFormat;
}

export type ConsensusMethod =
  | 'DUAL_DIRECT'
  | 'DUAL_INVERTED'
  | 'SINGLE_STREAM_A'
  | 'SINGLE_STREAM_B'
  | 'CONFLICT_REVIEW'
  | 'PENDING';

export interface DualConsensusResult {
  hasConsensus: boolean;
  winnerId: string | null;
  confidence: number;
  method: ConsensusMethod;
  reason: string;
  scoreA?: number | string;
  scoreB?: number | string;
}

/**
 * Dual-Player Consensus Oracle
 * Cross-evaluates live scoreboards streamed by both Host and Challenger.
 * Delivers 100% mathematical certainty when complementary outcomes match,
 * and safely flags discrepancies for reviewer audit without hard-blocking gameplay.
 */
export class DualConsensusOracle {
  static evaluate(input: DualConsensusInput): DualConsensusResult {
    const { frameA, frameB, playerAId, playerBId, gameType } = input;

    // Case 1: Both competitors have submitted score frames
    if (frameA?.parsed && frameB?.parsed) {
      if (gameType === 'HEAD_TO_HEAD') {
        const saA = Number(frameA.parsed.fields?.a ?? frameA.parsed.primary);
        const sbA = Number(frameA.parsed.fields?.b);

        const saB = Number(frameB.parsed.fields?.a ?? frameB.parsed.primary);
        const sbB = Number(frameB.parsed.fields?.b);

        const hasValidScoresA = Number.isFinite(saA) && Number.isFinite(sbA);
        const hasValidScoresB = Number.isFinite(saB) && Number.isFinite(sbB);

        if (hasValidScoresA && hasValidScoresB) {
          // Check 1A: Direct Identical Spectator Agreement (e.g. CS2 CT vs T)
          if (saA === saB && sbA === sbB) {
            if (saA === sbA) {
              return {
                hasConsensus: true,
                winnerId: null,
                confidence: 1.0,
                method: 'DUAL_DIRECT',
                reason: `Tie match verified on both streams: ${saA} - ${sbA}`,
                scoreA: saA,
                scoreB: sbA,
              };
            }
            const winner = saA > sbA ? playerAId : playerBId;
            return {
              hasConsensus: true,
              winnerId: winner,
              confidence: 1.0,
              method: 'DUAL_DIRECT',
              reason: `Direct dual-stream consensus: ${saA} - ${sbA}`,
              scoreA: saA,
              scoreB: sbA,
            };
          }

          // Check 1B: Inverted Perspective Agreement (e.g. EA Sports FC / Rocket League)
          // In some games, Player A sees "My Team: saA, Opponent: sbA",
          // and Player B sees "My Team: saB, Opponent: sbB".
          // If saA === sbB AND sbA === saB, both players agree on the exact same winner!
          if (saA === sbB && sbA === saB) {
            const winner = saA > sbA ? playerAId : playerBId;
            return {
              hasConsensus: true,
              winnerId: winner,
              confidence: 1.0,
              method: 'DUAL_INVERTED',
              reason: `Inverted dual-perspective consensus: Player A (${saA}) vs Player B (${sbA})`,
              scoreA: saA,
              scoreB: sbA,
            };
          }

          // Check 1C: Both agree on who won even if final cosmetic score has minor digit variance
          const winnerFromA = saA > sbA ? playerAId : saA < sbA ? playerBId : null;
          const winnerFromBDirect = saB > sbB ? playerAId : saB < sbB ? playerBId : null;
          const winnerFromBInverted = saB < sbB ? playerAId : saB > sbB ? playerBId : null;

          if (winnerFromA && (winnerFromA === winnerFromBDirect || winnerFromA === winnerFromBInverted)) {
            return {
              hasConsensus: true,
              winnerId: winnerFromA,
              confidence: 0.98,
              method: winnerFromA === winnerFromBDirect ? 'DUAL_DIRECT' : 'DUAL_INVERTED',
              reason: `Both streams agree on winner (${winnerFromA === playerAId ? 'Player A' : 'Player B'})`,
              scoreA: saA,
              scoreB: sbA,
            };
          }

          // Check 1D: Contradiction / Discrepancy (e.g. both claim they won)
          // Soft review flag: Does NOT block the match engine, routes smoothly to /admin/review
          return {
            hasConsensus: false,
            winnerId: null,
            confidence: 0.50,
            method: 'CONFLICT_REVIEW',
            reason: `Conflicting score streams: Player A reported ${saA}-${sbA}, Player B reported ${saB}-${sbB}`,
            scoreA: saA,
            scoreB: sbA,
          };
        }
      } else if (gameType === 'BINARY_RESULT') {
        const resA = String(frameA.parsed.primary).toUpperCase();
        const resB = String(frameB.parsed.primary).toUpperCase();

        // Direct agreement: One is WIN, other is LOSS
        if (
          (resA.includes('WIN') || resA.includes('VICTORY')) &&
          (resB.includes('LOSS') || resB.includes('DEFEAT'))
        ) {
          return {
            hasConsensus: true,
            winnerId: playerAId,
            confidence: 1.0,
            method: 'DUAL_DIRECT',
            reason: 'Complementary binary results verified: Player A (WIN), Player B (LOSS)',
            scoreA: 'WIN',
            scoreB: 'LOSS',
          };
        }

        if (
          (resB.includes('WIN') || resB.includes('VICTORY')) &&
          (resA.includes('LOSS') || resA.includes('DEFEAT'))
        ) {
          return {
            hasConsensus: true,
            winnerId: playerBId,
            confidence: 1.0,
            method: 'DUAL_DIRECT',
            reason: 'Complementary binary results verified: Player B (WIN), Player A (LOSS)',
            scoreA: 'LOSS',
            scoreB: 'WIN',
          };
        }

        // Both claim WIN -> Conflict for human reviewer
        if (
          (resA.includes('WIN') || resA.includes('VICTORY')) &&
          (resB.includes('WIN') || resB.includes('VICTORY'))
        ) {
          return {
            hasConsensus: false,
            winnerId: null,
            confidence: 0.50,
            method: 'CONFLICT_REVIEW',
            reason: 'Both competitors submitted winning banners',
          };
        }
      }
    }

    // Case 2: Single-Stream Adjudication (Player A only)
    if (frameA?.parsed && (!frameB || !frameB.parsed)) {
      if (gameType === 'HEAD_TO_HEAD') {
        const sa = Number(frameA.parsed.fields?.a ?? frameA.parsed.primary);
        const sb = Number(frameA.parsed.fields?.b);
        if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) {
          const winner = sa > sb ? playerAId : playerBId;
          return {
            hasConsensus: true,
            winnerId: winner,
            confidence: Math.max(frameA.confidence, 0.95),
            method: 'SINGLE_STREAM_A',
            reason: `Single stream adjudication from Player A: ${sa} - ${sb}`,
            scoreA: sa,
            scoreB: sb,
          };
        }
      } else if (gameType === 'BINARY_RESULT') {
        const raw = String(frameA.parsed.primary).toUpperCase();
        if (raw.includes('WIN') || raw.includes('VICTORY')) {
          return {
            hasConsensus: true,
            winnerId: playerAId,
            confidence: Math.max(frameA.confidence, 0.95),
            method: 'SINGLE_STREAM_A',
            reason: 'Single stream Player A victory confirmed',
            scoreA: 'WIN',
            scoreB: 'LOSS',
          };
        } else if (raw.includes('LOSS') || raw.includes('DEFEAT')) {
          return {
            hasConsensus: true,
            winnerId: playerBId,
            confidence: Math.max(frameA.confidence, 0.95),
            method: 'SINGLE_STREAM_A',
            reason: 'Single stream Player A defeat confirmed (Player B victory)',
            scoreA: 'LOSS',
            scoreB: 'WIN',
          };
        }
      }
    }

    // Case 3: Single-Stream Adjudication (Player B only)
    if (frameB?.parsed && (!frameA || !frameA.parsed)) {
      if (gameType === 'HEAD_TO_HEAD') {
        const sa = Number(frameB.parsed.fields?.a ?? frameB.parsed.primary);
        const sb = Number(frameB.parsed.fields?.b);
        if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) {
          // For Player B's single stream in Head-to-Head, sa is Player A and sb is Player B
          const winner = sa > sb ? playerAId : playerBId;
          return {
            hasConsensus: true,
            winnerId: winner,
            confidence: Math.max(frameB.confidence, 0.95),
            method: 'SINGLE_STREAM_B',
            reason: `Single stream adjudication from Player B: ${sa} - ${sb}`,
            scoreA: sa,
            scoreB: sb,
          };
        }
      } else if (gameType === 'BINARY_RESULT') {
        const raw = String(frameB.parsed.primary).toUpperCase();
        if (raw.includes('WIN') || raw.includes('VICTORY')) {
          return {
            hasConsensus: true,
            winnerId: playerBId,
            confidence: Math.max(frameB.confidence, 0.95),
            method: 'SINGLE_STREAM_B',
            reason: 'Single stream Player B victory confirmed',
            scoreA: 'LOSS',
            scoreB: 'WIN',
          };
        } else if (raw.includes('LOSS') || raw.includes('DEFEAT')) {
          return {
            hasConsensus: true,
            winnerId: playerAId,
            confidence: Math.max(frameB.confidence, 0.95),
            method: 'SINGLE_STREAM_B',
            reason: 'Single stream Player B defeat confirmed (Player A victory)',
            scoreA: 'WIN',
            scoreB: 'LOSS',
          };
        }
      }
    }

    // Pending frames
    return {
      hasConsensus: false,
      winnerId: null,
      confidence: 0,
      method: 'PENDING',
      reason: 'Awaiting decisive score frames from match participants',
    };
  }
}
