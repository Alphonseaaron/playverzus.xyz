import type { MatchFormat, MatchStatus, Platform, GameType } from './constants';

export type AnchorPosition =
  | 'TOP_LEFT'
  | 'TOP_CENTER'
  | 'TOP_RIGHT'
  | 'CENTER'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_CENTER'
  | 'BOTTOM_RIGHT';

export interface ROI {
  /** Relative left offset, 0..1 */
  x: number;
  /** Relative top offset, 0..1 */
  y: number;
  /** Relative width, 0..1 */
  w: number;
  /** Relative height, 0..1 */
  h: number;
  /** Anchor alignment for non-16:9 displays (e.g. 21:9 ultrawide) */
  anchor?: AnchorPosition;
  /** Viewport aspect ratio constraint, default 'AUTO' */
  aspectRatioConstraint?: '16:9' | 'AUTO';
}

export interface GameProfile {
  id: string;
  displayName: string;
  gameType: GameType;
  platform: Platform;
  roi: ROI;
  secondaryRois?: ROI[];
  constraints: GameConstraints;
  endKeywords: string[];
  regexPattern?: string | null;
  approved: boolean;
  isOfficial: boolean;
  submittedBy?: string | null;
}

export interface GameConstraints {
  min?: number;
  max?: number;
  maxJumpPerSec?: number;
  ranks?: string[];
  weights?: Record<string, number>;
  expectedCount?: number;
  /** Only used by PHYSICAL: required consecutive identical reads. */
  stableReads?: number;
}

export interface MatchContext {
  matchId: string;
  playerA: string;
  playerB: string;
  profile: GameProfile;
  format: MatchFormat;
  previousFrames: ScoreFrame[];
  gamertags?: { playerA?: string; playerB?: string };
  activePlayerId?: string;
}

export interface ScoreFrame {
  id: string;
  matchId: string;
  playerId: string;
  rawText: string;
  parsed: ParsedResult | null;
  confidence: number;
  isVerified: boolean;
  isFinal: boolean;
  imageHash: string | null;
  perceptualHash?: string | null;
  source: 'CLIENT_OCR' | 'SERVER_OCR' | 'STREAM_INGEST' | 'MANUAL';
  createdAt: Date;
}

export interface ParsedResult {
  primary: number | string;
  fields?: Record<string, number | string>;
  raw: string;
  confidence: number;
}

export interface ValidationResult {
  ok: boolean;
  confidence: number;
  errors: string[];
  corrected?: ParsedResult;
}

export interface WinnerDecision {
  winnerId: string | null;
  reason: string;
}

export interface MatchRecord {
  id: string;
  profileId: string;
  format: MatchFormat;
  status: MatchStatus;
  playerA: string;
  playerB: string | null;
  winner: string | null;
  scoreA: ParsedResult | null;
  scoreB: ParsedResult | null;
  confidence: number | null;
  verifiedBy: string | null;
  roomCode: string | null;
  tournamentId: string | null;
  entryFee: number;
  prizePool: number;
}
