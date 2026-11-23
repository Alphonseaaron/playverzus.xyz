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

/** Financial & Treasury Accounting Thresholds (USDC) */
export const MIN_DEPOSIT_USDC = 5.0;
export const MAX_DEPOSIT_USDC = 100_000.0;
export const MIN_WITHDRAWAL_USDC = 5.0;
export const MAX_WITHDRAWAL_USDC = 1_000_000.0; // Effectively no maximum ceiling: bounded strictly by player available balance

// Backward compatibility aliases
export const MIN_DEPOSIT_EUR = MIN_DEPOSIT_USDC;
export const MAX_DEPOSIT_EUR = MAX_DEPOSIT_USDC;
export const MIN_WITHDRAWAL_EUR = MIN_WITHDRAWAL_USDC;
export const MAX_WITHDRAWAL_EUR = MAX_WITHDRAWAL_USDC;

/** Match stakes & differentiated platform rake schedule */
export const MIN_DUEL_STAKE_USDC = 0.50; // Micro grass-roots entry
export const MIN_DUEL_STAKE_EUR = MIN_DUEL_STAKE_USDC;
export const MIN_DUEL_STAKE_POINTS = 50;
export const PLATFORM_RAKE_PERCENT = 15.0; // Starter duels (<= $5.00 / KES 650)
export const PLATFORM_RAKE_PRO_PERCENT = 12.5; // Pro / Standard duels (> $5.00 / KES 650)
export const TOURNAMENT_CUP_RAKE_PERCENT = 20.0; // Multi-bracket tournaments (8-64 players)

export function getDuelRakeRate(entryFeeUsd: number): number {
  if (!entryFeeUsd || entryFeeUsd <= 0) return 0;
  return entryFeeUsd <= 5.0 ? 0.15 : 0.125;
}

/** 5-Player Sit & Go Blitz Tournament Tier Configurations (16% -> 22% Differentiated Rake) */
export interface TournamentTierConfig {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  entryFee: number;
  totalEntrants: 5;
  totalPot: number;
  rakePercent: number;
  rakeAmount: number;
  netPrizePool: number;
  payouts: {
    firstPlace: { percent: number; amount: number };
    secondPlace: { percent: number; amount: number };
  };
}

export const TOURNAMENT_TIERS: Record<1 | 2 | 3 | 4 | 5, TournamentTierConfig> = {
  1: {
    tier: 1,
    name: 'Starter / Grassroots',
    entryFee: 10.00,
    totalEntrants: 5,
    totalPot: 50.00,
    rakePercent: 16.0,
    rakeAmount: 8.00,
    netPrizePool: 42.00,
    payouts: {
      firstPlace: { percent: 70.0, amount: 29.40 },
      secondPlace: { percent: 30.0, amount: 12.60 },
    },
  },
  2: {
    tier: 2,
    name: 'Challenger / Mid',
    entryFee: 50.00,
    totalEntrants: 5,
    totalPot: 250.00,
    rakePercent: 18.0,
    rakeAmount: 45.00,
    netPrizePool: 205.00,
    payouts: {
      firstPlace: { percent: 70.0, amount: 143.50 },
      secondPlace: { percent: 30.0, amount: 61.50 },
    },
  },
  3: {
    tier: 3,
    name: 'Champion / High-Roller',
    entryFee: 100.00,
    totalEntrants: 5,
    totalPot: 500.00,
    rakePercent: 20.0,
    rakeAmount: 100.00,
    netPrizePool: 400.00,
    payouts: {
      firstPlace: { percent: 70.0, amount: 280.00 },
      secondPlace: { percent: 30.0, amount: 120.00 },
    },
  },
  4: {
    tier: 4,
    name: 'Master / Elite',
    entryFee: 200.00,
    totalEntrants: 5,
    totalPot: 1000.00,
    rakePercent: 20.0,
    rakeAmount: 200.00,
    netPrizePool: 800.00,
    payouts: {
      firstPlace: { percent: 70.0, amount: 560.00 },
      secondPlace: { percent: 30.0, amount: 240.00 },
    },
  },
  5: {
    tier: 5,
    name: 'Grandmaster / High Stakes',
    entryFee: 500.00,
    totalEntrants: 5,
    totalPot: 2500.00,
    rakePercent: 22.0,
    rakeAmount: 550.00,
    netPrizePool: 1950.00,
    payouts: {
      firstPlace: { percent: 70.0, amount: 1365.00 },
      secondPlace: { percent: 30.0, amount: 585.00 },
    },
  },
};

/** Treasury Liquidity Reserve Ratio Target (120% coverage of custodial liabilities) */
export const TARGET_RESERVE_RATIO = 1.20;
