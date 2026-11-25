import {
  Injectable,
  Logger,
  Optional,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { WalletService } from '../wallet/wallet.service';
import { RedisService } from '../redis/redis.service';

export interface CrossmintOrderResult {
  success: boolean;
  orderId: string;
  clientSecret?: string | null;
  checkoutUrl: string;
  amount: number;
  currency: string;
}

export interface CrossmintDepositWalletInfo {
  address: string;
  chain: string;
  networkLabel: string;
  asset: 'USDC';
  tokenContract: string;
  locator: string;
  minDepositUsdc: number;
  depositFeeUsdc: number;
  environment: 'production' | 'staging';
  treasuryConfigured: boolean;
  noKybRequired: boolean;
  qrPayload: string;
}

export interface CrossmintTreasuryWalletStatus {
  configured: boolean;
  environment: 'production' | 'staging';
  chain: string;
  address: string | null;
  onChainUsdcBalance: number | null;
  explorerUrl: string | null;
  status: 'CONNECTED' | 'AWAITING_API_SCOPE' | 'NOT_CONFIGURED' | 'ERROR';
  note: string;
}

const BASE_MAINNET_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BASE_SEPOLIA_USDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
const MIN_DIRECT_USDC_DEPOSIT = 5.0;

const PROD_ALLOWED_CHAINS = new Set([
  'base',
  'polygon',
  'arbitrum',
  'optimism',
  'ethereum',
]);
const STAGING_ALLOWED_CHAINS = new Set([
  'base-sepolia',
  'polygon-amoy',
  'optimism-sepolia',
  'arbitrum-sepolia',
  'ethereum-sepolia',
  'sepolia',
]);

@Injectable()
export class CrossmintService {
  private readonly log = new Logger(CrossmintService.name);
  private readonly serverApiKey = process.env.CROSSMINT_SERVER_API_KEY || '';
  private readonly clientApiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY || '';
  private readonly webhookSecret = process.env.CROSSMINT_WEBHOOK_SECRET || '';
  private readonly treasuryAddress = (
    process.env.CROSSMINT_TREASURY_ADDRESS || 'playverzus_master_treasury'
  ).trim();
  private readonly isProd = CrossmintService.resolveIsProd(
    this.serverApiKey,
    this.clientApiKey,
  );
  private readonly baseUrl = this.isProd
    ? 'https://www.crossmint.com/api'
    : 'https://staging.crossmint.com/api';
  private readonly defaultChain = this.isProd ? 'base' : 'base-sepolia';
  private readonly supabase: TypedSupabaseClient;
  private readonly redis: RedisService;

  constructor(
    private readonly walletService: WalletService,
    @Optional() redis?: RedisService,
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
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  static resolveIsProd(serverKey = '', clientKey = ''): boolean {
    const explicitEnv = (process.env.CROSSMINT_ENVIRONMENT || '').trim().toLowerCase();
    if (
      explicitEnv === 'staging' ||
      serverKey.startsWith('sk_staging_') ||
      clientKey.startsWith('ck_staging_')
    ) {
      return false;
    }
    return Boolean(
      serverKey.startsWith('sk_production_') ||
        clientKey.startsWith('ck_production_') ||
        explicitEnv === 'production' ||
        process.env.WALLET_MODE === 'live' ||
        process.env.NODE_ENV === 'production',
    );
  }

  isTreasuryConfigured(): boolean {
    return Boolean(
      this.treasuryAddress &&
        this.treasuryAddress !== 'playverzus_master_treasury',
    );
  }

  getConfig() {
    const treasuryConfigured = this.isTreasuryConfigured();
    return {
      clientApiKey: this.clientApiKey,
      environment: this.isProd ? 'production' : 'staging',
      defaultChain: this.defaultChain,
      treasuryConfigured,
      treasuryAddress: treasuryConfigured ? this.treasuryAddress : null,
      directUsdcDepositAvailable: Boolean(this.serverApiKey),
      supportedCurrencies: ['USD', 'USDC', 'EUR', 'KES'],
      supportedMethods: ['usdc-base', 'card', 'apple-pay', 'google-pay'],
    };
  }

  /**
   * Reads the live on-chain Base USDC balance of the configured Admin Treasury wallet
   * from Crossmint Wallets API without failing the Treasury report if scopes are pending.
   */
  async getTreasuryWalletStatus(): Promise<CrossmintTreasuryWalletStatus> {
    const environment: 'production' | 'staging' = this.isProd ? 'production' : 'staging';
    const configured = this.isTreasuryConfigured();
    const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(this.treasuryAddress);
    const explorerUrl = configured && isEvmAddress
      ? (this.isProd
          ? `https://basescan.org/address/${this.treasuryAddress}`
          : `https://sepolia.basescan.org/address/${this.treasuryAddress}`)
      : null;

    if (!configured) {
      return {
        configured: false,
        environment,
        chain: this.defaultChain,
        address: null,
        onChainUsdcBalance: null,
        explorerUrl: null,
        status: 'NOT_CONFIGURED',
        note: 'Set CROSSMINT_TREASURY_ADDRESS in Render after creating your Treasury wallet in Crossmint Console.',
      };
    }

    if (!this.serverApiKey) {
      return {
        configured: true,
        environment,
        chain: this.defaultChain,
        address: this.treasuryAddress,
        onChainUsdcBalance: null,
        explorerUrl,
        status: 'AWAITING_API_SCOPE',
        note: 'CROSSMINT_SERVER_API_KEY is not configured in the API environment.',
      };
    }

    try {
      const endpoint = `${this.baseUrl}/2025-06-09/wallets/${encodeURIComponent(this.treasuryAddress)}/balances?tokens=usdc&chains=${encodeURIComponent(this.defaultChain)}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.serverApiKey,
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          configured: true,
          environment,
          chain: this.defaultChain,
          address: this.treasuryAddress,
          onChainUsdcBalance: null,
          explorerUrl,
          status: 'AWAITING_API_SCOPE',
          note: 'Enable wallets.read / wallets:balances.read scopes on your Crossmint server API key.',
        };
      }

      if (!res.ok) {
        return {
          configured: true,
          environment,
          chain: this.defaultChain,
          address: this.treasuryAddress,
          onChainUsdcBalance: null,
          explorerUrl,
          status: 'ERROR',
          note: `Crossmint balances query returned HTTP ${res.status}.`,
        };
      }

      const payload = (await res.json().catch(() => null)) as any;
      const onChainUsdcBalance = this.parseUsdcBalancePayload(payload);
      return {
        configured: true,
        environment,
        chain: this.defaultChain,
        address: this.treasuryAddress,
        onChainUsdcBalance,
        explorerUrl,
        status: 'CONNECTED',
        note: 'Live on-chain Base USDC balance fetched from Crossmint Wallets API.',
      };
    } catch (err: any) {
      this.log.warn({ err: err?.message }, 'Crossmint Treasury balance lookup timed out or failed');
      return {
        configured: true,
        environment,
        chain: this.defaultChain,
        address: this.treasuryAddress,
        onChainUsdcBalance: null,
        explorerUrl,
        status: 'ERROR',
        note: 'Could not reach Crossmint Wallets API right now; ledger figures shown from DB/Redis.',
      };
    }
  }

  private parseUsdcBalancePayload(payload: any): number {
    if (!payload) return 0;
    const list: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.balances)
      ? payload.balances
      : Array.isArray(payload.data)
      ? payload.data
      : [payload];

    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const sym = String(item.symbol || item.token || '').toLowerCase();
      if (sym && sym !== 'usdc') continue;

      const chainBal = item.balances?.[this.defaultChain];
      const candidate =
        item.amount ??
        (typeof chainBal === 'object' ? chainBal?.amount : chainBal) ??
        item.balance ??
        null;
      if (candidate !== null && candidate !== undefined) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) {
          return Math.max(0, Math.round(parsed * 100) / 100);
        }
      }
      if (item.rawAmount !== undefined) {
        const raw = Number(item.rawAmount);
        const decimals = Number(item.decimals ?? 6);
        if (Number.isFinite(raw)) {
          return Math.max(0, Math.round((raw / Math.pow(10, decimals)) * 100) / 100);
        }
      }
    }
    return 0;
  }

  /**
   * Provisions or retrieves the user's dedicated Crossmint EVM deposit wallet (No-KYB tier).
   * Uses Crossmint Wallets API 2025-06-09 custodial MPC wallet (`type: "mpc"`) so deposits
   * require no passkey setup and can be reconciled/swept by the server.
   */
  async getOrProvisionDepositWallet(
    userId: string,
    email?: string,
  ): Promise<CrossmintDepositWalletInfo> {
    if (!this.serverApiKey) {
      throw new ServiceUnavailableException(
        'Direct USDC deposits are not enabled yet (missing CROSSMINT_SERVER_API_KEY). Use M-PESA in the meantime.',
      );
    }

    const existingAddress = await this.findCachedUserWalletAddress(userId);
    if (existingAddress) {
      return this.formatDepositWalletInfo(existingAddress, userId);
    }

    const ownerLocator = `userId:${userId}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': this.serverApiKey,
    };

    // 1. Check if Crossmint already has a wallet for this owner
    for (const locator of [
      `${ownerLocator}:evm`,
      `${ownerLocator}:evm-mpc-wallet`,
      `${ownerLocator}:evm-smart-wallet`,
      ...(email ? [`email:${email}:evm`] : []),
    ]) {
      try {
        const lookup = await fetch(
          `${this.baseUrl}/2025-06-09/wallets/${encodeURIComponent(locator)}`,
          { method: 'GET', headers },
        );
        if (lookup.ok) {
          const found = (await lookup.json().catch(() => ({}))) as Record<string, any>;
          if (typeof found?.address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(found.address)) {
            await this.persistUserWalletMapping(userId, found.address, found);
            return this.formatDepositWalletInfo(found.address, userId);
          }
        }
      } catch {
        // Continue to creation attempt
      }
    }

    // 2. Provision a new EVM custodial MPC wallet under the Wallets API (No KYB required)
    const createBody: Record<string, unknown> = {
      chainType: 'evm',
      type: 'mpc',
      owner: ownerLocator,
      alias: `pvz_${userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)}`,
    };

    let response = await fetch(`${this.baseUrl}/2025-06-09/wallets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createBody),
    });
    let data = (await response.json().catch(() => ({}))) as Record<string, any>;

    // Fallback to smart wallet with server signer if configured and mpc was rejected
    const signerAddr = (process.env.CROSSMINT_SERVER_SIGNER_ADDRESS || '').trim();
    if (!response.ok && response.status === 400 && signerAddr) {
      response = await fetch(`${this.baseUrl}/2025-06-09/wallets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chainType: 'evm',
          type: 'smart',
          owner: ownerLocator,
          config: {
            recoveryMethods: [{ type: 'server', address: signerAddr }],
          },
        }),
      });
      data = (await response.json().catch(() => ({}))) as Record<string, any>;
    }

    if (!response.ok || typeof data?.address !== 'string') {
      const apiMsg = String(data?.message || data?.error || '').trim();
      this.log.warn(
        { status: response.status, data, userId },
        'Crossmint Wallets API rejected wallet provisioning',
      );
      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException(
          'Crossmint Wallets permissions (wallets.create, wallets.read, wallets:transactions.read) are not enabled yet on the server API key. Enable Wallets scopes in Crossmint Console or use M-PESA.',
        );
      }
      throw new BadRequestException(
        apiMsg || 'Could not initialize your Base USDC deposit address right now.',
      );
    }

    await this.persistUserWalletMapping(userId, data.address, data);
    return this.formatDepositWalletInfo(data.address, userId);
  }

  /**
   * Manually polls Crossmint Wallets Transactions API for incoming Base USDC transfers
   * to the player's deposit address and credits any confirmed >= 5 USDC deposits idempotently.
   */
  async syncDepositWallet(userId: string, email?: string) {
    const wallet = await this.getOrProvisionDepositWallet(userId, email);
    const headers = {
      Accept: 'application/json',
      'X-API-KEY': this.serverApiKey,
    };

    const res = await fetch(
      `${this.baseUrl}/2025-06-09/wallets/${encodeURIComponent(wallet.address)}/transactions`,
      { method: 'GET', headers },
    );
    const body = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new ServiceUnavailableException(
          'Crossmint server key needs wallets:transactions.read scope to sync deposits manually.',
        );
      }
      throw new BadRequestException(
        String(body?.message || 'Unable to check blockchain transactions right now.'),
      );
    }

    const rows: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.transactions)
        ? body.transactions
        : Array.isArray(body?.data)
          ? body.data
          : [];

    let newlyCreditedCount = 0;
    let totalCreditedUsdc = 0;
    const underMinimumDetected: number[] = [];

    for (const tx of rows) {
      const normalized = this.extractInboundUsdcFromEvent(tx, wallet.address);
      if (!normalized) continue;

      if (normalized.amountUsdc < MIN_DIRECT_USDC_DEPOSIT) {
        underMinimumDetected.push(normalized.amountUsdc);
        continue;
      }

      const creditRes = await this.walletService.creditCrossmintDeposit(
        userId,
        normalized.amountUsdc,
        'USDC',
        normalized.idempotencyRef,
        {
          rail: 'CROSSMINT_WALLET_DIRECT',
          chain: normalized.chain,
          walletAddress: wallet.address,
          txId: normalized.txHash,
          source: 'manual_sync',
        },
      );

      if (!creditRes?.duplicate) {
        newlyCreditedCount++;
        totalCreditedUsdc = Math.round((totalCreditedUsdc + normalized.amountUsdc) * 100) / 100;
        await this.trySweepToTreasury(wallet.address, normalized.chain, normalized.amountUsdc);
      }
    }

    return {
      ok: true,
      walletAddress: wallet.address,
      chain: wallet.chain,
      newlyCreditedCount,
      totalCreditedUsdc,
      underMinimumDetected,
      message:
        newlyCreditedCount > 0
          ? `Credited ${totalCreditedUsdc.toFixed(2)} USDC from ${newlyCreditedCount} confirmed Base transfer(s).`
          : underMinimumDetected.length > 0
            ? `Found transfer(s) under the ${MIN_DIRECT_USDC_DEPOSIT.toFixed(2)} USDC minimum (${underMinimumDetected.map((v) => `${v.toFixed(2)} USDC`).join(', ')}). Minimum deposit is 5.00 USDC.`
            : 'No new confirmed Base USDC deposits found yet. Transfers usually confirm in ~10–30 seconds.',
    };
  }

  /**
   * Create a Card / Apple Pay Checkout deposit session via Crossmint Orders API.
   * Requires merchant KYB + Order Form in production (unlike Direct USDC Wallets above).
   */
  async createDepositOrder(
    userId: string,
    email?: string,
    amount?: number,
    currency = 'USD',
  ): Promise<CrossmintOrderResult> {
    const netCreditUsd = Math.round(Number(amount) * 100) / 100;
    if (isNaN(netCreditUsd) || netCreditUsd < MIN_DIRECT_USDC_DEPOSIT) {
      throw new BadRequestException('Minimum Crossmint deposit amount is 5.00 USDC');
    }
    if (netCreditUsd > 2000) {
      throw new BadRequestException('Maximum single Crossmint deposit amount is $2,000.00 USD');
    }

    if (!this.serverApiKey) {
      throw new ServiceUnavailableException(
        'Card Checkout is not configured yet. Use Direct USDC (Base) deposit or M-PESA.',
      );
    }

    // Customer pays Crossmint processing fee upfront (3.5% + $0.30, min $0.50)
    const rawFee = netCreditUsd * 0.035 + 0.30;
    const feeUsd = Math.ceil(Math.max(0.50, rawFee) * 100) / 100;
    const numAmount = Math.round((netCreditUsd + feeUsd) * 100) / 100;

    let recipientAddress = this.isTreasuryConfigured() ? this.treasuryAddress : '';
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      try {
        const wallet = await this.getOrProvisionDepositWallet(userId, email);
        recipientAddress = wallet.address;
      } catch {
        recipientAddress = '';
      }
    }

    if (!recipientAddress) {
      throw new BadRequestException(
        'Card Checkout requires business KYB and a configured treasury wallet. Please use Direct USDC (Base) or M-PESA in the meantime.',
      );
    }

    const recipientEmail = email || `player_${userId.slice(0, 8)}@playverzus.xyz`;
    const orderPayload = {
      recipient: {
        email: recipientEmail,
        walletAddress: recipientAddress,
      },
      payment: {
        method: 'card',
        currency: currency.toLowerCase(),
      },
      lineItems: [
        {
          callData: {
            totalPrice: numAmount.toFixed(2),
          },
        },
      ],
      metadata: {
        userId,
        netCreditUsd: netCreditUsd.toFixed(2),
        feeUsd: feeUsd.toFixed(2),
        totalChargeUsd: numAmount.toFixed(2),
        platform: 'playverzus.xyz',
        type: 'DEPOSIT',
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/2022-06-09/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.serverApiKey,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = (await response.json().catch(() => ({}))) as any;
      if (response.ok && data?.orderId) {
        const checkoutOrigin = this.isProd
          ? 'https://www.crossmint.com'
          : 'https://staging.crossmint.com';
        return {
          success: true,
          orderId: data.orderId,
          clientSecret: data.clientSecret || null,
          checkoutUrl: data.payment?.url || `${checkoutOrigin}/checkout?orderId=${data.orderId}`,
          amount: numAmount,
          currency,
        };
      }
      this.log.warn({ status: response.status, data }, 'Crossmint Orders API rejected card checkout');
      const reason = String(data?.message || data?.error || '').trim();
      throw new BadRequestException(
        reason ||
          'Card Checkout requires Crossmint merchant KYB approval in production. Use Direct USDC (Base) deposit or M-PESA instead.',
      );
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.log.warn({ err }, 'Error contacting Crossmint Orders API');
      throw new ServiceUnavailableException(
        'Card Checkout is unavailable right now. Use Direct USDC (Base) deposit or M-PESA.',
      );
    }
  }

  /**
   * Verify Svix / Crossmint HMAC signature.
   * Supports `whsec_` base64 secrets, `svix-signature` / `webhook-signature` headers,
   * replay timestamp checking, and standard hex fallback.
   */
  verifySignature(rawBody: any, headers?: Record<string, string> | string): boolean {
    if (!this.webhookSecret) return true;

    const headerMap: Record<string, string> =
      typeof headers === 'string'
        ? { 'svix-signature': headers }
        : (headers || {});

    const signatureHeader =
      headerMap['svix-signature'] ||
      headerMap['webhook-signature'] ||
      headerMap['x-signature'] ||
      headerMap['crossmint-signature'] ||
      '';

    if (!signatureHeader) {
      this.log.warn('Missing webhook signature header');
      return false;
    }

    const msgId = headerMap['svix-id'] || headerMap['webhook-id'] || '';
    const timestamp = headerMap['svix-timestamp'] || headerMap['webhook-timestamp'] || '';
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

    try {
      if (this.webhookSecret.startsWith('whsec_')) {
        const secretKey = Buffer.from(this.webhookSecret.slice(6), 'base64');
        const signedContent = msgId && timestamp ? `${msgId}.${timestamp}.${bodyStr}` : bodyStr;

        const computedBase64 = crypto
          .createHmac('sha256', secretKey)
          .update(signedContent)
          .digest('base64');

        const signatures = signatureHeader.split(' ');
        const isValid = signatures.some((sig) => {
          const parts = sig.split(',');
          const sigValue = parts.length > 1 ? parts[1] : parts[0];
          return sigValue === computedBase64;
        });

        if (isValid) return true;
      }

      // Fallback: standard HMAC-SHA256 hex
      const hmacHex = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      return signatureHeader.includes(hmacHex);
    } catch (err) {
      this.log.error({ err }, 'Error during webhook signature verification');
      return false;
    }
  }

  /**
   * Verify and process incoming Crossmint Webhook events (Orders + No-KYB Wallets).
   */
  async handleWebhook(rawBody: any, headers?: Record<string, string> | string) {
    if (this.webhookSecret) {
      const isValid = this.verifySignature(rawBody, headers);
      if (!isValid) {
        this.log.warn('Crossmint webhook signature verification failed');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventType = payload.type || payload.event || 'unknown';
    this.log.log(`Received Crossmint webhook event: ${eventType}`);

    const isCompleted = [
      'orders.delivery.completed',
      'order.completed',
      'payment.succeeded',
      'checkout.succeeded',
    ].includes(eventType);

    const isFailed = [
      'orders.delivery.failed',
      'orders.payment.failed',
      'purchase.failed',
    ].includes(eventType);

    const isPending = [
      'orders.delivery.intiated',
      'orders.delivery.initiated',
      'orders.quote.created',
      'orders.updated',
    ].includes(eventType);

    const isInboundWalletTransfer = eventType === 'wallets.transfer.in';

    const isOutboundTransfer = [
      'wallets.experimental.tranfer.updated',
      'wallets.transfer.out',
      'wallets.transfer.transaction.update',
      'wallets.signer.exported',
    ].includes(eventType);

    // 1. Direct On-Chain USDC Deposit via Crossmint Smart / MPC Wallets (`wallets.transfer.in`)
    if (isInboundWalletTransfer) {
      return this.handleInboundWalletTransferWebhook(payload);
    }

    // 2. Failed Order Events
    if (isFailed) {
      const orderData = payload.data || payload;
      const userId = orderData.metadata?.userId || payload.metadata?.userId;
      const orderId = orderData.orderId || orderData.id || `cm-${Date.now()}`;
      const reason =
        orderData.error?.message ||
        orderData.payment?.errorMessage ||
        orderData.payment?.error ||
        orderData.message ||
        'Payment was declined by payment provider or bank.';

      this.log.warn(`Crossmint deposit failed for order ${orderId} (user: ${userId}): ${reason}`);

      if (userId) {
        await this.walletService.recordFailedCrossmintDeposit(userId, orderId, reason, payload);
      }

      return { received: true, status: 'FAILED', orderId, reason };
    }

    // 3. Pending / In-Progress Order Events
    if (isPending) {
      const orderData = payload.data || payload;
      const userId = orderData.metadata?.userId || payload.metadata?.userId;
      const orderId = orderData.orderId || orderData.id || `cm-${Date.now()}`;
      const amount = Number(
        orderData.payment?.amount ||
        orderData.amount ||
        orderData.lineItems?.[0]?.callData?.totalPrice ||
        orderData.totalPrice ||
        10,
      );

      this.log.log(`Crossmint deposit in progress for order ${orderId} (user: ${userId}) event: ${eventType}`);

      if (userId) {
        await this.walletService.recordPendingCrossmintDeposit(userId, orderId, amount, eventType, payload);
      }

      return { received: true, status: 'IN_PROGRESS', orderId, eventType };
    }

    // 4. Outbound Wallet Transfer Events (Withdrawals / Treasury Payouts)
    if (isOutboundTransfer) {
      const transferData = payload.data || payload;
      const transferId = transferData.id || transferData.transferId || `tx-${Date.now()}`;
      const status = transferData.status || eventType;
      const txHash =
        transferData.txHash ||
        transferData.hash ||
        transferData.transactionHash ||
        transferData.onChain?.txId;

      await this.walletService.recordTransferUpdate(transferId, status, txHash, payload);
      return { received: true, status: 'TRANSFER_UPDATED', transferId };
    }

    // 5. Completed Order Checkout Events
    if (!isCompleted) {
      return { received: true, ignored: true, eventType };
    }

    const orderData = payload.data || payload;
    const userId = orderData.metadata?.userId || payload.metadata?.userId;
    const orderId = orderData.orderId || orderData.id || `cm-${Date.now()}`;

    const amount = Number(
      orderData.metadata?.netCreditUsd ||
      payload.metadata?.netCreditUsd ||
      orderData.payment?.amount ||
      orderData.amount ||
      orderData.lineItems?.[0]?.callData?.totalPrice ||
      orderData.totalPrice ||
      10,
    );

    if (!userId) {
      this.log.warn({ payload }, 'Crossmint webhook missing userId in metadata');
      return { received: true, error: 'Missing userId in metadata' };
    }

    return this.walletService.creditCrossmintDeposit(userId, amount, 'USD', orderId, payload);
  }

  /**
   * Withdraw platform earnings from the Crossmint Treasury Wallet.
   */
  async withdrawTreasuryEarnings(params: {
    adminId: string;
    amount: number;
    mode: 'WALLET_TRANSFER' | 'BANK_OFFRAMP';
    chain?: string;
    destinationAddress?: string;
    paymentMethodId?: string;
    note?: string;
  }) {
    const numAmount = Math.round(Number(params.amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount < 10) {
      throw new BadRequestException('Minimum treasury withdrawal amount is $10.00 USDC.');
    }

    const chain = (params.chain || this.defaultChain).toLowerCase();
    const apiBase = this.baseUrl;

    if (params.mode === 'WALLET_TRANSFER') {
      const recipient = (params.destinationAddress || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        throw new BadRequestException(
          'A valid Base/EVM destination wallet address (0x...) is required for on-chain USDC transfer.',
        );
      }

      if (!this.serverApiKey || !this.isTreasuryConfigured()) {
        throw new ServiceUnavailableException(
          'Crossmint Treasury Wallet is not configured yet (set CROSSMINT_SERVER_API_KEY with Wallets scopes and CROSSMINT_TREASURY_ADDRESS).',
        );
      }

      const tokenLocator = `${chain}:usdc`;
      const endpoint = `${apiBase}/2025-06-09/wallets/${encodeURIComponent(this.treasuryAddress)}/tokens/${encodeURIComponent(tokenLocator)}/transfers`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.serverApiKey,
          'x-idempotency-key': `treasury-${params.adminId}-${Date.now()}`,
        },
        body: JSON.stringify({
          recipient,
          amount: numAmount.toFixed(2),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as any;
      if (!response.ok) {
        this.log.warn({ status: response.status, data }, 'Crossmint Treasury USDC Transfer failed');
        throw new BadRequestException(
          String(data?.message || data?.error || 'Crossmint rejected the treasury USDC transfer.'),
        );
      }

      return {
        success: true,
        mode: 'WALLET_TRANSFER' as const,
        transferId: data.id || data.transferId || `cm-tx-${Date.now()}`,
        txHash: data.txHash || data.onChain?.txId || null,
        explorerLink: data.explorerLink || data.onChain?.explorerLink || null,
        amount: numAmount,
        currency: 'USDC',
        chain,
        destination: recipient,
        status: data.status || 'SUBMITTED',
      };
    }

    // Mode 2: BANK_OFFRAMP via Crossmint Create Order API (`POST /api/2022-06-09/orders`)
    const paymentMethodId = (params.paymentMethodId || process.env.CROSSMINT_BANK_PAYMENT_METHOD_ID || '').trim();
    if (!paymentMethodId) {
      throw new BadRequestException(
        'A registered Crossmint Bank paymentMethodId is required for fiat bank off-ramp withdrawals (requires KYB).',
      );
    }

    if (!this.serverApiKey || !this.isTreasuryConfigured()) {
      throw new ServiceUnavailableException(
        'Bank off-ramp requires CROSSMINT_SERVER_API_KEY and CROSSMINT_TREASURY_ADDRESS.',
      );
    }

    const orderPayload = {
      payment: {
        method: chain,
        currency: 'usdc',
        payerAddress: this.treasuryAddress,
      },
      recipient: {
        paymentMethodId,
      },
      lineItems: [
        {
          currencyLocator: 'fiat:usd',
          executionParameters: {
            mode: 'exact-in',
            amount: numAmount.toFixed(2),
          },
        },
      ],
      metadata: {
        adminId: params.adminId,
        platform: 'playverzus.xyz',
        type: 'TREASURY_BANK_OFFRAMP',
        note: params.note || 'Owner Dividend Distribution',
      },
    };

    const response = await fetch(`${apiBase}/2022-06-09/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.serverApiKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await response.json().catch(() => ({}))) as any;
    if (!response.ok || (!data?.orderId && !data?.id)) {
      throw new BadRequestException(
        String(data?.message || data?.error || 'Bank off-ramp requires KYB & Order Form approval on Crossmint.'),
      );
    }

    return {
      success: true,
      mode: 'BANK_OFFRAMP' as const,
      transferId: data.orderId || data.id,
      txHash: null,
      explorerLink: null,
      amount: numAmount,
      currency: 'USD',
      chain,
      destination: paymentMethodId,
      status: data.phase || data.status || 'PROCESSING',
    };
  }

  // ─── Private Helpers for Direct Wallets & Inbound USDC Verification ────

  private formatDepositWalletInfo(
    address: string,
    _userId: string,
  ): CrossmintDepositWalletInfo {
    const chain = this.defaultChain;
    const tokenContract = this.isProd ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC;
    const chainId = this.isProd ? 8453 : 84532;
    return {
      address,
      chain,
      networkLabel: this.isProd ? 'Base Mainnet (USDC)' : 'Base Sepolia Testnet (USDC)',
      asset: 'USDC',
      tokenContract,
      locator: `${chain}:usdc`,
      minDepositUsdc: MIN_DIRECT_USDC_DEPOSIT,
      depositFeeUsdc: 0.0,
      environment: this.isProd ? 'production' : 'staging',
      treasuryConfigured: this.isTreasuryConfigured(),
      noKybRequired: true,
      qrPayload: `ethereum:${tokenContract}@${chainId}/transfer?address=${address}`,
    };
  }

  private async findCachedUserWalletAddress(userId: string): Promise<string | null> {
    try {
      const raw = await this.redis.get(`cm:user_wallet:${userId}`);
      if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) {
        return raw;
      }
    } catch {}

    try {
      const { data } = await this.supabase
        .from('audit_log')
        .select('metadata')
        .eq('action', 'CROSSMINT_WALLET_PROVISIONED')
        .eq('entity_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const addr = (data?.metadata as Record<string, any> | null)?.address;
      if (typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
        await this.redis.set(`cm:user_wallet:${userId}`, addr, 60 * 60 * 24 * 365);
        await this.redis.set(`cm:addr:${addr.toLowerCase()}`, userId, 60 * 60 * 24 * 365);
        return addr;
      }
    } catch {}

    return null;
  }

  private async persistUserWalletMapping(
    userId: string,
    address: string,
    rawWallet: Record<string, any>,
  ): Promise<void> {
    try {
      await this.redis.set(`cm:user_wallet:${userId}`, address, 60 * 60 * 24 * 365);
      await this.redis.set(`cm:addr:${address.toLowerCase()}`, userId, 60 * 60 * 24 * 365);
    } catch {}

    try {
      await this.supabase.from('audit_log').insert({
        actor_id: userId,
        action: 'CROSSMINT_WALLET_PROVISIONED',
        entity_type: 'crossmint_wallet',
        entity_id: userId,
        metadata: {
          address,
          chainType: rawWallet?.chainType || 'evm',
          type: rawWallet?.type || 'mpc',
          environment: this.isProd ? 'production' : 'staging',
        },
      });
    } catch {
      // Non-fatal if Supabase audit_log insert fails
    }
  }

  private async resolveUserIdFromTransferData(data: Record<string, any>): Promise<string | null> {
    const dest = data.destination || data.recipient || {};
    const owner = String(dest.owner || data.owner || '').trim();

    if (owner.startsWith('userId:')) {
      return owner.slice('userId:'.length).trim() || null;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) {
      return owner;
    }

    const addr = String(dest.address || '').trim().toLowerCase();
    if (addr) {
      try {
        const cachedUser = await this.redis.get(`cm:addr:${addr}`);
        if (cachedUser) return cachedUser;
      } catch {}

      try {
        const { data: logs } = await this.supabase
          .from('audit_log')
          .select('entity_id, metadata')
          .eq('action', 'CROSSMINT_WALLET_PROVISIONED')
          .order('created_at', { ascending: false })
          .limit(200);

        if (logs) {
          const hit = logs.find(
            (row: any) => String(row?.metadata?.address || '').toLowerCase() === addr,
          );
          if (hit?.entity_id) {
            await this.redis.set(`cm:addr:${addr}`, hit.entity_id, 60 * 60 * 24 * 365);
            return hit.entity_id;
          }
        }
      } catch {}
    }

    return null;
  }

  private extractInboundUsdcFromEvent(
    raw: Record<string, any>,
    expectedDestAddress?: string,
  ): {
    amountUsdc: number;
    chain: string;
    txHash: string;
    idempotencyRef: string;
  } | null {
    if (!raw || typeof raw !== 'object') return null;

    const status = String(raw.status || '').toLowerCase();
    if (status && status !== 'succeeded' && status !== 'confirmed' && status !== 'completed') {
      return null;
    }

    const eventType = String(raw.type || '').toLowerCase();
    const dest = raw.destination || raw.recipient || {};
    const destAddr = String(dest.address || '').toLowerCase();
    if (expectedDestAddress) {
      const normalizedExpected = expectedDestAddress.toLowerCase();
      // For /transactions listing: make sure this tx is inbound to our deposit address (not an outbound sweep!)
      if (destAddr && destAddr !== normalizedExpected) return null;
      if (!destAddr && eventType && !eventType.includes('transfer.in')) return null;
    }

    const token = raw.token || {};
    const chain = String(
      token.chain || dest.chain || raw.chain || this.defaultChain,
    ).toLowerCase();

    const allowedChains = this.isProd ? PROD_ALLOWED_CHAINS : STAGING_ALLOWED_CHAINS;
    if (!allowedChains.has(chain)) {
      return null;
    }

    const symbol = String(token.symbol || raw.symbol || '').toUpperCase();
    const locator = String(token.locator || '').toLowerCase();
    const contract = String(token.contractAddress || '').toLowerCase();
    const isUsdc =
      symbol === 'USDC' ||
      locator.endsWith(':usdc') ||
      contract === BASE_MAINNET_USDC ||
      (!this.isProd && contract === BASE_SEPOLIA_USDC);

    if (!isUsdc) return null;

    let amountNum = Number(token.amount ?? raw.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      const rawAmt = Number(token.rawAmount);
      const decimals = Number(token.decimals ?? 6);
      if (Number.isFinite(rawAmt) && rawAmt > 0) {
        amountNum = rawAmt / Math.pow(10, decimals);
      }
    }

    if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
    const rounded = Math.round(amountNum * 100) / 100;

    const txHash = String(raw.onChain?.txId || raw.txHash || raw.transactionHash || '').trim();
    const transferId = String(raw.transferId || raw.id || txHash).trim();
    if (!transferId) return null;

    return {
      amountUsdc: rounded,
      chain,
      txHash,
      idempotencyRef: `wallet-in-${transferId}`,
    };
  }

  private async handleInboundWalletTransferWebhook(payload: Record<string, any>) {
    const data = (payload.data || payload) as Record<string, any>;
    const normalized = this.extractInboundUsdcFromEvent(data);

    if (!normalized) {
      return {
        received: true,
        ignored: true,
        reason: 'Transfer is not a confirmed USDC deposit on a supported network.',
      };
    }

    if (normalized.amountUsdc < MIN_DIRECT_USDC_DEPOSIT) {
      this.log.warn(
        { transferId: normalized.idempotencyRef, amountUsdc: normalized.amountUsdc },
        'Inbound USDC deposit below minimum 5.00 USDC ignored',
      );
      return {
        received: true,
        ignored: true,
        reason: `Inbound USDC (${normalized.amountUsdc.toFixed(2)}) is below minimum ${MIN_DIRECT_USDC_DEPOSIT.toFixed(2)} USDC.`,
      };
    }

    const userId = await this.resolveUserIdFromTransferData(data);
    if (!userId) {
      this.log.warn({ data }, 'Inbound USDC webhook could not resolve target userId');
      return { received: true, error: 'Could not map deposit wallet to a userId' };
    }

    const credit = await this.walletService.creditCrossmintDeposit(
      userId,
      normalized.amountUsdc,
      'USDC',
      normalized.idempotencyRef,
      {
        rail: 'CROSSMINT_WALLET_DIRECT',
        chain: normalized.chain,
        txId: normalized.txHash,
        sender: data.sender?.address || null,
        recipient: (data.destination || data.recipient)?.address || null,
      },
    );

    const destAddr = String((data.destination || data.recipient)?.address || '').trim();
    if (!credit?.duplicate && destAddr) {
      await this.trySweepToTreasury(destAddr, normalized.chain, normalized.amountUsdc);
    }

    return {
      received: true,
      status: 'CREDITED',
      userId,
      amountUsdc: normalized.amountUsdc,
      chain: normalized.chain,
      credit,
    };
  }

  private async trySweepToTreasury(
    userWalletAddress: string,
    chain: string,
    amountUsdc: number,
  ): Promise<void> {
    if (!this.isTreasuryConfigured() || !/^0x[a-fA-F0-9]{40}$/.test(this.treasuryAddress)) {
      return;
    }
    if (userWalletAddress.toLowerCase() === this.treasuryAddress.toLowerCase()) {
      return;
    }

    try {
      const tokenLocator = `${chain}:usdc`;
      const endpoint = `${this.baseUrl}/2025-06-09/wallets/${encodeURIComponent(userWalletAddress)}/tokens/${encodeURIComponent(tokenLocator)}/transfers`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.serverApiKey,
          'x-idempotency-key': `sweep-${userWalletAddress}-${Date.now()}`,
        },
        body: JSON.stringify({
          recipient: this.treasuryAddress,
          amount: amountUsdc.toFixed(2),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.log.warn(
          { status: res.status, body, userWalletAddress, chain },
          'Treasury sweep skipped/deferred (manual or batch sweep available in Crossmint Console)',
        );
      }
    } catch (err) {
      this.log.warn({ err, userWalletAddress }, 'Treasury sweep deferred');
    }
  }
}
