import {
  Body,
  Controller,
  Get,
  Optional,
  Post,
  Query,
  BadRequestException,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';

@Controller('mpesa')
export class V2MpesaController {
  private cachedOAuthToken: string | null = null;
  private cachedOAuthExpiry = 0;
  private activeGateway: 'kopokopo' | 'crossmint' =
    process.env.DEFAULT_PAYMENT_GATEWAY === 'crossmint' ? 'crossmint' : 'kopokopo';
  private readonly dailyWithdrawals = new Map<string, Array<{ ts: number; amountKes: number }>>();

  constructor(
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly walletService?: WalletService,
  ) {}

  private computeMpesaDepositFeeKes(netKes: number): number {
    if (netKes <= 200) return 0;
    const grossed = Math.ceil(netKes / (1.0 - 0.0055));
    return Math.min(200, Math.max(1, grossed - netKes));
  }

  private checkAndRecordDailyWithdrawal(userKey: string, amountKes: number) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recent = (this.dailyWithdrawals.get(userKey) || []).filter((e) => now - e.ts < dayMs);
    const usedKes = recent.reduce((sum, e) => sum + e.amountKes, 0);
    if (recent.length >= 3) {
      throw new BadRequestException('Daily withdrawal limit reached (maximum 3 M-PESA payouts per 24 hours).');
    }
    if (usedKes + amountKes > 150000) {
      throw new BadRequestException(
        `Daily withdrawal limit exceeded (KES 150,000/day max; remaining today: KES ${Math.max(0, 150000 - usedKes)}).`,
      );
    }
    return () => {
      recent.push({ ts: now, amountKes });
      this.dailyWithdrawals.set(userKey, recent);
    };
  }

  private getCrossmintReadiness() {
    const sk = process.env.CROSSMINT_SERVER_API_KEY || '';
    const ck = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY || '';
    const wh = process.env.CROSSMINT_WEBHOOK_SECRET || '';
    const serverKeyLive = sk.startsWith('sk_production_');
    const clientKeyLive = ck.startsWith('ck_production_');
    const isProd =
      serverKeyLive ||
      clientKeyLive ||
      process.env.CROSSMINT_ENVIRONMENT === 'production' ||
      process.env.NODE_ENV === 'production';
    return {
      configured: Boolean(sk && ck),
      mode: isProd ? 'production' : 'staging',
      serverKeyLive,
      clientKeyLive,
      webhookSecretConfigured: Boolean(wh),
    };
  }

  private async getPersistedGateway(): Promise<'kopokopo' | 'crossmint'> {
    try {
      const val = await this.redis?.get('platform:payment_gateway');
      if (val === 'crossmint' || val === 'kopokopo') {
        this.activeGateway = val;
      }
    } catch {}
    return this.activeGateway;
  }

  private async setPersistedGateway(mode: string): Promise<'kopokopo' | 'crossmint'> {
    const normalized = mode === 'crossmint' ? 'crossmint' : 'kopokopo';
    this.activeGateway = normalized;
    try {
      await this.redis?.set('platform:payment_gateway', normalized, 60 * 60 * 24 * 365);
    } catch {}
    return normalized;
  }

  private getKopoConfig() {
    const env = (process.env.KOPOKOPO_ENV || 'live').toLowerCase();
    const baseUrl =
      process.env.KOPOKOPO_BASE_URL ||
      (env === 'sandbox' ? 'https://sandbox.kopokopo.com' : 'https://api.kopokopo.com');
    return {
      baseUrl,
      clientId: process.env.KOPOKOPO_CLIENT_ID || '',
      clientSecret: process.env.KOPOKOPO_CLIENT_SECRET || '',
      apiKey: process.env.KOPOKOPO_API_KEY || '',
      tillNumber: process.env.KOPOKOPO_TILL_NUMBER || '',
      callbackUrl:
        process.env.KOPOKOPO_CALLBACK_URL ||
        'https://playverzus-api.onrender.com/api/webhooks/mpesa',
    };
  }

  private normalizeKenyaPhone(raw: unknown): string {
    let digits = String(raw || '').replace(/[^\d+]/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      digits = '+254' + digits.slice(1);
    } else if (digits.startsWith('254') && digits.length === 12) {
      digits = '+' + digits;
    } else if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
      digits = '+254' + digits;
    }
    return digits;
  }

  private async getKopoAccessToken(cfg: ReturnType<V2MpesaController['getKopoConfig']>): Promise<string> {
    if (this.cachedOAuthToken && Date.now() < this.cachedOAuthExpiry - 60_000) {
      return this.cachedOAuthToken;
    }
    const form = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'client_credentials',
    });
    const res = await fetch(`${cfg.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Mobile money OAuth failed');
    }
    this.cachedOAuthToken = String(data.access_token);
    this.cachedOAuthExpiry = Date.now() + Number(data.expires_in || 3600) * 1000;
    return this.cachedOAuthToken;
  }

  @Get('status')
  async getStatus(@Query('verify') verify?: string) {
    const cfg = this.getKopoConfig();
    const configured = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
    const shouldVerify = verify === '1';
    let oauthLive = false;
    let oauthError: string | null = null;
    if (configured && shouldVerify) {
      try {
        await this.getKopoAccessToken(cfg);
        oauthLive = true;
      } catch (e: any) {
        oauthError = e?.message || 'OAuth error';
      }
    }
    const activeGateway = await this.getPersistedGateway();
    const crossmint = this.getCrossmintReadiness();
    return {
      activeGateway,
      configured,
      mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
      tillConfigured: Boolean(cfg.tillNumber),
      ...(shouldVerify ? { oauthLive, ...(oauthError ? { oauthError } : {}) } : {}),
      kopokopo: {
        configured,
        mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        tillConfigured: Boolean(cfg.tillNumber),
        ...(shouldVerify ? { oauthLive, ...(oauthError ? { oauthError } : {}) } : {}),
      },
      crossmint,
    };
  }

  @Get('gateway')
  async getGateway(@Query('verify') verify?: string) {
    return this.getStatus(verify);
  }

  @Post('gateway')
  async setGateway(@Body() body: { activeGateway?: string }) {
    const activeGateway = await this.setPersistedGateway(body?.activeGateway || 'kopokopo');
    const cfg = this.getKopoConfig();
    const configured = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
    return {
      ok: true,
      activeGateway,
      kopokopo: {
        configured,
        mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        tillConfigured: Boolean(cfg.tillNumber),
      },
      crossmint: this.getCrossmintReadiness(),
    };
  }

  @Get('check-status')
  async checkStatus(@Query('location') loc?: string) {
    if (!loc) throw new BadRequestException('Missing payment location or id.');
    const cfg = this.getKopoConfig();
    try {
      const token = await this.getKopoAccessToken(cfg);
      const targetUrl = loc.startsWith('http')
        ? loc
        : `${cfg.baseUrl}/api/v1/incoming_payments/${loc}`;
      const statusRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = (await statusRes.json().catch(() => ({}))) as Record<string, any>;
      const attrs = json?.data?.attributes || {};
      const status = String(attrs.status || 'Pending');
      const metadata = attrs.metadata || {};

      // Idempotently credit the player's Real Cash wallet with exact netCreditKes upon Success
      if (status.toLowerCase() === 'success' && this.walletService) {
        const userId = String(metadata.customer_id || metadata.userId || '').trim();
        const rawPaidKes = Number(
          attrs?.event?.resource?.amount || attrs?.amount?.value || metadata?.total_charge_kes || 0,
        );
        const netCreditKes = Number(
          metadata?.net_credit_kes || (rawPaidKes > 0 ? rawPaidKes - this.computeMpesaDepositFeeKes(rawPaidKes) : 0),
        );
        const refId = String(
          attrs?.event?.resource?.reference || json?.data?.id || metadata?.reference || loc.split('/').pop(),
        );
        const netCreditUsdc = Number(metadata?.net_credit_usdc || 0);
        if (userId && netCreditKes > 0 && refId) {
          const netUsd =
            netCreditUsdc > 0
              ? Math.round(netCreditUsdc * 100) / 100
              : Math.round((netCreditKes / 130) * 100) / 100;
          await this.walletService.creditCrossmintDeposit(
            userId,
            netUsd,
            'USD',
            `mpesa-${refId}`,
            { provider: 'MPESA', netCreditKes, netCreditUsdc: netUsd, totalPaidKes: rawPaidKes, reference: refId },
          );
        }
      }

      return {
        status,
        event: attrs.event || null,
        metadata,
      };
    } catch (e: any) {
      throw new BadGatewayException(e?.message || 'Status query failed');
    }
  }

  @Post('stk-push')
  async stkPush(@Body() body: any) {
    const cfg = this.getKopoConfig();
    if (!cfg.clientId || !cfg.clientSecret || !cfg.tillNumber) {
      throw new ServiceUnavailableException(
        'Live M-PESA gateway requires KOPOKOPO_CLIENT_ID, KOPOKOPO_CLIENT_SECRET, and KOPOKOPO_TILL_NUMBER configured on the server.',
      );
    }
    const rawUsdc = Number(body?.amountUsdc || 0);
    const netCreditKes = Math.round(Number(body?.amountKes || (rawUsdc > 0 ? rawUsdc * 130 : 0)));
    const netCreditUsdc =
      rawUsdc > 0 ? Math.round(rawUsdc * 100) / 100 : Math.round((netCreditKes / 130) * 100) / 100;
    const phone = this.normalizeKenyaPhone(body?.phone);
    if (!netCreditKes || netCreditKes < 650 || netCreditUsdc < 5) {
      throw new BadRequestException('Minimum M-PESA deposit is USDC 5.00 (KES 650).');
    }
    if (netCreditKes > 250000) {
      throw new BadRequestException('Maximum single M-PESA deposit is KES 250,000.');
    }
    if (!/^\+254\d{9}$/.test(phone)) {
      throw new BadRequestException('Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).');
    }

    const feeKes = this.computeMpesaDepositFeeKes(netCreditKes);
    const totalChargeKes = netCreditKes + feeKes;

    const token = await this.getKopoAccessToken(cfg);
    const payload = {
      payment_channel: 'M-PESA STK Push',
      till_number: cfg.tillNumber,
      subscriber: {
        first_name: String(body?.firstName || 'Player').slice(0, 40),
        last_name: String(body?.lastName || 'Playverzus').slice(0, 40),
        phone_number: phone,
        email: body?.email || undefined,
      },
      amount: { currency: 'KES', value: totalChargeKes },
      metadata: {
        customer_id: String(body?.userId || ''),
        net_credit_usdc: String(netCreditUsdc),
        net_credit_kes: String(netCreditKes),
        fee_kes: String(feeKes),
        total_charge_kes: String(totalChargeKes),
        reference: `PVZ-${Date.now()}`,
      },
      _links: { callback_url: cfg.callbackUrl },
    };

    const stkRes = await fetch(`${cfg.baseUrl}/api/v1/incoming_payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (stkRes.status === 201 || stkRes.ok) {
      const location = stkRes.headers.get('location') || '';
      return {
        ok: true,
        status: 'STK_PUSH_SENT',
        location,
        amountKes: netCreditKes,
        netCreditUsdc,
        netCreditKes,
        feeKes,
        totalChargeKes,
        phone,
        message: `M-PESA STK prompt sent to ${phone} for KES ${totalChargeKes} (${netCreditUsdc.toFixed(2)} USDC / KES ${netCreditKes} credit + KES ${feeKes} fee).`,
      };
    }

    const errBody = (await stkRes.json().catch(() => ({}))) as Record<string, any>;
    throw new BadRequestException(
      errBody.error_message || errBody.message || 'M-PESA STK Push request was declined.',
    );
  }

  @Post('payout')
  async payout(@Body() body: any) {
    const cfg = this.getKopoConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new ServiceUnavailableException(
        'Live M-PESA payouts require KOPOKOPO_CLIENT_ID and KOPOKOPO_CLIENT_SECRET configured on the server.',
      );
    }
    const rawUsdc = Number(body?.amountUsdc || 0);
    const grossWithdrawalKes = Math.round(Number(body?.amountKes || (rawUsdc > 0 ? rawUsdc * 130 : 0)));
    const phone = this.normalizeKenyaPhone(body?.phone);
    if (!grossWithdrawalKes || grossWithdrawalKes < 650) {
      throw new BadRequestException(
        'Minimum M-PESA withdrawal is USDC 5.00 (KES 650) so you receive KES 600 after the KES 50 payout fee.',
      );
    }
    if (grossWithdrawalKes > 70000) {
      throw new BadRequestException('Maximum single M-PESA withdrawal is KES 70,000 (~538.46 USDC).');
    }
    if (!/^\+254\d{9}$/.test(phone)) {
      throw new BadRequestException('Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).');
    }

    const userId = String(body?.userId || '').trim();
    if (!userId) {
      throw new BadRequestException('Please sign in to your account before requesting an M-PESA withdrawal.');
    }
    const userKey = userId;
    const isExpress = body?.expressPayout === true;
    const expressSurchargeKes = isExpress ? 35 : 0;
    const feeKes = 50 + expressSurchargeKes; // KES 50 Kopo Kopo cost + optional KES 35 VIP instant margin
    const minGross = 600 + feeKes;
    if (grossWithdrawalKes < minGross) {
      throw new BadRequestException(
        `Minimum M-PESA ${isExpress ? 'Express VIP ' : ''}withdrawal is KES ${minGross} (KES 600 net payout + KES ${feeKes} fee).`,
      );
    }
    const commitDaily = this.checkAndRecordDailyWithdrawal(userKey, grossWithdrawalKes);
    const netPayoutKes = grossWithdrawalKes - feeKes;

    // Validate & deduct grossUsd from player's Real Cash wallet on the server
    if (userId && this.walletService) {
      const grossUsd =
        rawUsdc > 0
          ? Math.round(rawUsdc * 100) / 100
          : Math.round((grossWithdrawalKes / 130) * 100) / 100;
      await this.walletService.requestPayout(userId, grossUsd, {
        type: 'MPESA',
        phone,
        grossWithdrawalKes,
        feeKes,
        netPayoutKes,
      } as any);
    }

    const token = await this.getKopoAccessToken(cfg);
    const recipRes = await fetch(`${cfg.baseUrl}/api/v1/pay_recipients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        type: 'mobile_wallet',
        pay_recipient: {
          first_name: String(body?.firstName || 'Player').slice(0, 40),
          last_name: String(body?.lastName || 'Playverzus').slice(0, 40),
          email: body?.email || undefined,
          phone_number: phone,
          network: 'Safaricom',
        },
      }),
    });
    const destRef = recipRes.headers.get('location');
    if (!recipRes.ok || !destRef) {
      const errBody = (await recipRes.json().catch(() => ({}))) as Record<string, any>;
      throw new BadRequestException(errBody.error_message || 'Could not verify M-PESA payout recipient.');
    }

    const payRes = await fetch(`${cfg.baseUrl}/api/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        destination_reference: destRef.split('/').pop(),
        destination_type: 'mobile_wallet',
        amount: { currency: 'KES', value: netPayoutKes },
        metadata: {
          customer_id: userId,
          gross_withdrawal_kes: String(grossWithdrawalKes),
          fee_kes: String(feeKes),
          net_payout_kes: String(netPayoutKes),
          notes: 'Playverzus M-PESA withdrawal',
        },
        _links: { callback_url: cfg.callbackUrl },
      }),
    });

    if (payRes.status === 201 || payRes.ok) {
      commitDaily();
      return {
        ok: true,
        status: 'PAYOUT_INITIATED',
        amountKes: grossWithdrawalKes,
        grossWithdrawalKes,
        feeKes,
        netPayoutKes,
        phone,
        message: `M-PESA payout of KES ${netPayoutKes} net (KES ${grossWithdrawalKes} - KES ${feeKes} fee) to ${phone} initiated.`,
      };
    }

    const errBody = (await payRes.json().catch(() => ({}))) as Record<string, any>;
    throw new BadRequestException(errBody.error_message || errBody.message || 'M-PESA payout failed.');
  }
}
