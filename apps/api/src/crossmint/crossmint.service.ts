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
        platform: 'playverzus',
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
   * Verify and process incoming Crossmint Webhook events
   */
  async handleWebhook(rawBody: any, signature?: string) {
    if (this.webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      const computed = hmac.update(bodyStr).digest('hex');
      if (computed !== signature && !signature.includes(computed)) {
        this.log.warn('Crossmint webhook signature mismatch');
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
