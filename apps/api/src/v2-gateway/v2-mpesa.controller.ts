import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';

@Controller('mpesa')
export class V2MpesaController {
  private cachedOAuthToken: string | null = null;
  private cachedOAuthExpiry = 0;

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
    return {
      configured,
      mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
      tillConfigured: Boolean(cfg.tillNumber),
      ...(shouldVerify ? { oauthLive, ...(oauthError ? { oauthError } : {}) } : {}),
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
      return {
        status: attrs.status || 'Pending',
        event: attrs.event || null,
        metadata: attrs.metadata || {},
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
    const amountKes = Math.round(Number(body?.amountKes || 0));
    const phone = this.normalizeKenyaPhone(body?.phone);
    if (!amountKes || amountKes < 10) {
      throw new BadRequestException('Minimum M-PESA deposit is KES 10.');
    }
    if (!/^\+254\d{9}$/.test(phone)) {
      throw new BadRequestException('Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).');
    }

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
      amount: { currency: 'KES', value: amountKes },
      metadata: {
        customer_id: String(body?.userId || ''),
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
        amountKes,
        phone,
        message: `M-PESA STK prompt sent to ${phone} for KES ${amountKes}. Enter your M-PESA PIN to complete.`,
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
    const amountKes = Math.round(Number(body?.amountKes || 0));
    const phone = this.normalizeKenyaPhone(body?.phone);
    if (!amountKes || amountKes < 50) {
      throw new BadRequestException('Minimum M-PESA withdrawal is KES 50.');
    }
    if (!/^\+254\d{9}$/.test(phone)) {
      throw new BadRequestException('Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).');
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
        amount: { currency: 'KES', value: amountKes },
        metadata: {
          customer_id: String(body?.userId || ''),
          notes: 'Playverzus M-PESA withdrawal',
        },
        _links: { callback_url: cfg.callbackUrl },
      }),
    });

    if (payRes.status === 201 || payRes.ok) {
      return {
        ok: true,
        status: 'PAYOUT_INITIATED',
        amountKes,
        phone,
        message: `M-PESA payout of KES ${amountKes} to ${phone} initiated.`,
      };
    }

    const errBody = (await payRes.json().catch(() => ({}))) as Record<string, any>;
    throw new BadRequestException(errBody.error_message || errBody.message || 'M-PESA payout failed.');
  }
}
