import { NextResponse } from 'next/server';
import { kvGetJson, kvSetJson } from '@/lib/upstash-kv';

const GATEWAY_KV_KEY = 'platform:payment_gateway';
let cachedOAuthToken: string | null = null;
let cachedOAuthExpiry = 0;
let activePlatformGateway: 'kopokopo' | 'crossmint' =
  process.env.DEFAULT_PAYMENT_GATEWAY === 'crossmint' ? 'crossmint' : 'kopokopo';

async function getPersistedGateway(): Promise<'kopokopo' | 'crossmint'> {
  const saved = await kvGetJson<{ activeGateway?: string }>(GATEWAY_KV_KEY);
  if (saved?.activeGateway === 'crossmint' || saved?.activeGateway === 'kopokopo') {
    activePlatformGateway = saved.activeGateway;
  }
  return activePlatformGateway;
}

async function setPersistedGateway(mode: unknown): Promise<'kopokopo' | 'crossmint'> {
  activePlatformGateway = mode === 'crossmint' ? 'crossmint' : 'kopokopo';
  await kvSetJson(GATEWAY_KV_KEY, {
    activeGateway: activePlatformGateway,
    updatedAt: new Date().toISOString(),
  });
  return activePlatformGateway;
}

function getCrossmintReadiness() {
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

function getKopoConfig() {
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

function normalizeKenyaPhone(raw: unknown): string {
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

async function getKopoAccessToken(cfg: ReturnType<typeof getKopoConfig>): Promise<string> {
  if (cachedOAuthToken && Date.now() < cachedOAuthExpiry - 60_000) {
    return cachedOAuthToken;
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
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new Error(
      String(data.error_description || data.error || 'Mobile money OAuth failed'),
    );
  }
  cachedOAuthToken = String(data.access_token);
  cachedOAuthExpiry = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedOAuthToken;
}

export async function GET(
  req: Request,
  context: { params: { action: string } },
) {
  const action = String(context.params?.action || '');
  const cfg = getKopoConfig();
  const url = new URL(req.url);

  if (action === 'status' || action === 'gateway') {
    const configured = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
    const verify = url.searchParams.get('verify') === '1';
    let oauthLive = false;
    let oauthError: string | null = null;
    if (configured && verify) {
      try {
        await getKopoAccessToken(cfg);
        oauthLive = true;
      } catch (e) {
        oauthError = e instanceof Error ? e.message : 'OAuth error';
      }
    }
    const currentGateway = await getPersistedGateway();
    const crossmint = getCrossmintReadiness();
    return NextResponse.json({
      activeGateway: currentGateway,
      configured,
      mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
      tillConfigured: Boolean(cfg.tillNumber),
      ...(verify ? { oauthLive, ...(oauthError ? { oauthError } : {}) } : {}),
      kopokopo: {
        configured,
        mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        tillConfigured: Boolean(cfg.tillNumber),
        ...(verify ? { oauthLive, ...(oauthError ? { oauthError } : {}) } : {}),
      },
      crossmint,
    });
  }

  if (action === 'check-status') {
    const loc = url.searchParams.get('location') || '';
    if (!loc) {
      return NextResponse.json(
        { message: 'Missing payment location or id.' },
        { status: 400 },
      );
    }
    try {
      const token = await getKopoAccessToken(cfg);
      const targetUrl = loc.startsWith('http')
        ? loc
        : `${cfg.baseUrl}/api/v1/incoming_payments/${loc}`;
      const statusRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = (await statusRes.json().catch(() => ({}))) as Record<string, any>;
      const attrs = json?.data?.attributes || {};
      return NextResponse.json(
        {
          status: attrs.status || 'Pending',
          event: attrs.event || null,
          metadata: attrs.metadata || {},
        },
        { status: statusRes.ok ? 200 : statusRes.status },
      );
    } catch (e) {
      return NextResponse.json(
        { message: e instanceof Error ? e.message : 'Status query failed' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ message: 'Not found' }, { status: 404 });
}

export async function POST(
  req: Request,
  context: { params: { action: string } },
) {
  const action = String(context.params?.action || '');
  const cfg = getKopoConfig();

  if (action === 'gateway') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updatedGateway = await setPersistedGateway(body.activeGateway);
    const configured = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
    return NextResponse.json({
      ok: true,
      activeGateway: updatedGateway,
      kopokopo: {
        configured,
        mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
        tillConfigured: Boolean(cfg.tillNumber),
      },
      crossmint: getCrossmintReadiness(),
    });
  }

function computeMpesaDepositFeeKes(netKes: number): number {
  if (netKes <= 200) return 0;
  const grossed = Math.ceil(netKes / (1.0 - 0.0055));
  return Math.min(200, Math.max(1, grossed - netKes));
}

const dailyWithdrawalTracker = new Map<string, Array<{ ts: number; amountKes: number }>>();
function checkAndRecordDailyWithdrawal(userKey: string, amountKes: number) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const recent = (dailyWithdrawalTracker.get(userKey) || []).filter((e) => now - e.ts < dayMs);
  const usedKes = recent.reduce((sum, e) => sum + e.amountKes, 0);
  if (recent.length >= 3) {
    throw new Error('Daily withdrawal limit reached (maximum 3 M-PESA payouts per 24 hours).');
  }
  if (usedKes + amountKes > 150000) {
    throw new Error(
      `Daily withdrawal limit exceeded (KES 150,000/day max; remaining today: KES ${Math.max(0, 150000 - usedKes)}).`,
    );
  }
  return () => {
    recent.push({ ts: now, amountKes });
    dailyWithdrawalTracker.set(userKey, recent);
  };
}

  if (action === 'stk-push') {
    if (!cfg.clientId || !cfg.clientSecret || !cfg.tillNumber) {
      return NextResponse.json(
        {
          message:
            'Live M-PESA gateway requires KOPOKOPO_CLIENT_ID, KOPOKOPO_CLIENT_SECRET, and KOPOKOPO_TILL_NUMBER configured in environment variables.',
        },
        { status: 503 },
      );
    }
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const netCreditKes = Math.round(Number(body.amountKes || 0));
      const phone = normalizeKenyaPhone(body.phone);
      if (!netCreditKes || netCreditKes < 100) {
        return NextResponse.json(
          { message: 'Minimum M-PESA deposit is KES 100.' },
          { status: 400 },
        );
      }
      if (netCreditKes > 250000) {
        return NextResponse.json(
          { message: 'Maximum single M-PESA deposit is KES 250,000.' },
          { status: 400 },
        );
      }
      if (!/^\+254\d{9}$/.test(phone)) {
        return NextResponse.json(
          { message: 'Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).' },
          { status: 400 },
        );
      }
      const feeKes = computeMpesaDepositFeeKes(netCreditKes);
      const totalChargeKes = netCreditKes + feeKes;

      const token = await getKopoAccessToken(cfg);
      const payload = {
        payment_channel: 'M-PESA STK Push',
        till_number: cfg.tillNumber,
        subscriber: {
          first_name: String(body.firstName || 'Player').slice(0, 40),
          last_name: String(body.lastName || 'Playverzus').slice(0, 40),
          phone_number: phone,
          email: body.email || undefined,
        },
        amount: { currency: 'KES', value: totalChargeKes },
        metadata: {
          customer_id: String(body.userId || ''),
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
        return NextResponse.json(
          {
            ok: true,
            status: 'STK_PUSH_SENT',
            location,
            amountKes: netCreditKes,
            netCreditKes,
            feeKes,
            totalChargeKes,
            phone,
            message: `M-PESA STK prompt sent to ${phone} for KES ${totalChargeKes} (KES ${netCreditKes} wallet credit + KES ${feeKes} processing fee).`,
          },
          { status: 201 },
        );
      }

      const errBody = (await stkRes.json().catch(() => ({}))) as Record<string, unknown>;
      return NextResponse.json(
        {
          message:
            String(errBody.error_message || errBody.message || 'M-PESA STK Push request was declined.'),
        },
        { status: stkRes.status },
      );
    } catch (e) {
      return NextResponse.json(
        { message: e instanceof Error ? e.message : 'M-PESA gateway error' },
        { status: 502 },
      );
    }
  }

  if (action === 'payout') {
    if (!cfg.clientId || !cfg.clientSecret) {
      return NextResponse.json(
        { message: 'Live M-PESA payouts require server credentials configured.' },
        { status: 503 },
      );
    }
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const grossWithdrawalKes = Math.round(Number(body.amountKes || 0));
      const phone = normalizeKenyaPhone(body.phone);
      if (!grossWithdrawalKes || grossWithdrawalKes < 150) {
        return NextResponse.json(
          { message: 'Minimum M-PESA withdrawal is KES 150 (KES 100 net payout + KES 50 payout fee).' },
          { status: 400 },
        );
      }
      if (grossWithdrawalKes > 70000) {
        return NextResponse.json(
          { message: 'Maximum single M-PESA withdrawal is KES 70,000.' },
          { status: 400 },
        );
      }
      if (!/^\+254\d{9}$/.test(phone)) {
        return NextResponse.json(
          { message: 'Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).' },
          { status: 400 },
        );
      }
      const userKey = String(body.userId || phone);
      const isExpress = body.expressPayout === true;
      const expressSurchargeKes = isExpress ? 35 : 0;
      const feeKes = 50 + expressSurchargeKes; // KES 50 Kopo Kopo cost + optional KES 35 pure profit VIP instant fee
      const minGross = 100 + feeKes;
      if (!grossWithdrawalKes || grossWithdrawalKes < minGross) {
        return NextResponse.json(
          {
            message: `Minimum M-PESA ${isExpress ? 'Express VIP ' : ''}withdrawal is KES ${minGross} (KES 100 net + KES ${feeKes} fee).`,
          },
          { status: 400 },
        );
      }
      const commitDaily = checkAndRecordDailyWithdrawal(userKey, grossWithdrawalKes);
      const netPayoutKes = grossWithdrawalKes - feeKes;

      const token = await getKopoAccessToken(cfg);
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
            first_name: String(body.firstName || 'Player').slice(0, 40),
            last_name: String(body.lastName || 'Playverzus').slice(0, 40),
            email: body.email || undefined,
            phone_number: phone,
            network: 'Safaricom',
          },
        }),
      });
      const destRef = recipRes.headers.get('location');
      if (!recipRes.ok || !destRef) {
        const errBody = (await recipRes.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(String(errBody.error_message || 'Could not verify M-PESA payout recipient.'));
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
            customer_id: String(body.userId || ''),
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
        return NextResponse.json(
          {
            ok: true,
            status: 'PAYOUT_INITIATED',
            amountKes: grossWithdrawalKes,
            grossWithdrawalKes,
            feeKes,
            netPayoutKes,
            phone,
            message: `M-PESA payout of KES ${netPayoutKes} net (KES ${grossWithdrawalKes} - KES ${feeKes} fee) to ${phone} initiated.`,
          },
          { status: 201 },
        );
      }

      const errBody = (await payRes.json().catch(() => ({}))) as Record<string, unknown>;
      return NextResponse.json(
        { message: String(errBody.error_message || errBody.message || 'M-PESA payout failed.') },
        { status: payRes.status },
      );
    } catch (e) {
      return NextResponse.json(
        { message: e instanceof Error ? e.message : 'M-PESA payout error' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ message: 'Not found' }, { status: 404 });
}
