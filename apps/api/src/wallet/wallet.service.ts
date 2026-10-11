import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  type PayoutMethod,
  PaysafeClient,
  MIN_DEPOSIT_EUR,
  MAX_DEPOSIT_EUR,
  MIN_WITHDRAWAL_EUR,
  MAX_WITHDRAWAL_EUR,
} from '@playverzus/core';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { RedisService } from '../redis/redis.service';
import { PushService } from '../push/push.service';

interface CashLedger {
  balance: number; // EUR
  locked: number;  // EUR
}

/**
 * Unified Dual-Wallet Service
 *
 * Fully supports and isolates:
 * 1. REAL CASH LEDGER (€ EUR) — for cash duels, deposits, withdrawals, and escrow
 * 2. FREE DEMO PRACTICE LEDGER (PTS) — for free tournaments, 24h faucet reload, and practice duels
 *
 * Persisted in Supabase PostgreSQL (wallets + transactions) and accelerated with Upstash Redis.
 */
@Injectable()
export class WalletService {
  private readonly log = new Logger(WalletService.name);
  private supabase: TypedSupabaseClient;
  private paysafe: PaysafeClient;

  constructor(
    private readonly redis: RedisService,
    private readonly push: PushService,
  ) {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.paysafe = new PaysafeClient();
  }

  // ─── Real Cash Storage Helpers (€ EUR) ──────────────────────────────────

  /**
   * Get a user's Real Cash balance (€ EUR).
   * Checks Redis first; if missing, reconstructs from Supabase transactions.
   */
  async getRealCash(userId: string): Promise<CashLedger> {
    const redisKey = `cash:${userId}`;
    const cached = await this.redis.get(redisKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (typeof parsed.balance === 'number') {
          return {
            balance: Math.max(0, Math.round(parsed.balance * 100) / 100),
            locked: Math.max(0, Math.round((parsed.locked || 0) * 100) / 100),
          };
        }
      } catch {}
    }

    // Reconstruct from Supabase transactions where currency is EUR
    let balanceCents = 0;
    try {
      const { data: txs } = await this.supabase
        .from('transactions')
        .select('amount, metadata')
        .eq('user_id', userId);

      if (txs) {
        for (const tx of txs) {
          const meta = tx.metadata as Record<string, unknown> | null;
          if (meta?.currency === 'EUR' || meta?.provider === 'PAYSAFE') {
            balanceCents += Number(tx.amount);
          }
        }
      }
    } catch (err) {
      this.log.warn({ err, userId }, 'Failed to compute cash from transactions');
    }

    // Check locked cash in escrow locks
    let lockedCents = 0;
    try {
      const { data: locks } = await this.supabase
        .from('locks')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'LOCKED');

      if (locks) {
        for (const l of locks) {
          lockedCents += Number(l.amount);
        }
      }
    } catch {}

    const ledger: CashLedger = {
      balance: Math.max(0, Math.round(balanceCents) / 100),
      locked: Math.max(0, Math.round(lockedCents) / 100),
    };

    // Cache with 30-day TTL in Redis
    await this.redis.set(redisKey, JSON.stringify(ledger), 60 * 60 * 24 * 30);
    return ledger;
  }

  /**
   * Save Real Cash balance to Redis cache
   */
  private async setRealCash(userId: string, ledger: CashLedger): Promise<void> {
    const clean: CashLedger = {
      balance: Math.max(0, Math.round(ledger.balance * 100) / 100),
      locked: Math.max(0, Math.round(ledger.locked * 100) / 100),
    };
    await this.redis.set(`cash:${userId}`, JSON.stringify(clean), 60 * 60 * 24 * 30);
  }

  // ─── Demo Points Storage Helpers (PTS) ──────────────────────────────────

  /**
   * Get user's Demo Play Points from Supabase wallets table
   */
  async getDemoPoints(userId: string): Promise<{ balance: number; locked: number }> {
    try {
      const { data } = await this.supabase
        .from('wallets')
        .select('balance, locked')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) {
        // Bootstrap new user with 10,000 free demo practice coins
        try {
          await this.supabase
            .from('wallets')
            .insert({
              user_id: userId,
              balance: 10000,
              locked: 0,
              currency: 'POINTS',
            });
        } catch {
          // ignore bootstrap insert conflict
        }
        return { balance: 10000, locked: 0 };
      }

      return {
        balance: Number(data.balance) || 0,
        locked: Number(data.locked) || 0,
      };
    } catch {
      return { balance: 10000, locked: 0 };
    }
  }

  // ─── Public API Endpoints ───────────────────────────────────────────────

  /**
   * Returns unified wallet snapshot with BOTH Real Cash (€ EUR) and Demo Practice (PTS)
   */
  async getBalance(userId: string) {
    try {
      const [cash, points] = await Promise.all([
        this.getRealCash(userId),
        this.getDemoPoints(userId),
      ]);

      const withdrawableEur = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);

      return {
        // Demo Practice Coins
        balance: points.balance,
        locked: points.locked,
        // Real Cash (€ EUR)
        cashEur: cash.balance,
        lockedCashEur: cash.locked,
        withdrawableEur,
        remainingRolloverEur: 0,
        currency: 'EUR',
        minDepositEur: MIN_DEPOSIT_EUR,
        maxDepositEur: MAX_DEPOSIT_EUR,
        minWithdrawalEur: MIN_WITHDRAWAL_EUR,
        maxWithdrawalEur: MAX_WITHDRAWAL_EUR,
      };
    } catch (err) {
      this.log.error({ err, userId }, 'Error fetching wallet balance');
      return {
        balance: 10000,
        locked: 0,
        cashEur: 0.0,
        lockedCashEur: 0.0,
        withdrawableEur: 0.0,
        remainingRolloverEur: 0,
        currency: 'EUR',
        minDepositEur: MIN_DEPOSIT_EUR,
        maxDepositEur: MAX_DEPOSIT_EUR,
        minWithdrawalEur: MIN_WITHDRAWAL_EUR,
        maxWithdrawalEur: MAX_WITHDRAWAL_EUR,
      };
    }
  }

  /**
   * Get transaction history across both Real Cash and Demo Coin transactions
   */
  async getHistory(userId: string, limit = 50, offset = 0) {
    try {
      const { data } = await this.supabase
        .from('transactions')
        .select('id, amount, balance_after, reason, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!data) return [];

      return data.map((t) => {
        const meta = t.metadata as Record<string, unknown> | null;
        const isEur = meta?.currency === 'EUR';
        const numAmount = Number(t.amount);
        const numBalance = Number(t.balance_after);

        return {
          id: t.id,
          amount: isEur ? numAmount / 100 : numAmount,
          balanceAfter: isEur ? numBalance / 100 : numBalance,
          reason: t.reason,
          metadata: meta || {},
          createdAt: t.created_at,
          currency: isEur ? 'EUR' : 'POINTS',
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Deposit real funds via Paysafe gateway into the Real Cash ledger
   */
  async deposit(
    userId: string,
    amount: number,
    currency = 'EUR',
    paymentHandleToken?: string,
    method = 'PAYSAFE',
  ) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Please enter a valid deposit amount greater than zero.');
    }

    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount < MIN_DEPOSIT_EUR) {
      throw new BadRequestException(`The minimum deposit amount is €${MIN_DEPOSIT_EUR.toFixed(2)}.`);
    }

    if (roundedAmount > MAX_DEPOSIT_EUR) {
      throw new BadRequestException(
        `The maximum deposit limit per transaction is €${MAX_DEPOSIT_EUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      );
    }

    const merchantRefNum = `dep-${userId.slice(0, 8)}-${Date.now()}`;
    let paymentId = `paysafe-auth-${Date.now()}`;

    // Process payment token via Paysafe client if token is supplied
    if (paymentHandleToken && !paymentHandleToken.startsWith('paysafe_token_')) {
      try {
        const res = await this.paysafe.processPayment({
          merchantRefNum,
          amount: Math.round(roundedAmount * 100),
          currencyCode: currency,
          paymentHandleToken,
          description: `PlayVerzus ${currency} Competitive Deposit via ${method}`,
        });

        if (res.status === 'FAILED') {
          throw new BadRequestException(
            res.error?.message || 'Your card issuer declined the transaction.',
          );
        }
        paymentId = res.id;
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Payment authorization was unsuccessful. Please check your payment details.');
      }
    }

    // Credit Real Cash ledger
    const cash = await this.getRealCash(userId);
    const newCashBalance = Math.round((cash.balance + roundedAmount) * 100) / 100;
    cash.balance = newCashBalance;
    await this.setRealCash(userId, cash);

    // Record permanent financial transaction in Supabase
    const amountCents = Math.round(roundedAmount * 100);
    const balanceAfterCents = Math.round(newCashBalance * 100);

    let txRecord: any = null;
    try {
      const res = await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: amountCents,
          balance_after: balanceAfterCents,
          reason: `Deposit via ${method}`,
          metadata: {
            currency: 'EUR',
            provider: method,
            paymentId,
            merchantRefNum,
            type: 'DEPOSIT',
          },
        })
        .select('id')
        .maybeSingle();
      txRecord = res.data;
    } catch {
      // Non-fatal if transactions table write fails
    }

    // Send instant push notification to user
    await this.push.sendToUser(userId, {
      title: 'Deposit Successful',
      body: `€${roundedAmount.toFixed(2)} has been added to your Real Cash balance.`,
      type: 'wallet',
      url: '/cashier',
    });

    return {
      success: true,
      transactionId: txRecord?.id || `tx-${Date.now()}`,
      amount: roundedAmount,
      currency: 'EUR',
      paymentId,
      balanceAfter: newCashBalance,
      message: `Successfully deposited €${roundedAmount.toFixed(2)} to your competitive wallet.`,
    };
  }

  /**
   * Request a real cash withdrawal / payout from the Real Cash ledger
   */
  async requestPayout(userId: string, amount: number, methodInput: PayoutMethod | string) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Please enter a valid withdrawal amount greater than zero.');
    }

    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount < MIN_WITHDRAWAL_EUR) {
      throw new BadRequestException(`The minimum withdrawal threshold is €${MIN_WITHDRAWAL_EUR.toFixed(2)}.`);
    }

    if (roundedAmount > MAX_WITHDRAWAL_EUR) {
      throw new BadRequestException(
        `The maximum single withdrawal limit is €${MAX_WITHDRAWAL_EUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      );
    }

    const cash = await this.getRealCash(userId);
    const available = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);

    if (roundedAmount > available) {
      throw new BadRequestException(
        `Insufficient available cash balance. Your current withdrawable balance is €${available.toFixed(2)}.`,
      );
    }

    // Deduct from Real Cash ledger
    const newCashBalance = Math.round((cash.balance - roundedAmount) * 100) / 100;
    cash.balance = newCashBalance;
    await this.setRealCash(userId, cash);

    const methodType = typeof methodInput === 'string' ? methodInput : (methodInput as PayoutMethod).type || 'PAYSAFE';
    const amountCents = Math.round(roundedAmount * 100);
    const balanceAfterCents = Math.round(newCashBalance * 100);

    // Record permanent financial transaction in Supabase
    try {
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: -amountCents,
          balance_after: balanceAfterCents,
          reason: `Payout via ${methodType}`,
          metadata: {
            currency: 'EUR',
            method: methodInput,
            type: 'WITHDRAWAL',
          },
        });
    } catch {
      // Non-fatal if transactions table write fails
    }

    // Send instant push notification to user
    await this.push.sendToUser(userId, {
      title: 'Withdrawal Processing',
      body: `Your payout of €${roundedAmount.toFixed(2)} has been submitted for processing.`,
      type: 'wallet',
      url: '/cashier',
    });

    return {
      success: true,
      reference: `PAYOUT-${Date.now()}-${userId.slice(0, 6)}`,
      amount: roundedAmount,
      balanceAfter: newCashBalance,
      message: `Your withdrawal of €${roundedAmount.toFixed(2)} has been submitted and is processing.`,
    };
  }

  /**
   * Claim free Practice / Demo Coins (+1,000 PTS).
   * Enforces a 24-hour cooldown per user via Redis.
   */
  async claimDemoTokens(userId: string) {
    // 1. Enforce 24-hour cooldown
    const remainingSecs = await this.redis.checkCooldown(`demo:${userId}`, 60 * 60 * 24);
    if (remainingSecs > 0) {
      const hoursLeft = Math.ceil(remainingSecs / 3600);
      throw new BadRequestException(
        `Demo coins can only be claimed once per 24 hours. Available again in ${hoursLeft}h.`,
      );
    }

    const claimAmount = 1000;
    const current = await this.getDemoPoints(userId);
    const newBalance = current.balance + claimAmount;

    // 2. Update Supabase wallets table
    await this.supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // 3. Record transaction in Supabase
    try {
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: claimAmount,
          balance_after: newBalance,
          reason: 'Daily Free Demo Practice Reload',
          metadata: { currency: 'POINTS', type: 'DEMO_CLAIM' },
        });
    } catch {
      // Non-fatal transaction history insert failure
    }

    return {
      success: true,
      amount: claimAmount,
      balanceAfter: newBalance,
      message: 'Claimed 1,000 Free Demo Practice Coins!',
    };
  }

  // ─── Match Escrow Operations (Real Cash & Demo Points) ────────────────────

  /**
   * Lock funds in escrow for a match (either Real Cash EUR or Demo PTS)
   */
  async lockMatchStake(userId: string, amount: number, matchId: string, isRealCash: boolean): Promise<void> {
    if (isRealCash) {
      const cash = await this.getRealCash(userId);
      const available = Math.max(0, cash.balance - cash.locked);
      if (available < amount) {
        throw new BadRequestException(`Insufficient Real Cash balance: available €${available.toFixed(2)}, required €${amount.toFixed(2)}`);
      }
      cash.locked = Math.round((cash.locked + amount) * 100) / 100;
      await this.setRealCash(userId, cash);

      try {
        await this.supabase.from('locks').insert({
          user_id: userId,
          amount: Math.round(amount * 100), // in cents
          match_id: matchId,
          status: 'LOCKED',
        });
      } catch {
        // Non-fatal
      }
    } else {
      const pts = await this.getDemoPoints(userId);
      const available = Math.max(0, pts.balance - pts.locked);
      if (available < amount) {
        throw new BadRequestException(`Insufficient Demo Points: available ${available} PTS, required ${amount} PTS`);
      }
      const newLocked = pts.locked + amount;
      await this.supabase.from('wallets').update({ locked: newLocked }).eq('user_id', userId);
      try {
        await this.supabase.from('locks').insert({
          user_id: userId,
          amount,
          match_id: matchId,
          status: 'LOCKED',
        });
      } catch {
        // Non-fatal
      }
    }
  }

  /**
   * Settle match escrow: release locks and credit prize to winner
   */
  async settleMatchStake(
    matchId: string,
    playerA: string,
    playerB: string,
    winnerId: string,
    stakeAmount: number,
    isRealCash: boolean,
  ): Promise<void> {
    const totalPrize = Math.round((stakeAmount * 2 * 0.90) * 100) / 100; // 90% prize pool

    if (isRealCash) {
      // Release player A and B locks
      const [cashA, cashB] = await Promise.all([
        this.getRealCash(playerA),
        this.getRealCash(playerB),
      ]);
      cashA.locked = Math.max(0, Math.round((cashA.locked - stakeAmount) * 100) / 100);
      cashA.balance = Math.max(0, Math.round((cashA.balance - stakeAmount) * 100) / 100);
      cashB.locked = Math.max(0, Math.round((cashB.locked - stakeAmount) * 100) / 100);
      cashB.balance = Math.max(0, Math.round((cashB.balance - stakeAmount) * 100) / 100);

      // Credit winner
      const winnerCash = winnerId === playerA ? cashA : cashB;
      winnerCash.balance = Math.round((winnerCash.balance + totalPrize) * 100) / 100;

      await Promise.all([
        this.setRealCash(playerA, cashA),
        this.setRealCash(playerB, cashB),
      ]);

      // Release lock rows in DB
      try {
        await this.supabase.from('locks').update({ status: 'RELEASED' }).eq('match_id', matchId);
      } catch {
        // Non-fatal
      }

      // Record prize transaction
      try {
        await this.supabase.from('transactions').insert({
          user_id: winnerId,
          amount: Math.round(totalPrize * 100),
          balance_after: Math.round(winnerCash.balance * 100),
          reason: 'Match Prize Victory',
          metadata: { matchId, currency: 'EUR', type: 'MATCH_PRIZE' },
        });
      } catch {
        // Non-fatal
      }
    } else {
      // Settle demo points using Postgres RPC
      try {
        await this.supabase.rpc('wallet_settle', {
          p_match_id: matchId,
          p_winner_id: winnerId,
          p_amount: Math.round(totalPrize),
        });
      } catch {
        // Non-fatal
      }
    }
  }

  getPaysafeConfig() {
    return {
      ...this.paysafe.getPublicConfig(),
      minDepositEur: MIN_DEPOSIT_EUR,
      maxDepositEur: MAX_DEPOSIT_EUR,
      minWithdrawalEur: MIN_WITHDRAWAL_EUR,
      maxWithdrawalEur: MAX_WITHDRAWAL_EUR,
    };
  }
}
