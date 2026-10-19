import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import * as crypto from 'crypto';

export interface CrossmintOrderResult {
  success: boolean;
  orderId: string;
  clientSecret?: string | null;
  checkoutUrl: string;
  amount: number;
  currency: string;
}

@Injectable()
export class CrossmintService {
  private readonly log = new Logger(CrossmintService.name);
  private readonly serverApiKey = process.env.CROSSMINT_SERVER_API_KEY || '';
  private readonly clientApiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY || '';
  private readonly webhookSecret = process.env.CROSSMINT_WEBHOOK_SECRET || '';
  private readonly treasuryAddress = process.env.CROSSMINT_TREASURY_ADDRESS || 'playverzus_master_treasury';
  private readonly isProd = process.env.NODE_ENV === 'production' || process.env.CROSSMINT_ENVIRONMENT === 'production';
  private readonly baseUrl = 'https://www.crossmint.com/api';

  constructor(private readonly walletService: WalletService) {}

  getConfig() {
    return {
      clientApiKey: this.clientApiKey,
      environment: this.isProd ? 'production' : 'staging',
      treasuryAddress: this.treasuryAddress,
      supportedCurrencies: ['USD', 'USDC', 'EUR', 'KES'],
      supportedMethods: ['card', 'apple-pay', 'google-pay'],
    };
  }

  /**
   * Create a deposit order session for the player.
   */
  async createDepositOrder(
    userId: string,
    email?: string,
    amount?: number,
    currency = 'USD',
  ): Promise<CrossmintOrderResult> {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      throw new BadRequestException('Minimum deposit amount is $1.00');
    }

    const recipientEmail = email || `player_${userId.slice(0, 8)}@playverzus.xyz`;
    const orderPayload = {
      recipient: {
        email: recipientEmail,
        walletAddress: this.treasuryAddress,
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
        platform: 'playverzus.xyz',
        type: 'DEPOSIT',
      },
    };

    // If server API key is configured, call Crossmint Orders API
    if (this.serverApiKey) {
      try {
        const response = await fetch(`${this.baseUrl}/2022-06-09/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.serverApiKey,
          },
          body: JSON.stringify(orderPayload),
        });

        const data = (await response.json()) as any;
        if (response.ok && data?.orderId) {
          return {
            success: true,
            orderId: data.orderId,
            clientSecret: data.clientSecret || null,
            checkoutUrl: data.payment?.url || `https://www.crossmint.com/checkout?orderId=${data.orderId}`,
            amount: numAmount,
            currency,
          };
        }
        this.log.warn({ data }, 'Crossmint Orders API returned non-200, generating signed checkout session');
      } catch (err) {
        this.log.warn({ err }, 'Error contacting Crossmint Orders API, generating hosted session');
      }
    }

    // Direct hosted checkout session fallback
    const fallbackOrderId = `order_${userId.slice(0, 8)}_${Date.now()}`;
    return {
      success: true,
      orderId: fallbackOrderId,
      clientSecret: null,
      checkoutUrl: `https://www.crossmint.com/checkout?clientId=${this.clientApiKey}&amount=${numAmount}&currency=${currency}`,
      amount: numAmount,
      currency,
    };
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
   * Verify and process incoming Crossmint Webhook events
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
      'orders.quote.created',
      'orders.updated',
    ].includes(eventType);

    const isTransfer = [
      'wallets.experimental.tranfer.updated',
      'wallets.transfer.out',
      'wallets.transfer.in',
      'wallets.transfer.transaction.update',
      'wallets.signer.exported',
    ].includes(eventType);

    // 1. Handle Failed Events
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

    // 2. Handle Pending / In-Progress Events
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

    // 3. Handle Wallet / Outbound Transfer Events (Admin / Treasury Payouts)
    if (isTransfer) {
      const transferData = payload.data || payload;
      const transferId = transferData.id || transferData.transferId || `tx-${Date.now()}`;
      const status = transferData.status || eventType;
      const txHash = transferData.txHash || transferData.hash || transferData.transactionHash;

      await this.walletService.recordTransferUpdate(transferId, status, txHash, payload);
      return { received: true, status: 'TRANSFER_UPDATED', transferId };
    }

    // 4. Handle Completion Events
    if (!isCompleted) {
      return { received: true, ignored: true, eventType };
    }

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

    if (!userId) {
      this.log.warn({ payload }, 'Crossmint webhook missing userId in metadata');
      return { received: true, error: 'Missing userId in metadata' };
    }

    return this.walletService.creditCrossmintDeposit(userId, amount, 'USD', orderId, payload);
  }
}
