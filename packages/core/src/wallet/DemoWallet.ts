import type { TypedSupabaseClient } from '@playverzus/db';

import { WalletError } from '../errors';
import { namedLogger } from '../logger';
import { STARTING_BALANCE } from '../constants';

import type {
  CreditOptions,
  Lock,
  LockContext,
  PayoutMethod,
  PayoutResult,
  Transaction,
  WalletService,
  WalletServiceDeps,
  WalletSnapshot,
} from './WalletService';

const log = namedLogger('DemoWallet');

interface DbTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface DbLock {
  id: string;
  user_id: string;
  amount: number;
  match_id: string | null;
  tournament_id: string | null;
  status: 'LOCKED' | 'RELEASED' | 'REFUNDED';
  created_at: string;
}

/** In-memory demo wallet backed by Supabase RPC functions. */
export class DemoWallet implements WalletService {
  private readonly client: TypedSupabaseClient;

  constructor({ client }: WalletServiceDeps) {
    this.client = client;
  }

  async getBalance(userId: string): Promise<WalletSnapshot> {
    const { data, error } = await this.client
      .from('wallets')
      .select('balance, locked, currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new WalletError('INVALID_AMOUNT', error.message, { cause: error.message });

    if (!data) {
      // Bootstrap the wallet row lazily.
      const { error: insertError } = await this.client
        .from('wallets')
        .insert({ user_id: userId, balance: STARTING_BALANCE, locked: 0, currency: 'POINTS' });
      if (insertError) throw new WalletError('INVALID_AMOUNT', insertError.message);
      return { balance: STARTING_BALANCE, locked: 0, currency: 'POINTS' };
    }

    return {
      balance: Number(data.balance),
      locked: Number(data.locked),
      currency: data.currency,
    };
  }

  async credit(
    userId: string,
    amount: number,
    reason: string,
    opts: CreditOptions = {},
  ): Promise<Transaction> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', `credit amount must be positive integer, got ${amount}`);
    }

    const { data, error } = await this.client.rpc('wallet_credit', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_metadata: (opts.metadata ?? {}) as never,
      p_idem: opts.idempotencyKey ?? null,
    });

    if (error) throw new WalletError('INVALID_AMOUNT', error.message);
    return this.mapTransaction(data as unknown as DbTransaction);
  }

  async debit(
    userId: string,
    amount: number,
    reason: string,
    opts: CreditOptions = {},
  ): Promise<Transaction> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', `debit amount must be positive integer, got ${amount}`);
    }

    const { data, error } = await this.client.rpc('wallet_debit', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_metadata: (opts.metadata ?? {}) as never,
      p_idem: opts.idempotencyKey ?? null,
    });

    if (error) {
      if (error.message.toLowerCase().includes('insufficient')) {
        throw new WalletError('INSUFFICIENT_FUNDS', error.message);
      }
      throw new WalletError('INVALID_AMOUNT', error.message);
    }

    return this.mapTransaction(data as unknown as DbTransaction);
  }

  async lock(userId: string, amount: number, ctx: LockContext): Promise<Lock> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', `lock amount must be positive integer, got ${amount}`);
    }
    if (!ctx.matchId && !ctx.tournamentId) {
      throw new WalletError('INVALID_AMOUNT', 'lock requires matchId or tournamentId');
    }

    const { data, error } = await this.client.rpc('wallet_lock', {
      p_user_id: userId,
      p_amount: amount,
      p_match_id: ctx.matchId ?? null,
      p_tournament_id: ctx.tournamentId ?? null,
    });

    if (error) {
      if (error.message.toLowerCase().includes('insufficient')) {
        throw new WalletError('INSUFFICIENT_FUNDS', error.message);
      }
      throw new WalletError('INVALID_AMOUNT', error.message);
    }

    return this.mapLock(data as unknown as DbLock);
  }

  async settle(matchId: string, winnerId: string, amount?: number): Promise<void> {
    const { error } = await this.client.rpc('wallet_settle', {
      p_match_id: matchId,
      p_winner_id: winnerId,
      p_amount: amount ?? null,
    });
    if (error) throw new WalletError('INVALID_AMOUNT', error.message);
  }

  async refund(matchId: string): Promise<void> {
    const { error } = await this.client.rpc('wallet_refund', { p_match_id: matchId });
    if (error) throw new WalletError('INVALID_AMOUNT', error.message);
  }

  async refundTournament(tournamentId: string): Promise<void> {
    const { error } = await this.client.rpc('wallet_refund_tournament', {
      p_tournament_id: tournamentId,
    });
    if (error) throw new WalletError('INVALID_AMOUNT', error.message);
  }

  async payout(userId: string, amount: number, method: PayoutMethod): Promise<PayoutResult> {
    if (method.type !== 'DEMO') {
      throw new WalletError(
        'NOT_IMPLEMENTED',
        `payout method ${method.type} requires WALLET_MODE=real`,
      );
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', `payout amount must be positive integer, got ${amount}`);
    }

    await this.debit(userId, amount, 'payout_demo', {
      metadata: { method: 'DEMO' },
      idempotencyKey: `payout:demo:${userId}:${Date.now()}`,
    });

    return { success: true, reference: `demo_${Date.now()}_${userId.slice(0, 8)}` };
  }

  async history(userId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('id, user_id, amount, balance_after, reason, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new WalletError('INVALID_AMOUNT', error.message);
    return ((data ?? []) as unknown as DbTransaction[]).map((t) => this.mapTransaction(t));
  }

  private mapTransaction(t: DbTransaction): Transaction {
    return {
      id: t.id,
      userId: t.user_id,
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      reason: t.reason,
      metadata: (t.metadata as Record<string, unknown>) ?? {},
      createdAt: new Date(t.created_at),
    };
  }

  private mapLock(l: DbLock): Lock {
    return {
      id: l.id,
      userId: l.user_id,
      amount: Number(l.amount),
      matchId: l.match_id,
      tournamentId: l.tournament_id,
      status: l.status,
      createdAt: new Date(l.created_at),
    };
  }
}

// Silence unused-import lint when a downstream file consumes it directly.
void log;
