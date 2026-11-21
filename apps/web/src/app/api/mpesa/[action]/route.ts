import { NextResponse } from 'next/server';

let cachedOAuthToken: string | null = null;
let cachedOAuthExpiry = 0;

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

  if (action === 'status') {
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
    return NextResponse.json({
      configured,
      mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
      tillConfigured: Boolean(cfg.tillNumber),
      ...(verify ? { oauthLive, ...(oauthError ? { oauthError } : {}) } : {}),
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
      const amountKes = Math.round(Number(body.amountKes || 0));
      const phone = normalizeKenyaPhone(body.phone);
      if (!amountKes || amountKes < 10) {
        return NextResponse.json(
          { message: 'Minimum M-PESA deposit is KES 10.' },
          { status: 400 },
        );
      }
      if (!/^\+254\d{9}$/.test(phone)) {
        return NextResponse.json(
          { message: 'Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).' },
          { status: 400 },
        );
      }
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
        amount: { currency: 'KES', value: amountKes },
        metadata: {
          customer_id: String(body.userId || ''),
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
            amountKes,
            phone,
            message: `M-PESA STK prompt sent to ${phone} for KES ${amountKes}. Enter your M-PESA PIN to complete.`,
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
      const amountKes = Math.round(Number(body.amountKes || 0));
      const phone = normalizeKenyaPhone(body.phone);
      if (!amountKes || amountKes < 50) {
        return NextResponse.json(
          { message: 'Minimum M-PESA withdrawal is KES 50.' },
          { status: 400 },
        );
      }
      if (!/^\+254\d{9}$/.test(phone)) {
        return NextResponse.json(
          { message: 'Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).' },
          { status: 400 },
        );
      }
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
          amount: { currency: 'KES', value: amountKes },
          metadata: {
            customer_id: String(body.userId || ''),
            notes: 'Playverzus M-PESA withdrawal',
          },
          _links: { callback_url: cfg.callbackUrl },
        }),
      });

      if (payRes.status === 201 || payRes.ok) {
        return NextResponse.json(
          {
            ok: true,
            status: 'PAYOUT_INITIATED',
            amountKes,
            phone,
            message: `M-PESA payout of KES ${amountKes} to ${phone} initiated.`,
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
