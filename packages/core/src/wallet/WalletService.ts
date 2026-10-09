import type { TypedSupabaseClient } from '@playverzus/db';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Lock {
  id: string;
  userId: string;
  amount: number;
  matchId: string | null;
  tournamentId: string | null;
  status: 'LOCKED' | 'RELEASED' | 'REFUNDED';
  createdAt: Date;
}

export interface WalletSnapshot {
  balance: number;
  locked: number;
  currency: string;
}

export interface RolloverStatus {
  totalDeposited: number;
  totalWagered: number;
  remainingRollover: number;
  withdrawableBalance: number;
}

export type PayoutMethod =
  | { type: 'DEMO' }
  | { type: 'PAYSAFE'; accountId?: string; iban?: string; email?: string }
  | { type: 'MPESA'; phone: string }
  | { type: 'PAYSTACK'; accountNumber: string; bankCode: string }
  | { type: 'CRYPTO'; address: string; network: 'polygon' | 'tron' | 'base' };

export interface PayoutResult {
  success: boolean;
  reference: string;
  message?: string;
}

export interface CreditOptions {
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface LockContext {
  matchId?: string | null;
  tournamentId?: string | null;
}

export interface WalletService {
  getBalance(userId: string): Promise<WalletSnapshot>;
  credit(userId: string, amount: number, reason: string, opts?: CreditOptions): Promise<Transaction>;
  debit(userId: string, amount: number, reason: string, opts?: CreditOptions): Promise<Transaction>;
  lock(userId: string, amount: number, ctx: LockContext): Promise<Lock>;
  settle(matchId: string, winnerId: string, amount?: number): Promise<void>;
  refund(matchId: string): Promise<void>;
  refundTournament(tournamentId: string): Promise<void>;
  payout(userId: string, amount: number, method: PayoutMethod): Promise<PayoutResult>;
  history(userId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  getRolloverStatus?(userId: string): Promise<RolloverStatus>;
}

export interface WalletServiceDeps {
  /** Service-role Supabase client for RPC calls. */
  client: TypedSupabaseClient;
}
