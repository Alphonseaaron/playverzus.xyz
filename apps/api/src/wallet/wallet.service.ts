import {
  Injectable,
  Optional,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import {
  type PayoutMethod,
  PaysafeClient,
  getDuelRakeRate,
  MIN_DEPOSIT_USDC,
  MAX_DEPOSIT_USDC,
  MIN_WITHDRAWAL_USDC,
  MAX_WITHDRAWAL_USDC,
  MIN_DEPOSIT_EUR,
  MAX_DEPOSIT_EUR,
  MIN_WITHDRAWAL_EUR,
  MAX_WITHDRAWAL_EUR,
} from '@playverzus/core';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { RedisService } from '../redis/redis.service';
import { PushService } from '../push/push.service';
import {
  resolveCrossmintEnv,
  resolveTreasuryAddress,
  executeCrossmintUsdcTransfer,
} from '../crossmint/crossmint-wallets.helper';

interface CashLedger {
  balance: number; // USDC
  locked: number;  // USDC
}

/**
 * Unified Dual-Wallet Service
 *
 * Fully supports and isolates:
 * 1. REAL CASH LEDGER ($ USDC) — for cash duels, deposits, withdrawals, and escrow
 * 2. FREE DEMO PRACTICE LEDGER (PTS) — for free tournaments, 24h faucet reload, and practice duels
 *
 * Persisted in Supabase PostgreSQL (wallets + transactions) and accelerated with Upstash Redis.
 */
@Injectable()
export class WalletService {
  private readonly log = new Logger(WalletService.name);
  private supabase: TypedSupabaseClient;
  private paysafe: PaysafeClient;

  private readonly redis: RedisService;
  private readonly push: PushService;

  constructor(
    @Optional() redis?: RedisService,
    @Optional() push?: PushService,
  ) {
    this.redis =
      redis ??
      ({
        get: async () => null,
        set: async () => {},
        del: async () => {},
        checkCooldown: async () => 0,
        withLock: async <T>(_k: string, _t: number, fn: () => Promise<T>) => fn(),
      } as unknown as RedisService);
    this.push =
      push ??
      ({
        sendToUser: async () => {},
        sendToUsers: async () => {},
      } as unknown as PushService);
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
          if (
            meta?.currency === 'USDC' ||
            meta?.currency === 'USD' ||
            meta?.currency === 'EUR' ||
            meta?.currency === 'KES' ||
            meta?.provider === 'CROSSMINT' ||
            meta?.provider === 'PAYSAFE' ||
            meta?.provider === 'MPESA' ||
            meta?.provider === 'KOPOKOPO'
          ) {
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
   * Returns unified wallet snapshot with BOTH Real Cash ($ USDC) and Demo Practice (PTS)
   */
  async getBalance(userId: string) {
    try {
      const [cash, points] = await Promise.all([
        this.getRealCash(userId),
        this.getDemoPoints(userId),
      ]);

      const withdrawableUsdc = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);

      return {
        // Demo Practice Coins
        balance: points.balance,
        locked: points.locked,
        // Real Cash ($ USDC)
        cashUsdc: cash.balance,
        lockedCashUsdc: cash.locked,
        withdrawableUsdc,
        // Backwards compatibility aliases
        cashEur: cash.balance,
        lockedCashEur: cash.locked,
        withdrawableEur: withdrawableUsdc,
        remainingRolloverEur: 0,
        currency: 'USDC',
        minDepositUsdc: MIN_DEPOSIT_USDC,
        maxDepositUsdc: MAX_DEPOSIT_USDC,
        minWithdrawalUsdc: MIN_WITHDRAWAL_USDC,
        maxWithdrawalUsdc: MAX_WITHDRAWAL_USDC,
        minDepositEur: MIN_DEPOSIT_USDC,
        maxDepositEur: MAX_DEPOSIT_USDC,
        minWithdrawalEur: MIN_WITHDRAWAL_USDC,
        maxWithdrawalEur: MAX_WITHDRAWAL_USDC,
      };
    } catch (err) {
      this.log.error({ err, userId }, 'Error fetching wallet balance');
      return {
        balance: 10000,
        locked: 0,
        cashUsdc: 0.0,
        lockedCashUsdc: 0.0,
        withdrawableUsdc: 0.0,
        cashEur: 0.0,
        lockedCashEur: 0.0,
        withdrawableEur: 0.0,
        remainingRolloverEur: 0,
        currency: 'USDC',
        minDepositUsdc: MIN_DEPOSIT_USDC,
        maxDepositUsdc: MAX_DEPOSIT_USDC,
        minWithdrawalUsdc: MIN_WITHDRAWAL_USDC,
        maxWithdrawalUsdc: MAX_WITHDRAWAL_USDC,
        minDepositEur: MIN_DEPOSIT_USDC,
        maxDepositEur: MAX_DEPOSIT_USDC,
        minWithdrawalEur: MIN_WITHDRAWAL_USDC,
        maxWithdrawalEur: MAX_WITHDRAWAL_USDC,
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
        const curr = String(meta?.currency || '').toUpperCase();
        const provider = String(meta?.provider || '').toUpperCase();
        const isCash =
          curr === 'USDC' ||
          curr === 'USD' ||
          curr === 'EUR' ||
          curr === 'KES' ||
          provider === 'CROSSMINT' ||
          provider === 'MPESA' ||
          provider === 'KOPOKOPO' ||
          provider === 'PAYSAFE';
        const numAmount = Number(t.amount);
        const numBalance = Number(t.balance_after);

        return {
          id: t.id,
          amount: isCash ? numAmount / 100 : numAmount,
          balanceAfter: isCash ? numBalance / 100 : numBalance,
          reason: t.reason,
          metadata: meta || {},
          createdAt: t.created_at,
          currency: isCash ? 'USDC' : 'POINTS',
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Deposit real funds via Crossmint / Smart Custody gateway into the Real Cash ledger
   */
  async deposit(
    userId: string,
    amount: number,
    currency = 'USDC',
    paymentHandleToken?: string,
    method = 'CROSSMINT',
  ) {
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        throw new BadRequestException('Please enter a valid deposit amount greater than zero.');
      }

      const roundedAmount = Math.round(amount * 100) / 100;

      if (roundedAmount < MIN_DEPOSIT_USDC) {
        throw new BadRequestException(`Minimum deposit is ${MIN_DEPOSIT_USDC.toFixed(2)} USDC.`);
      }

      if (roundedAmount > MAX_DEPOSIT_USDC) {
        throw new BadRequestException(
          `The maximum deposit limit per transaction is $${MAX_DEPOSIT_USDC.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC.`,
        );
      }

      const normalizedCurrency = String(currency || 'USDC').toUpperCase();
      if (!['USDC', 'USD', 'EUR', 'GBP'].includes(normalizedCurrency)) {
        throw new BadRequestException(
          `Currency ${currency} is not currently supported for instant deposits.`,
        );
      }

      const isLive = process.env.NODE_ENV === 'production' || process.env.WALLET_MODE === 'real';
      if (isLive && (!paymentHandleToken || paymentHandleToken.startsWith('paysafe_token_'))) {
        throw new BadRequestException('A verified payment handle token is required for live deposits.');
      }

      const merchantRefNum = `dep-${userId.slice(0, 8)}-${Date.now()}`;
      let paymentId = `cm-auth-${Date.now()}`;

      // Process payment token if token is supplied
      if (paymentHandleToken && !paymentHandleToken.startsWith('paysafe_token_') && !paymentHandleToken.startsWith('crossmint_token_')) {
        try {
          const res = await this.paysafe.processPayment({
            merchantRefNum,
            amount: Math.round(roundedAmount * 100),
            currencyCode: currency,
            paymentHandleToken,
            description: `Playverzus.xyz ${currency} Competitive Deposit via ${method}`,
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
              currency: normalizedCurrency,
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
        body: `$${roundedAmount.toFixed(2)} USDC has been added to your Real Cash balance.`,
        type: 'wallet',
        url: '/cashier',
      });

      return {
        success: true,
        transactionId: txRecord?.id || `tx-${Date.now()}`,
        amount: roundedAmount,
        currency: 'USDC',
        paymentId,
        balanceAfter: newCashBalance,
        message: `Successfully deposited $${roundedAmount.toFixed(2)} USDC to your competitive wallet.`,
      };
    });
  }

  /**
   * Credit user's wallet from an authorized Crossmint deposit webhook or checkout event.
   * Enforces idempotency via orderId so no payment can ever be credited twice.
   */
  async creditCrossmintDeposit(
    userId: string,
    amount: number,
    currency = 'USD',
    orderId: string,
    rawEvent?: Record<string, any>,
  ) {
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
      // 1. Idempotency Check
      const { data: existingTx } = await this.supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('idempotency_key', `crossmint-${orderId}`)
        .maybeSingle();

      if (existingTx) {
        this.log.log(`Crossmint order ${orderId} already credited for user ${userId}. Skipping duplicate.`);
        return { success: true, duplicate: true, transactionId: existingTx.id };
      }

      const roundedAmount = Math.max(0.01, Math.round(amount * 100) / 100);
      const cash = await this.getRealCash(userId);
      const newCashBalance = Math.round((cash.balance + roundedAmount) * 100) / 100;
      cash.balance = newCashBalance;
      await this.setRealCash(userId, cash);

      const amountCents = Math.round(roundedAmount * 100);
      const balanceAfterCents = Math.round(newCashBalance * 100);

      const res = await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: amountCents,
          balance_after: balanceAfterCents,
          reason: `Deposit via Crossmint (${currency})`,
          idempotency_key: `crossmint-${orderId}`,
          metadata: {
            currency,
            provider: 'CROSSMINT',
            orderId,
            type: 'DEPOSIT',
            rawEvent: rawEvent || {},
          },
        })
        .select('id')
        .maybeSingle();

      await this.push.sendToUser(userId, {
        title: 'USDC Deposit Confirmed',
        body: `$${roundedAmount.toFixed(2)} ${currency} has been added to your Playverzus.xyz balance via Crossmint.`,
        type: 'wallet',
        url: '/cashier',
      });

      return {
        success: true,
        transactionId: res.data?.id || `tx-cm-${Date.now()}`,
        amount: roundedAmount,
        currency,
        balanceAfter: newCashBalance,
        message: `Successfully deposited $${roundedAmount.toFixed(2)} ${currency} via Crossmint.`,
      };
    });
  }

  /**
   * Record a failed Crossmint deposit attempt in transactions audit log
   * and alert the user with an in-app push notification.
   */
  async recordFailedCrossmintDeposit(
    userId: string,
    orderId: string,
    reason: string,
    rawEvent?: Record<string, any>,
  ) {
    try {
      await this.supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: 0,
          balance_after: 0,
          reason: `Deposit Failed via Crossmint: ${reason.slice(0, 80)}`,
          idempotency_key: `crossmint-failed-${orderId}`,
          metadata: {
            provider: 'CROSSMINT',
            orderId,
            type: 'DEPOSIT_FAILED',
            errorReason: reason,
            rawEvent: rawEvent || {},
          },
        });
    } catch {
      // Non-fatal if table insert fails
    }

    await this.push.sendToUser(userId, {
      title: 'Deposit Unsuccessful',
      body: `Your deposit could not be completed: ${reason}`,
      type: 'wallet',
      url: '/cashier',
    });
  }

  /**
   * Record an in-progress / initiated Crossmint deposit state
   * and alert the user with a real-time push notification.
   */
  async recordPendingCrossmintDeposit(
    userId: string,
    orderId: string,
    amount: number,
    status: string,
    rawEvent?: Record<string, any>,
  ) {
    this.log.log(`Crossmint deposit ${orderId} in progress for user ${userId} (status: ${status})`);

    await this.push.sendToUser(userId, {
      title: 'Deposit In Progress',
      body: `Your deposit of $${amount.toFixed(2)} is being processed on the blockchain.`,
      type: 'wallet',
      url: '/cashier',
    });
  }

  /**
   * Record an outbound wallet transfer update (such as an admin treasury payout or player withdrawal).
   */
  async recordTransferUpdate(
    transferId: string,
    status: string,
    txHash?: string,
    rawEvent?: Record<string, any>,
  ) {
    this.log.log(
      `Crossmint outbound transfer ${transferId} updated: status=${status}, txHash=${txHash || 'pending'}`,
    );

    // If metadata contains a user ID, notify them
    const userId = rawEvent?.metadata?.userId || rawEvent?.userId;
    if (userId) {
      const isConfirmed = status.toLowerCase().includes('confirmed') || status.toLowerCase().includes('succeeded');
      await this.push.sendToUser(userId, {
        title: isConfirmed ? 'Withdrawal Confirmed' : 'Withdrawal Processing',
        body: isConfirmed
          ? `Your withdrawal transfer has completed on-chain.${txHash ? ` Tx: ${txHash.slice(0, 10)}...` : ''}`
          : `Your withdrawal transfer is currently ${status}.`,
        type: 'wallet',
        url: '/cashier',
      });
    }
  }

  /**
   * Request a real cash withdrawal / payout from the Real Cash ledger
   */
  async requestPayout(userId: string, amount: number, methodInput: PayoutMethod | string) {
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
      // 1. Fast in-memory validation of amount boundaries
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        throw new BadRequestException('Please enter a valid withdrawal amount greater than zero.');
      }

      const roundedAmount = Math.round(amount * 100) / 100;

      if (roundedAmount < MIN_WITHDRAWAL_USDC) {
        throw new BadRequestException(`Minimum withdrawal is ${MIN_WITHDRAWAL_USDC.toFixed(2)} USDC.`);
      }

      if (roundedAmount > MAX_WITHDRAWAL_USDC) {
        throw new BadRequestException(
          `The maximum single withdrawal limit is $${MAX_WITHDRAWAL_USDC.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC. For higher volumes, please contact VIP support.`,
        );
      }

      // 2. Compliance & Security Check: Ensure user is not banned and KYC is not rejected
      try {
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('is_banned, ban_reason, kyc_status')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.is_banned) {
          throw new BadRequestException(
            `Withdrawal disabled: Account suspended (${profile.ban_reason || 'Compliance review pending'}). Please contact support.`,
          );
        }

        if (profile?.kyc_status === 'REJECTED') {
          throw new BadRequestException(
            'Withdrawal disabled: Identity verification was rejected. Please review your account details in Settings or contact compliance.',
          );
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
      }

      const cash = await this.getRealCash(userId);
      const available = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);

      if (roundedAmount > available) {
        throw new BadRequestException(
          `Insufficient available cash balance. Your current withdrawable balance is $${available.toFixed(2)} USDC.`,
        );
      }

      const methodObj = typeof methodInput === 'object' && methodInput !== null ? (methodInput as Record<string, any>) : null;
      const methodType = typeof methodInput === 'string' ? methodInput : (methodObj?.type || 'CROSSMINT');
      const destinationAddress = String(methodObj?.destinationAddress || methodObj?.address || '').trim();
      const requestedChain = String(methodObj?.chain || 'base').toLowerCase();
      const isExpress = methodObj?.expressPayout === true;
      const isDirectCryptoPayout = methodType === 'CROSSMINT_USDC' || Boolean(destinationAddress);
      const payoutFeeUsd = isDirectCryptoPayout ? (isExpress ? 1.50 : 1.00) : 0;
      const netTransferUsd = Math.round((roundedAmount - payoutFeeUsd) * 100) / 100;

      if (isDirectCryptoPayout && !/^0x[a-fA-F0-9]{40}$/.test(destinationAddress)) {
        throw new BadRequestException(
          'Enter a valid Base / EVM USDC wallet address starting with 0x (42 characters).',
        );
      }
      if (netTransferUsd < 1.0) {
        throw new BadRequestException(
          `Net transfer after fees must be at least 1.00 USDC (requested ${roundedAmount.toFixed(2)} - fee ${payoutFeeUsd.toFixed(2)}).`,
        );
      }

      // Execute live Crossmint Wallets API on-chain USDC transfer BEFORE deducting user balance
      let transferTxId: string | null = null;
      const crossmintServerKey = process.env.CROSSMINT_SERVER_API_KEY || '';
      const clientApiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY || '';
      const explicitTreasury = (process.env.CROSSMINT_TREASURY_ADDRESS || '').trim();
      const signerSecret = (process.env.CROSSMINT_SIGNER_SECRET || '').trim();
      const signerAddress = (process.env.CROSSMINT_SERVER_SIGNER_ADDRESS || '').trim();
      const { isProd: cmIsProd, baseUrl: apiBase } = resolveCrossmintEnv(
        crossmintServerKey,
        clientApiKey,
      );
      const resolvedChain = !cmIsProd && requestedChain === 'base' ? 'base-sepolia' : requestedChain;

      if (isDirectCryptoPayout) {
        if (!crossmintServerKey) {
          throw new ServiceUnavailableException(
            'Direct Base USDC payouts require CROSSMINT_SERVER_API_KEY with Wallets scopes. Use M-PESA payout or contact support.',
          );
        }

        const treasury = await resolveTreasuryAddress({
          explicitTreasury,
          apiKey: crossmintServerKey,
          chain: resolvedChain,
          baseUrl: apiBase,
          supabase: this.supabase,
          redis: this.redis,
          signerSecret,
          signerAddress,
          autoProvision: true,
        });

        if (!treasury.configured || !treasury.address) {
          throw new ServiceUnavailableException(
            treasury.error ||
              'Direct Base USDC payouts require Crossmint Wallets permissions and an initialized Treasury wallet. Use M-PESA payout or contact support.',
          );
        }

        const txResult = await executeCrossmintUsdcTransfer({
          baseUrl: apiBase,
          chain: resolvedChain,
          apiKey: crossmintServerKey,
          fromWalletAddress: treasury.address,
          toAddress: destinationAddress,
          amountUsdc: netTransferUsd,
          idempotencyKey: `payout-${userId}-${Date.now()}`,
          signerSecret,
        });

        if (!txResult.ok) {
          this.log.warn(
            { status: txResult.status, cmData: txResult.data, message: txResult.message, userId },
            'Crossmint payout rejected',
          );
          if (txResult.isAuthError) {
            throw new ServiceUnavailableException(
              'Crossmint Wallets transfer permission (wallets:transactions.create) is not enabled yet on the server key. Your balance was not deducted.',
            );
          }
          if (txResult.status >= 500) {
            throw new ServiceUnavailableException(
              'Could not reach Crossmint Wallets API right now. Your USDC balance was not deducted — please retry shortly.',
            );
          }
          throw new BadRequestException(
            txResult.message || 'USDC withdrawal transfer could not be executed. Your balance was not deducted.',
          );
        }

        transferTxId = txResult.txHash || txResult.txId || null;
      }

      // Deduct from Real Cash ledger only after external transfer acceptance
      const newCashBalance = Math.round((cash.balance - roundedAmount) * 100) / 100;
      cash.balance = newCashBalance;
      await this.setRealCash(userId, cash);

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
              currency: 'USDC',
              provider: 'CROSSMINT',
              method: methodInput,
              chain: resolvedChain,
              payoutFeeUsd,
              netTransferUsd,
              destinationAddress: destinationAddress || undefined,
              txHash: transferTxId || undefined,
              type: 'WITHDRAWAL',
            },
          });
      } catch {
        // Non-fatal if transactions table write fails
      }

      // Send instant push notification to user
      await this.push.sendToUser(userId, {
        title: 'Withdrawal Submitted',
        body: isDirectCryptoPayout
          ? `$${netTransferUsd.toFixed(2)} USDC (${payoutFeeUsd.toFixed(2)} fee) sent on ${resolvedChain.toUpperCase()} to ${destinationAddress.slice(0, 8)}...`
          : `Your payout of $${roundedAmount.toFixed(2)} USDC has been submitted for processing.`,
        type: 'wallet',
        url: '/cashier',
      });

      return {
        success: true,
        reference: transferTxId || `PAYOUT-${Date.now()}-${userId.slice(0, 6)}`,
        txHash: transferTxId,
        chain: resolvedChain,
        netTransferUsd,
        feeUsd: payoutFeeUsd,
        amount: roundedAmount,
        balanceAfter: newCashBalance,
        message: isDirectCryptoPayout
          ? `Sent $${netTransferUsd.toFixed(2)} USDC on ${resolvedChain.toUpperCase()} to ${destinationAddress} ($${payoutFeeUsd.toFixed(2)} network/payout fee).`
          : `Your withdrawal of $${roundedAmount.toFixed(2)} USDC has been submitted and is processing.`,
      };
    });
  }

  /**
   * Claim free Practice / Demo Coins (+1,000 PTS).
   * Enforces a 24-hour cooldown per user via Redis.
   */
  async claimDemoTokens(userId: string) {
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
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
    });
  }

  // ─── Match Escrow Operations (Real Cash & Demo Points) ────────────────────

  /**
   * Lock funds in escrow for a match (either Real Cash USDC or Demo PTS).
   * Idempotent per (matchId, userId) so retries never double-lock.
   */
  async lockMatchStake(userId: string, amount: number, matchId: string, isRealCash: boolean): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) return;
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
      const rounded = Math.round(amount * 100) / 100;
      const amountCents = Math.round(rounded * 100);

      // Idempotency guard via DB locks table (plus Redis fallback for unit tests)
      const lockMarkerKey = `escrow:lock:m:${matchId}:${userId}`;
      const existingMarker = await this.redis.get(lockMarkerKey);
      if (existingMarker) return;

      try {
        const { data: existingLock } = await this.supabase
          .from('locks')
          .select('id')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .eq('status', 'LOCKED')
          .maybeSingle();
        if (existingLock) {
          await this.redis.set(lockMarkerKey, '1', 60 * 60 * 24 * 30);
          return;
        }
      } catch {}

      if (isRealCash) {
        const cash = await this.getRealCash(userId);
        const available = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);
        if (available + 0.001 < rounded) {
          throw new BadRequestException(
            `Insufficient Real Cash balance: available $${available.toFixed(2)} USDC, required $${rounded.toFixed(2)} USDC`,
          );
        }
        cash.locked = Math.round((cash.locked + rounded) * 100) / 100;
        await this.setRealCash(userId, cash);
        await this.redis.set(lockMarkerKey, '1', 60 * 60 * 24 * 30);

        try {
          await this.supabase.from('locks').insert({
            user_id: userId,
            amount: amountCents, // in cents
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
        await this.redis.set(lockMarkerKey, '1', 60 * 60 * 24 * 30);
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
    });
  }

  /**
   * Release locked escrow without penalty when a match is cancelled before completion.
   */
  async unlockMatchStake(
    matchId: string,
    playerA: string | null,
    playerB: string | null,
    stakeAmount: number,
    isRealCash: boolean,
  ): Promise<void> {
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) return;
    return this.redis.withLock(`settle:${matchId}`, 15_000, async () => {
      const rounded = Math.round(stakeAmount * 100) / 100;
      const candidates = [playerA, playerB].filter((u): u is string => Boolean(u));

      if (isRealCash) {
        for (const uid of candidates) {
          const markerKey = `escrow:lock:m:${matchId}:${uid}`;
          let hasLock = Boolean(await this.redis.get(markerKey));
          if (!hasLock) {
            try {
              const { data: row } = await this.supabase
                .from('locks')
                .select('id')
                .eq('match_id', matchId)
                .eq('user_id', uid)
                .eq('status', 'LOCKED')
                .maybeSingle();
              hasLock = Boolean(row);
            } catch {}
          }
          if (!hasLock) continue;

          const cash = await this.getRealCash(uid);
          cash.locked = Math.max(0, Math.round((cash.locked - rounded) * 100) / 100);
          await this.setRealCash(uid, cash);
          await this.redis.del(markerKey);
        }

        try {
          await this.supabase
            .from('locks')
            .update({ status: 'REFUNDED' })
            .eq('match_id', matchId)
            .eq('status', 'LOCKED');
        } catch {}
      } else {
        try {
          await this.supabase.rpc('wallet_refund', { p_match_id: matchId });
        } catch {}
      }
    });
  }

  /**
   * Settle match escrow: release locks, deduct stakes, credit winner (minus tiered duel rake),
   * record balanced double-entry transactions, and log collected Admin rake.
   */
  async settleMatchStake(
    matchId: string,
    playerA: string,
    playerB: string,
    winnerId: string,
    stakeAmount: number,
    isRealCash: boolean,
  ): Promise<{ totalPot: number; winnerPrize: number; platformRake: number } | void> {
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) return;
    return this.redis.withLock(`settle:${matchId}`, 15_000, async () => {
      const roundedStake = Math.round(stakeAmount * 100) / 100;
      const totalPot = Math.round(roundedStake * 2 * 100) / 100;
      const rakeRate = getDuelRakeRate(roundedStake);
      const totalPrize = Math.round(totalPot * (1 - rakeRate) * 100) / 100;
      const platformRake = Math.round((totalPot - totalPrize) * 100) / 100;

      if (isRealCash) {
        const settledFlagKey = `escrow:settled:m:${matchId}`;
        if (await this.redis.get(settledFlagKey)) {
          return { totalPot, winnerPrize: totalPrize, platformRake };
        }
        try {
          const { data: existingTx } = await this.supabase
            .from('transactions')
            .select('id')
            .eq('idempotency_key', `match-prize-${matchId}`)
            .maybeSingle();
          if (existingTx) {
            await this.redis.set(settledFlagKey, '1', 60 * 60 * 24 * 90);
            return { totalPot, winnerPrize: totalPrize, platformRake };
          }
        } catch {}

        const [cashA, cashB] = await Promise.all([
          this.getRealCash(playerA),
          this.getRealCash(playerB),
        ]);
        cashA.locked = Math.max(0, Math.round((cashA.locked - roundedStake) * 100) / 100);
        cashA.balance = Math.max(0, Math.round((cashA.balance - roundedStake) * 100) / 100);
        cashB.locked = Math.max(0, Math.round((cashB.locked - roundedStake) * 100) / 100);
        cashB.balance = Math.max(0, Math.round((cashB.balance - roundedStake) * 100) / 100);

        const winnerCash = winnerId === playerA ? cashA : cashB;
        winnerCash.balance = Math.round((winnerCash.balance + totalPrize) * 100) / 100;

        await Promise.all([
          this.setRealCash(playerA, cashA),
          this.setRealCash(playerB, cashB),
          this.redis.set(settledFlagKey, '1', 60 * 60 * 24 * 90),
          this.redis.del(`escrow:lock:m:${matchId}:${playerA}`),
          this.redis.del(`escrow:lock:m:${matchId}:${playerB}`),
        ]);

        try {
          await this.supabase
            .from('locks')
            .update({ status: 'RELEASED' })
            .eq('match_id', matchId);
        } catch {}

        const stakeCents = Math.round(roundedStake * 100);
        const prizeCents = Math.round(totalPrize * 100);
        const loserId = winnerId === playerA ? playerB : playerA;
        const loserCash = winnerId === playerA ? cashB : cashA;

        // Balanced double-entry transactions (stakes debited + prize credited)
        try {
          await this.supabase.from('transactions').insert([
            {
              user_id: winnerId,
              amount: -stakeCents,
              balance_after: Math.round(Math.max(0, winnerCash.balance - totalPrize) * 100),
              reason: 'Duel Stake Escrow Settled',
              idempotency_key: `match-stake-${matchId}-${winnerId}`,
              metadata: { matchId, currency: 'USDC', type: 'MATCH_STAKE' },
            },
            {
              user_id: loserId,
              amount: -stakeCents,
              balance_after: Math.round(loserCash.balance * 100),
              reason: 'Duel Stake Loss',
              idempotency_key: `match-stake-${matchId}-${loserId}`,
              metadata: { matchId, currency: 'USDC', type: 'MATCH_STAKE' },
            },
            {
              user_id: winnerId,
              amount: prizeCents,
              balance_after: Math.round(winnerCash.balance * 100),
              reason: 'Match Prize Victory',
              idempotency_key: `match-prize-${matchId}`,
              metadata: {
                matchId,
                currency: 'USDC',
                type: 'MATCH_PRIZE',
                totalPotUsdc: totalPot,
                rakeRate,
                platformRakeUsdc: platformRake,
              },
            },
          ]);
        } catch {}

        try {
          await this.supabase.from('audit_log').insert({
            actor_id: winnerId,
            action: 'PLATFORM_RAKE_COLLECTED',
            entity_type: 'match',
            entity_id: matchId,
            metadata: {
              currency: 'USDC',
              source: 'DUEL',
              totalPotUsdc: totalPot,
              winnerPrizeUsdc: totalPrize,
              rakeRate,
              rakeUsdc: platformRake,
            },
          });
        } catch {}

        await this.push.sendToUser(winnerId, {
          title: 'Victory Payout Credited',
          body: `+$${totalPrize.toFixed(2)} USDC has been credited to your Real Cash wallet.`,
          type: 'wallet',
          url: '/cashier',
        });

        return { totalPot, winnerPrize: totalPrize, platformRake };
      } else {
        // Settle demo points using Postgres RPC
        try {
          await this.supabase.rpc('wallet_settle', {
            p_match_id: matchId,
            p_winner_id: winnerId,
            p_amount: Math.round(totalPrize),
          });
        } catch {}
        return { totalPot, winnerPrize: Math.round(totalPrize), platformRake };
      }
    });
  }

  // ─── Tournament Real Cash Escrow & Prize Settlement ─────────────────────

  async lockTournamentEntry(
    userId: string,
    entryFeeUsdc: number,
    tournamentId: string,
  ): Promise<void> {
    if (!Number.isFinite(entryFeeUsdc) || entryFeeUsdc <= 0) return;
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
      const rounded = Math.round(entryFeeUsdc * 100) / 100;
      const amountCents = Math.round(rounded * 100);
      const markerKey = `escrow:lock:t:${tournamentId}:${userId}`;
      if (await this.redis.get(markerKey)) return;

      try {
        const { data: existing } = await this.supabase
          .from('locks')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('user_id', userId)
          .eq('status', 'LOCKED')
          .maybeSingle();
        if (existing) {
          await this.redis.set(markerKey, '1', 60 * 60 * 24 * 30);
          return;
        }
      } catch {}

      const cash = await this.getRealCash(userId);
      const available = Math.max(0, Math.round((cash.balance - cash.locked) * 100) / 100);
      if (available + 0.001 < rounded) {
        throw new BadRequestException(
          `Insufficient Real Cash balance to join: available $${available.toFixed(2)} USDC, entry fee $${rounded.toFixed(2)} USDC.`,
        );
      }
      cash.locked = Math.round((cash.locked + rounded) * 100) / 100;
      await this.setRealCash(userId, cash);
      await this.redis.set(markerKey, '1', 60 * 60 * 24 * 30);

      try {
        await this.supabase.from('locks').insert({
          user_id: userId,
          amount: amountCents,
          tournament_id: tournamentId,
          status: 'LOCKED',
        });
      } catch {}
    });
  }

  async unlockTournamentEntry(
    userId: string,
    entryFeeUsdc: number,
    tournamentId: string,
  ): Promise<void> {
    if (!Number.isFinite(entryFeeUsdc) || entryFeeUsdc <= 0) return;
    return this.redis.withLock(`wallet:${userId}`, 10_000, async () => {
      const rounded = Math.round(entryFeeUsdc * 100) / 100;
      const markerKey = `escrow:lock:t:${tournamentId}:${userId}`;
      const cash = await this.getRealCash(userId);
      cash.locked = Math.max(0, Math.round((cash.locked - rounded) * 100) / 100);
      await this.setRealCash(userId, cash);
      await this.redis.del(markerKey);
      try {
        await this.supabase
          .from('locks')
          .update({ status: 'REFUNDED' })
          .eq('tournament_id', tournamentId)
          .eq('user_id', userId)
          .eq('status', 'LOCKED');
      } catch {}
    });
  }

  async settleTournamentRealCash(
    tournamentId: string,
    winners: Array<{ userId: string; placement: number; prizeUsdc: number }>,
    grossPoolUsdc: number,
  ): Promise<void> {
    return this.redis.withLock(`settle:tourn:${tournamentId}`, 15_000, async () => {
      const settledKey = `escrow:settled:t:${tournamentId}`;
      if (await this.redis.get(settledKey)) return;

      const { data: lockedRows } = await this.supabase
        .from('locks')
        .select('id, user_id, amount')
        .eq('tournament_id', tournamentId)
        .eq('status', 'LOCKED');

      const entrantIds = new Set<string>();
      for (const row of lockedRows ?? []) {
        const uid = String(row.user_id);
        const amtCents = Number(row.amount || 0);
        const amtUsdc = Math.round((amtCents / 100) * 100) / 100;
        if (amtUsdc <= 0) continue;

        entrantIds.add(uid);
        const cash = await this.getRealCash(uid);
        cash.locked = Math.max(0, Math.round((cash.locked - amtUsdc) * 100) / 100);
        cash.balance = Math.max(0, Math.round((cash.balance - amtUsdc) * 100) / 100);
        await this.setRealCash(uid, cash);
        await this.redis.del(`escrow:lock:t:${tournamentId}:${uid}`);

        try {
          await this.supabase.from('transactions').insert({
            user_id: uid,
            amount: -amtCents,
            balance_after: Math.round(cash.balance * 100),
            reason: 'Tournament Entry Settled',
            idempotency_key: `tourn-entry-${tournamentId}-${uid}`,
            metadata: { tournamentId, currency: 'USDC', type: 'TOURNAMENT_ENTRY' },
          });
        } catch {}
      }

      if (lockedRows && lockedRows.length > 0) {
        try {
          await this.supabase
            .from('locks')
            .update({ status: 'RELEASED' })
            .eq('tournament_id', tournamentId)
            .eq('status', 'LOCKED');
        } catch {}
      }

      let disbursedUsdc = 0;
      for (const w of winners) {
        if (!w.userId || w.prizeUsdc <= 0) continue;
        const prizeRounded = Math.round(w.prizeUsdc * 100) / 100;
        const prizeCents = Math.round(prizeRounded * 100);
        disbursedUsdc = Math.round((disbursedUsdc + prizeRounded) * 100) / 100;

        const cash = await this.getRealCash(w.userId);
        cash.balance = Math.round((cash.balance + prizeRounded) * 100) / 100;
        await this.setRealCash(w.userId, cash);

        try {
          await this.supabase.from('transactions').insert({
            user_id: w.userId,
            amount: prizeCents,
            balance_after: Math.round(cash.balance * 100),
            reason: `Tournament #${w.placement} Prize`,
            idempotency_key: `tourn-prize-${tournamentId}-${w.userId}`,
            metadata: { tournamentId, placement: w.placement, currency: 'USDC', type: 'TOURNAMENT_PRIZE' },
          });
        } catch {}

        await this.push.sendToUser(w.userId, {
          title: 'Tournament Prize Credited',
          body: `+$${prizeRounded.toFixed(2)} USDC awarded for finishing #${w.placement}!`,
          type: 'wallet',
          url: '/cashier',
        });
      }

      const rakeUsdc = Math.max(0, Math.round((grossPoolUsdc - disbursedUsdc) * 100) / 100);
      if (rakeUsdc > 0) {
        try {
          await this.supabase.from('audit_log').insert({
            actor_id: winners[0]?.userId || null,
            action: 'PLATFORM_RAKE_COLLECTED',
            entity_type: 'tournament',
            entity_id: tournamentId,
            metadata: {
              currency: 'USDC',
              source: 'TOURNAMENT',
              grossPoolUsdc,
              disbursedUsdc,
              rakeUsdc,
              entrants: entrantIds.size,
            },
          });
        } catch {}
      }

      await this.redis.set(settledKey, '1', 60 * 60 * 24 * 90);
    });
  }

  getPaysafeConfig() {
    return {
      ...this.paysafe.getPublicConfig(),
      provider: 'CROSSMINT',
      currency: 'USDC',
      minDepositUsdc: MIN_DEPOSIT_USDC,
      maxDepositUsdc: MAX_DEPOSIT_USDC,
      minWithdrawalUsdc: MIN_WITHDRAWAL_USDC,
      maxWithdrawalUsdc: MAX_WITHDRAWAL_USDC,
      minDepositEur: MIN_DEPOSIT_USDC,
      maxDepositEur: MAX_DEPOSIT_USDC,
      minWithdrawalEur: MIN_WITHDRAWAL_USDC,
      maxWithdrawalEur: MAX_WITHDRAWAL_USDC,
      supportedCurrencies: ['USDC', 'USD', 'EUR', 'GBP'],
    };
  }
}
