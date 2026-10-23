/** All game archetypes supported by the platform. */
export const GAME_TYPES = [
  'HIGH_SCORE',
  'LOW_TIME',
  'SURVIVAL',
  'HEAD_TO_HEAD',
  'BINARY_RESULT',
  'COMPOSITE_STAT',
  'PROGRESSION',
  'PHYSICAL',
] as const;

export type GameType = (typeof GAME_TYPES)[number];

/** Supported platforms for a game profile. */
export const PLATFORMS = ['MOBILE', 'PC', 'CONSOLE', 'WEB', 'PHYSICAL'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Match formats. */
export const MATCH_FORMATS = ['BO1', 'BO3', 'BO5'] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

/** Legal state transitions for a match. */
export const MATCH_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['LIVE', 'CANCELLED'],
  LIVE: ['CAPTURING', 'CANCELLED'],
  CAPTURING: ['VERIFYING', 'CANCELLED'],
  VERIFYING: ['VERIFIED', 'DISPUTED', 'REVIEW'],
  VERIFIED: ['SETTLED'],
  DISPUTED: ['REVIEW', 'SETTLED'],
  REVIEW: ['SETTLED'],
  SETTLED: [],
  CANCELLED: [],
} as const;

export type MatchStatus = keyof typeof MATCH_TRANSITIONS;

/** Tournament formats. */
export const TOURNAMENT_FORMATS = ['SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS'] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

/** Default rating for a new player. */
export const DEFAULT_ELO = 1200;

/** K-factor used for Elo updates. */
export const ELO_K_FACTOR = 32;

/** Starting demo wallet balance (POINTS). */
export const STARTING_BALANCE = 10_000;

/** Confidence thresholds. */
export const CONFIDENCE = {
  AUTO_APPROVE: 0.95,
  HUMAN_REVIEW: 0.8,
  REJECT: 0.5,
} as const;

/** OCR capture cadence in ms. */
export const OCR_INTERVAL_MS = 1500;

/** Stable-read requirements for physical challenges. */
export const PHYSICAL_STABLE_READ = {
  requiredIdenticalReads: 3,
  windowMs: 6000,
} as const;

/** Room code length. */
export const ROOM_CODE_LENGTH = 6;

/** Max candidates per queue match window. */
export const QUICK_MATCH_ELO_WINDOW = 150;

/** Financial & Treasury Accounting Thresholds (EUR) */
export const MIN_DEPOSIT_EUR = 5.0;
export const MAX_DEPOSIT_EUR = 100_000.0;
export const MIN_WITHDRAWAL_EUR = 10.0;
export const MAX_WITHDRAWAL_EUR = 1_000_000.0; // Effectively no maximum ceiling: bounded strictly by player available balance

/** Match stakes & fees */
export const MIN_DUEL_STAKE_EUR = 1.0;
export const MIN_DUEL_STAKE_POINTS = 50;
export const PLATFORM_RAKE_PERCENT = 5.0; // 5% platform fee on cash matches

/** Treasury Liquidity Reserve Ratio Target (120% coverage of custodial liabilities) */
export const TARGET_RESERVE_RATIO = 1.20;
