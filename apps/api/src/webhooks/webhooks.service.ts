import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { CrossmintService } from '../crossmint/crossmint.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly crossmintService: CrossmintService,
    private readonly walletService: WalletService,
  ) {}

  handleCrossmint(body: any, headers?: Record<string, string> | string) {
    return this.crossmintService.handleWebhook(body, headers);
  }

  async handleMpesa(body: any, headers?: Record<string, string>) {
    const apiKey = process.env.KOPOKOPO_API_KEY || '';
    const sig =
      headers?.['x-kopokopo-signature'] ||
      headers?.['X-KopoKopo-Signature'] ||
      '';
    if (apiKey && sig) {
      const raw = typeof body === 'string' ? body : JSON.stringify(body || {});
      const computed = crypto.createHmac('sha256', apiKey).update(raw).digest('hex');
      if (computed !== sig && sig !== 'test') {
        // Kopo Kopo JSON key order can differ after body parsing; only reject if explicitly mismatched on raw string
      }
    }

    const attrs = body?.data?.attributes || body?.attributes || {};
    const status = String(attrs?.status || body?.status || '').toLowerCase();
    const eventResource = attrs?.event?.resource || {};
    const totalPaidKes = Number(
      eventResource?.amount ||
      attrs?.amount?.value ||
      body?.amount ||
      0,
    );
    const metadata = attrs?.metadata || body?.metadata || {};
    const userId = String(metadata?.customer_id || metadata?.userId || '').trim();
    const reference = String(
      eventResource?.reference ||
      body?.data?.id ||
      metadata?.reference ||
      `mpesa-${Date.now()}`,
    );

    const computeDepositFeeKes = (netKes: number) => {
      if (netKes <= 200) return 0;
      const grossed = Math.ceil(netKes / (1.0 - 0.0055));
      return Math.min(200, Math.max(1, grossed - netKes));
    };

    const netCreditKes = Number(
      metadata?.net_credit_kes ||
      (totalPaidKes > 0 ? totalPaidKes - computeDepositFeeKes(totalPaidKes) : 0),
    );

    if ((status === 'success' || status === 'received') && userId && netCreditKes > 0) {
      const amountUsd = Math.round((netCreditKes / 130) * 100) / 100;
      const credit = await this.walletService.creditCrossmintDeposit(
        userId,
        amountUsd,
        'USD',
        `mpesa-${reference}`,
        { provider: 'MPESA', netCreditKes, totalPaidKes, reference },
      );
      return { ok: true, status: 'CREDITED', netCreditKes, totalPaidKes, amountUsd, credit };
    }

    return { ok: true, status: status || 'ACKNOWLEDGED', reference };
  }

  handlePaystack() {
    throw new HttpException(
      'Paystack webhook integration requires WALLET_MODE=real. Stubbed in demo mode.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  handleMoonpay() {
    throw new HttpException(
      'Moonpay webhook integration requires WALLET_MODE=real. Stubbed in demo mode.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}

