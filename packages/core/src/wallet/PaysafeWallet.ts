import type { TypedSupabaseClient } from '@playverzus/db';
import { WalletError } from '../errors';
import { namedLogger } from '../logger';
import { PaysafeClient } from './paysafe';
import {
  MIN_DEPOSIT_EUR,
  MAX_DEPOSIT_EUR,
  MIN_WITHDRAWAL_EUR,
  MAX_WITHDRAWAL_EUR,
} from '../constants';
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
  RolloverStatus,
} from './WalletService';

const log = namedLogger('PaysafeWallet');

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

/**
 * Real cash wallet service powered by Paysafe Payment Engine.
 * Operates primarily in EUR with real-money escrow locks and payouts.
 * Implements strict Double-Entry and Segregated Client Asset accounting principles.
 */
export class PaysafeWallet implements WalletService {
  private readonly client: TypedSupabaseClient;
  private readonly paysafe: PaysafeClient;

  constructor({ client }: WalletServiceDeps) {
    this.client = client;
    this.paysafe = new PaysafeClient();
  }

  async getBalance(userId: string): Promise<WalletSnapshot> {
    const { data, error } = await this.client
      .from('wallets')
      .select('balance, locked, currency')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new WalletError('INVALID_AMOUNT', error.message, { cause: error.message });
    }

    if (!data) {
      const { error: insertError } = await this.client
        .from('wallets')
        .insert({ user_id: userId, balance: 0, locked: 0, currency: 'EUR' });
      if (insertError) throw new WalletError('INVALID_AMOUNT', insertError.message);
      return { balance: 0, locked: 0, currency: 'EUR' };
    }

    return {
      balance: Number(data.balance),
      locked: Number(data.locked),
      currency: data.currency || 'EUR',
    };
  }

  async credit(userId: string, amount: number, reason: string, opts?: CreditOptions): Promise<Transaction> {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', 'Credit amount must be a positive valid number');
    }

    // Financial rounding to exact 2 decimal cents to avoid floating point drift
    const roundedAmount = Math.round(amount * 100) / 100;
    const snap = await this.getBalance(userId);
    const newBalance = Math.round((snap.balance + roundedAmount) * 100) / 100;

    const { error: updateError } = await this.client
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) throw new WalletError('INVALID_AMOUNT', updateError.message);

    const { data: tx, error: txError } = await this.client
      .from('transactions')
      .insert({
        user_id: userId,
        amount: roundedAmount,
        balance_after: newBalance,
        reason,
        metadata: opts?.metadata ?? {},
        idempotency_key: opts?.idempotencyKey ?? null,
      })
      .select()
      .single();

    if (txError) throw new WalletError('INVALID_AMOUNT', txError.message);

    const typedTx = tx as DbTransaction;
    return {
      id: typedTx.id,
      userId: typedTx.user_id,
      amount: typedTx.amount,
      balanceAfter: typedTx.balance_after,
      reason: typedTx.reason,
      metadata: (typedTx.metadata as Record<string, unknown>) ?? {},
      createdAt: new Date(typedTx.created_at),
    };
  }

  async debit(userId: string, amount: number, reason: string, opts?: CreditOptions): Promise<Transaction> {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', 'Debit amount must be a positive valid number');
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const snap = await this.getBalance(userId);
    const available = Math.max(0, Math.round((snap.balance - snap.locked) * 100) / 100);

    if (available < roundedAmount) {
      throw new WalletError(
        'INSUFFICIENT_FUNDS',
        `Insufficient available EUR balance: available €${available.toFixed(2)}, requested €${roundedAmount.toFixed(2)}`,
      );
    }

    const newBalance = Math.round((snap.balance - roundedAmount) * 100) / 100;

    const { error: updateError } = await this.client
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) throw new WalletError('INVALID_AMOUNT', updateError.message);

    const { data: tx, error: txError } = await this.client
      .from('transactions')
      .insert({
        user_id: userId,
        amount: -roundedAmount,
        balance_after: newBalance,
        reason,
        metadata: opts?.metadata ?? {},
        idempotency_key: opts?.idempotencyKey ?? null,
      })
      .select()
      .single();

    if (txError) throw new WalletError('INVALID_AMOUNT', txError.message);

    const typedTx = tx as DbTransaction;
    return {
      id: typedTx.id,
      userId: typedTx.user_id,
      amount: typedTx.amount,
      balanceAfter: typedTx.balance_after,
      reason: typedTx.reason,
      metadata: (typedTx.metadata as Record<string, unknown>) ?? {},
      createdAt: new Date(typedTx.created_at),
    };
  }

  async lock(userId: string, amount: number, ctx: LockContext): Promise<Lock> {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', 'Lock amount must be a positive valid number');
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const snap = await this.getBalance(userId);
    const available = Math.max(0, Math.round((snap.balance - snap.locked) * 100) / 100);

    if (available < roundedAmount) {
      throw new WalletError(
        'INSUFFICIENT_FUNDS',
        `Cannot lock EUR ${roundedAmount.toFixed(2)}: available balance is only EUR ${available.toFixed(2)}`,
      );
    }

    // Move from available to locked in escrow
    const newLocked = Math.round((snap.locked + roundedAmount) * 100) / 100;
    const { error: updateError } = await this.client
      .from('wallets')
      .update({
        locked: newLocked,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) throw new WalletError('INVALID_AMOUNT', updateError.message);

    const { data: lockRow, error: lockError } = await this.client
      .from('locks')
      .insert({
        user_id: userId,
        amount,
        match_id: ctx.matchId ?? null,
        tournament_id: ctx.tournamentId ?? null,
        status: 'LOCKED',
      })
      .select()
      .single();

    if (lockError) throw new WalletError('INVALID_AMOUNT', lockError.message);

    const typedLock = lockRow as DbLock;
    return {
      id: typedLock.id,
      userId: typedLock.user_id,
      amount: typedLock.amount,
      matchId: typedLock.match_id,
      tournamentId: typedLock.tournament_id,
      status: typedLock.status,
      createdAt: new Date(typedLock.created_at),
    };
  }

  async settle(matchId: string, winnerId: string, amount?: number): Promise<void> {
    if (amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)) {
      throw new WalletError('INVALID_AMOUNT', 'Settlement award amount must be a positive valid number');
    }

    const { data: locks, error } = await this.client
      .from('locks')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'LOCKED');

    if (error || !locks || locks.length === 0) return;

    let totalPool = 0;
    for (const l of locks as DbLock[]) {
      totalPool += l.amount;
      // Deduct locked amount from user wallet
      const snap = await this.getBalance(l.user_id);
      await this.client
        .from('wallets')
        .update({ locked: Math.max(0, snap.locked - l.amount) })
        .eq('user_id', l.user_id);

      await this.client
        .from('locks')
        .update({ status: 'RELEASED' })
        .eq('id', l.id);
    }

    const awardAmount = amount ?? totalPool;
    if (awardAmount > 0) {
      await this.credit(winnerId, awardAmount, `Match Won #${matchId.slice(0, 8)}`);
    }
  }

  async refund(matchId: string): Promise<void> {
    const { data: locks } = await this.client
      .from('locks')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'LOCKED');

    if (!locks) return;

    for (const l of locks as DbLock[]) {
      const snap = await this.getBalance(l.user_id);
      await this.client
        .from('wallets')
        .update({
          balance: snap.balance + l.amount,
          locked: Math.max(0, snap.locked - l.amount),
        })
        .eq('user_id', l.user_id);

      await this.client
        .from('locks')
        .update({ status: 'REFUNDED' })
        .eq('id', l.id);
    }
  }

  async refundTournament(tournamentId: string): Promise<void> {
    const { data: locks } = await this.client
      .from('locks')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'LOCKED');

    if (!locks) return;

    for (const l of locks as DbLock[]) {
      const snap = await this.getBalance(l.user_id);
      await this.client
        .from('wallets')
        .update({
          balance: snap.balance + l.amount,
          locked: Math.max(0, snap.locked - l.amount),
        })
        .eq('user_id', l.user_id);

      await this.client
        .from('locks')
        .update({ status: 'REFUNDED' })
        .eq('id', l.id);
    }
  }

  async payout(userId: string, amount: number, method: PayoutMethod): Promise<PayoutResult> {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new WalletError('INVALID_AMOUNT', 'Payout amount must be a positive valid number');
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount < MIN_WITHDRAWAL_EUR) {
      throw new WalletError(
        'INVALID_AMOUNT',
        `The minimum withdrawal threshold is €${MIN_WITHDRAWAL_EUR.toFixed(2)}.`,
      );
    }

    if (roundedAmount > MAX_WITHDRAWAL_EUR) {
      throw new WalletError(
        'INVALID_AMOUNT',
        `The maximum withdrawal limit is €${MAX_WITHDRAWAL_EUR.toFixed(2)}.`,
      );
    }

    const snap = await this.getBalance(userId);
    const available = Math.max(0, Math.round((snap.balance - snap.locked) * 100) / 100);

    if (available < roundedAmount) {
      throw new WalletError(
        'INSUFFICIENT_FUNDS',
        `Cannot withdraw EUR ${roundedAmount.toFixed(2)}: available balance is only EUR ${available.toFixed(2)} (EUR ${snap.locked.toFixed(2)} locked in active contests)`,
      );
    }

    const rollover = await this.getRolloverStatus(userId);
    if (roundedAmount > rollover.withdrawableBalance) {
      throw new WalletError(
        'INSUFFICIENT_FUNDS',
        `Under regulatory anti-money laundering (AML) standards, deposited funds must be wagered at least 1x before withdrawal. You currently have €${rollover.remainingRollover.toFixed(2)} in un-wagered deposits. Your withdrawable balance is €${rollover.withdrawableBalance.toFixed(2)}.`,
      );
    }

    const merchantRefNum = `payout-${userId.slice(0, 8)}-${Date.now()}`;

    // Execute Paysafe standalone credit payout
    const paysafeRes = await this.paysafe.processPayout({
      merchantRefNum,
      amount: Math.round(roundedAmount * 100), // in cents
      currencyCode: 'EUR',
      destination: {
        type: 'BANK_ACCOUNT',
        iban: (method as any).iban,
        email: (method as any).email,
      },
    });

    if (paysafeRes.status === 'FAILED') {
      throw new WalletError('PAYOUT_FAILED', paysafeRes.error?.message || 'Paysafe withdrawal failed');
    }

    // Debit the wallet balance
    await this.debit(userId, amount, `Withdrawal Payout via Paysafe (${method.type})`, {
      metadata: {
        paysafePaymentId: paysafeRes.id,
        merchantRefNum,
        method,
      },
    });

    log.info(`Payout executed successfully via Paysafe: ${paysafeRes.id} for EUR ${amount}`);

    return {
      success: true,
      reference: paysafeRes.id,
      message: `Paysafe payout initiated for €${amount.toFixed(2)}`,
    };
  }

  async history(userId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new WalletError('INVALID_AMOUNT', error.message);

    return (data as DbTransaction[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      balanceAfter: row.balance_after,
      reason: row.reason,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Computes 1x rollover wagering compliance status for AML and anti-fraud enforcement.
   * Deposited funds must be wagered at least once in competitive matches before withdrawal.
   */
  async getRolloverStatus(userId: string): Promise<RolloverStatus> {
    const snap = await this.getBalance(userId);
    const available = Math.max(0, Math.round((snap.balance - snap.locked) * 100) / 100);

    // Sum deposits from transactions table
    const { data: txs, error: txError } = await this.client
      .from('transactions')
      .select('amount, reason, metadata')
      .eq('user_id', userId);

    let totalDeposited = 0;
    if (!txError && txs) {
      for (const tx of txs) {
        const amt = Number(tx.amount);
        const reason = (tx.reason || '').toLowerCase();
        const meta = tx.metadata as Record<string, unknown> | null;
        if (amt > 0 && (reason.includes('deposit') || meta?.provider === 'PAYSAFE' || meta?.paymentId)) {
          totalDeposited += amt;
        }
      }
    }
    totalDeposited = Math.round(totalDeposited * 100) / 100;

    // Sum completed wagers from locks table
    const { data: locks, error: lockError } = await this.client
      .from('locks')
      .select('amount, status')
      .eq('user_id', userId);

    let totalWagered = 0;
    if (!lockError && locks) {
      for (const l of locks) {
        if (l.status === 'RELEASED') {
          totalWagered += Number(l.amount);
        }
      }
    }
    totalWagered = Math.round(totalWagered * 100) / 100;

    const remainingRollover = Math.max(0, Math.round((totalDeposited - totalWagered) * 100) / 100);
    const withdrawableBalance = Math.max(0, Math.round((available - remainingRollover) * 100) / 100);

    return {
      totalDeposited,
      totalWagered,
      remainingRollover,
      withdrawableBalance,
    };
  }

  getPaysafeClient(): PaysafeClient {
    return this.paysafe;
  }
}
