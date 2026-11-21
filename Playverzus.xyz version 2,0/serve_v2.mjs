import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { handleDeveloperApiRequest } from './developer_api_engine.mjs';
import {
  buildAgentsOverview,
  registerFieldAgent,
  attributePlayerConversion,
  settleAgentPayout,
  requestAgentPayout,
} from './agent_referral_engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'build', 'web');
const port = Number(process.env.PORT || 8080);
const upstreamApiHost = 'playverzus-api.onrender.com';

// Load canonical root .env file (../.env) first, with local .env fallback
function loadLocalEnv() {
  const candidates = [
    path.resolve(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadLocalEnv();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.apk': 'application/vnd.android.package-archive',
  '.exe': 'application/octet-stream',
  '.dmg': 'application/octet-stream',
};

const compressibleExts = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.wasm',
]);
const flagCache = new Map();
const MAX_FLAG_CACHE = 250;
const compressedAssetCache = new Map();
const MAX_COMPRESSED_CACHE = 40;

// ── Server-Side Live Mobile Money (Kopo Kopo API v1) Gateway ────────────────
let cachedOAuthToken = null;
let cachedOAuthExpiry = 0;

const gatewayStateFile = path.join(__dirname, '.data', 'platform_gateway.json');
function readActiveGateway() {
  try {
    if (fs.existsSync(gatewayStateFile)) {
      const parsed = JSON.parse(fs.readFileSync(gatewayStateFile, 'utf8'));
      if (parsed?.activeGateway === 'crossmint' || parsed?.activeGateway === 'kopokopo') {
        return parsed.activeGateway;
      }
    }
  } catch {}
  return process.env.DEFAULT_PAYMENT_GATEWAY === 'crossmint' ? 'crossmint' : 'kopokopo';
}

function writeActiveGateway(mode) {
  const normalized = mode === 'crossmint' ? 'crossmint' : 'kopokopo';
  try {
    const dir = path.dirname(gatewayStateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      gatewayStateFile,
      JSON.stringify({ activeGateway: normalized, updatedAt: new Date().toISOString() }, null, 2),
      'utf8',
    );
  } catch {}
  return normalized;
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

function normalizeKenyaPhone(raw) {
  let digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '+254' + digits.slice(1);
  } else if (digits.startsWith('254') && digits.length === 12) {
    digits = '+' + digits;
  } else if (digits.startsWith('7') && digits.length === 9) {
    digits = '+254' + digits;
  } else if (digits.startsWith('1') && digits.length === 9) {
    digits = '+254' + digits;
  }
  return digits;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

async function getKopoAccessToken(cfg) {
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Mobile money OAuth failed');
  }
  cachedOAuthToken = data.access_token;
  cachedOAuthExpiry = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedOAuthToken;
}

function computeMpesaDepositFeeKes(netKes) {
  if (netKes <= 200) return 0;
  const grossed = Math.ceil(netKes / (1.0 - 0.0055));
  return Math.min(200, Math.max(1, grossed - netKes));
}

const dailyWithdrawalTracker = new Map();
function checkAndRecordDailyWithdrawal(userKey, amountKes) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const recent = (dailyWithdrawalTracker.get(userKey) || []).filter((e) => now - e.ts < dayMs);
  const usedKes = recent.reduce((sum, e) => sum + e.amountKes, 0);
  if (recent.length >= 3) {
    throw new Error('Daily withdrawal limit reached (maximum 3 M-PESA payouts per 24 hours).');
  }
  if (usedKes + amountKes > 150000) {
    throw new Error(`Daily withdrawal limit exceeded (KES 150,000/day max; remaining today: KES ${Math.max(0, 150000 - usedKes)}).`);
  }
  return () => {
    recent.push({ ts: now, amountKes });
    dailyWithdrawalTracker.set(userKey, recent);
  };
}

async function handleMpesaStkPush(req, res) {
  const cfg = getKopoConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.tillNumber) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message:
          'Live M-PESA gateway is not yet configured on this server. Add KOPOKOPO_CLIENT_ID, KOPOKOPO_CLIENT_SECRET, KOPOKOPO_API_KEY, and KOPOKOPO_TILL_NUMBER to root .env and restart.',
      }),
    );
    return;
  }

  try {
    const body = await readJsonBody(req);
    const netCreditKes = Math.round(Number(body.amountKes || 0));
    const phone = normalizeKenyaPhone(body.phone);
    if (!netCreditKes || netCreditKes < 100) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Minimum M-PESA deposit is KES 100.' }));
      return;
    }
    if (netCreditKes > 250000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Maximum single M-PESA deposit is KES 250,000.' }));
      return;
    }
    if (!/^\+254\d{9}$/.test(phone)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).' }));
      return;
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
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          status: 'STK_PUSH_SENT',
          location,
          amountKes: netCreditKes,
          netCreditKes,
          feeKes,
          totalChargeKes,
          phone,
          message: `M-PESA STK prompt sent to ${phone} for KES ${totalChargeKes} (KES ${netCreditKes} wallet credit + KES ${feeKes} processing fee).`,
        }),
      );
      return;
    }

    const errBody = await stkRes.json().catch(() => ({}));
    res.writeHead(stkRes.status, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: errBody.error_message || errBody.message || 'M-PESA STK Push request was declined.',
      }),
    );
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: err.message || 'M-PESA gateway error' }));
  }
}

async function handleMpesaPayout(req, res) {
  const cfg = getKopoConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message:
          'Live M-PESA payouts require KOPOKOPO_CLIENT_ID and KOPOKOPO_CLIENT_SECRET configured in server .env.',
      }),
    );
    return;
  }

  try {
    const body = await readJsonBody(req);
    const grossWithdrawalKes = Math.round(Number(body.amountKes || 0));
    const phone = normalizeKenyaPhone(body.phone);
    if (!grossWithdrawalKes || grossWithdrawalKes < 150) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Minimum M-PESA withdrawal is KES 150 (KES 100 net payout + KES 50 payout fee).' }));
      return;
    }
    if (grossWithdrawalKes > 70000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Maximum single M-PESA withdrawal is KES 70,000.' }));
      return;
    }
    if (!/^\+254\d{9}$/.test(phone)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Enter a valid Kenyan M-PESA phone number (+2547XXXXXXXX).' }));
      return;
    }

    const userKey = String(body.userId || phone);
    const commitDaily = checkAndRecordDailyWithdrawal(userKey, grossWithdrawalKes);
    const feeKes = 50;
    const netPayoutKes = grossWithdrawalKes - feeKes;

    const token = await getKopoAccessToken(cfg);
    // 1. Register mobile_wallet recipient
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
      const errBody = await recipRes.json().catch(() => ({}));
      throw new Error(errBody.error_message || 'Could not verify M-PESA payout recipient.');
    }

    // 2. Initiate live M-PESA Pay disbursement for exact netPayoutKes (retaining KES 50 upfront fee)
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
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          status: 'PAYOUT_INITIATED',
          amountKes: grossWithdrawalKes,
          grossWithdrawalKes,
          feeKes,
          netPayoutKes,
          phone,
          message: `M-PESA payout of KES ${netPayoutKes} net (KES ${grossWithdrawalKes} - KES ${feeKes} fee) to ${phone} initiated.`,
        }),
      );
      return;
    }

    const errBody = await payRes.json().catch(() => ({}));
    res.writeHead(payRes.status, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: errBody.error_message || errBody.message || 'M-PESA payout failed.',
      }),
    );
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: err.message || 'M-PESA payout gateway error' }));
  }
}

function proxyApiRequest(req, res) {
  const headers = { ...req.headers };
  headers.host = upstreamApiHost;
  headers.origin = 'https://playverzus.xyz';
  delete headers['accept-encoding'];

  const proxyReq = https.request(
    {
      hostname: upstreamApiHost,
      port: 443,
      path: req.url,
      method: req.method,
      headers,
      timeout: 15000,
    },
    (proxyRes) => {
      const respHeaders = { ...proxyRes.headers };
      delete respHeaders['access-control-allow-origin'];
      res.writeHead(proxyRes.statusCode || 502, respHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Upstream API request timed out' }));
    }
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Backend unreachable: ${err.message}` }));
    }
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || '/';

  // Game Developer Portal & Platform-Aware Stats API Engine
  if (rawUrl.startsWith('/api/developer/')) {
    handleDeveloperApiRequest(req, res, port).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Developer API error' }));
      }
    });
    return;
  }

  // Ground Force / Field Agent & 2-Tier Commission Ledger Engine
  if (rawUrl.startsWith('/api/agents/')) {
    (async () => {
      try {
        const parsed = new URL(rawUrl, `http://localhost:${port}`);
        const p = parsed.pathname;

        if (p === '/api/agents/overview' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(buildAgentsOverview()));
          return;
        }
        if (p === '/api/agents/me' && req.method === 'GET') {
          const overview = buildAgentsOverview();
          const qUser = (parsed.searchParams.get('username') || '').toLowerCase();
          const qEmail = (parsed.searchParams.get('email') || '').toLowerCase();
          const qCode = (parsed.searchParams.get('code') || '').toUpperCase();
          const found =
            overview.agents.find(
              (a) =>
                (qCode && a.referralCode.toUpperCase() === qCode) ||
                (qEmail && a.email.toLowerCase() === qEmail) ||
                (qUser && a.username.toLowerCase() === qUser),
            ) || overview.agents[0];
          const subAgents = overview.agents.filter((a) => a.parentAgentId === found?.id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              agent: found,
              subAgents,
              schedule: overview.schedule,
            }),
          );
          return;
        }
        if (p === '/api/agents/register' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const created = registerFieldAgent(body);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, agent: created, overview: buildAgentsOverview() }));
          return;
        }
        if (p === '/api/agents/attribute' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = attributePlayerConversion(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...result, overview: buildAgentsOverview() }));
          return;
        }
        if (p === '/api/agents/settle-payout' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = settleAgentPayout(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...result, overview: buildAgentsOverview() }));
          return;
        }
        if (p === '/api/agents/request-payout' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = requestAgentPayout(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...result, overview: buildAgentsOverview() }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Agent endpoint not found' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Field Agent engine error' }));
      }
    })();
    return;
  }

  // Live M-PESA STK Push & Payout server endpoints (backed by Kopo Kopo env vars)
  if (rawUrl === '/api/mpesa/stk-push' && req.method === 'POST') {
    handleMpesaStkPush(req, res);
    return;
  }
  if (rawUrl === '/api/mpesa/payout' && req.method === 'POST') {
    handleMpesaPayout(req, res);
    return;
  }
  if (rawUrl.startsWith('/api/mpesa/check-status') && req.method === 'GET') {
    (async () => {
      const cfg = getKopoConfig();
      const parsed = new URL(rawUrl, `http://localhost:${port}`);
      const loc = parsed.searchParams.get('location') || '';
      if (!loc) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Missing payment location or id.' }));
        return;
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
        const json = await statusRes.json().catch(() => ({}));
        const attrs = json?.data?.attributes || {};
        res.writeHead(statusRes.ok ? 200 : statusRes.status, {
          'Content-Type': 'application/json',
        });
        res.end(
          JSON.stringify({
            status: attrs.status || 'Pending',
            event: attrs.event || null,
            metadata: attrs.metadata || {},
          }),
        );
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Status query failed' }));
      }
    })();
    return;
  }
  if ((rawUrl.startsWith('/api/mpesa/status') || rawUrl.startsWith('/api/mpesa/gateway')) && req.method === 'GET') {
    (async () => {
      const cfg = getKopoConfig();
      const configured = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
      const verify = rawUrl.includes('verify=1');
      let oauthLive = false;
      let oauthError = null;
      if (configured && verify) {
        try {
          await getKopoAccessToken(cfg);
          oauthLive = true;
        } catch (e) {
          oauthError = e.message;
        }
      }
      const crossmint = getCrossmintReadiness();
      const activeGateway = readActiveGateway();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          activeGateway,
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
        }),
      );
    })();
    return;
  }
  if (rawUrl.startsWith('/api/mpesa/gateway') && req.method === 'POST') {
    (async () => {
      try {
        const body = await readJsonBody(req);
        const activeGateway = writeActiveGateway(body?.activeGateway);
        const cfg = getKopoConfig();
        const configured = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
        const crossmint = getCrossmintReadiness();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            activeGateway,
            kopokopo: {
              configured,
              mode: cfg.baseUrl.includes('sandbox') ? 'sandbox' : 'live',
              tillConfigured: Boolean(cfg.tillNumber),
            },
            crossmint,
          }),
        );
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Invalid gateway request' }));
      }
    })();
    return;
  }

  // Same-origin CORS-safe country flag image proxy (/flags/ke.png -> flagcdn.com/w40/ke.png)
  // Cached in memory (up to 250 ISO codes) for <1ms subsequent loads.
  const flagMatch = rawUrl.match(/^\/flags\/([a-z]{2})\.png$/i);
  if (flagMatch && req.method === 'GET') {
    const iso = flagMatch[1].toLowerCase();
    const cached = flagCache.get(iso);
    if (cached) {
      res.writeHead(200, {
        'Content-Type': cached.contentType,
        'Content-Length': cached.body.length,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(cached.body);
      return;
    }
    https
      .get(`https://flagcdn.com/w40/${iso}.png`, (flagRes) => {
        const status = flagRes.statusCode || 200;
        const contentType = flagRes.headers['content-type'] || 'image/png';
        const chunks = [];
        flagRes.on('data', (chunk) => chunks.push(chunk));
        flagRes.on('end', () => {
          const body = Buffer.concat(chunks);
          if (status === 200 && body.length > 0 && body.length < 100_000) {
            if (flagCache.size >= MAX_FLAG_CACHE) {
              const oldest = flagCache.keys().next().value;
              if (oldest) flagCache.delete(oldest);
            }
            flagCache.set(iso, { contentType, body });
          }
          res.writeHead(status, {
            'Content-Type': contentType,
            'Content-Length': body.length,
            'Cache-Control': 'public, max-age=604800, immutable',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(body);
        });
      })
      .on('error', () => {
        if (!res.headersSent) {
          res.writeHead(404);
          res.end();
        }
      });
    return;
  }

  // Transparent same-origin proxy for /api/* -> live Playverzus NestJS backend
  if (rawUrl.startsWith('/api/') || rawUrl === '/api') {
    proxyApiRequest(req, res);
    return;
  }

  const urlPath = decodeURIComponent(rawUrl.split('?')[0]);
  let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(root, 'index.html');
      stat = fs.statSync(filePath);
    }
  } catch {
    filePath = path.join(root, 'index.html');
    stat = fs.statSync(filePath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const noCacheFile =
    ext === '.html' ||
    baseName === 'flutter_bootstrap.js' ||
    baseName === 'flutter_service_worker.js' ||
    baseName === 'version.json';
  const cacheControl = noCacheFile
    ? 'no-cache'
    : urlPath.startsWith('/assets/') || urlPath.startsWith('/canvaskit/') || ext === '.wasm'
      ? 'public, max-age=86400'
      : 'public, max-age=3600';

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
    res.end();
    return;
  }

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  const shouldCompress = compressibleExts.has(ext) && stat.size > 1024;
  const encoding = shouldCompress
    ? acceptEncoding.includes('br')
      ? 'br'
      : acceptEncoding.includes('gzip')
        ? 'gzip'
        : null
    : null;

  if (encoding) {
    const cacheKey = `${filePath}|${etag}|${encoding}`;
    const cachedBuf = compressedAssetCache.get(cacheKey);
    if (cachedBuf) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': encoding,
        'Content-Length': cachedBuf.length,
        Vary: 'Accept-Encoding',
        ETag: etag,
        'Cache-Control': cacheControl,
      });
      res.end(cachedBuf);
      return;
    }

    // Compress and cache up to 12MB source files (covers main.dart.js and canvaskit.wasm)
    if (stat.size <= 12 * 1024 * 1024) {
      const rawBuf = fs.readFileSync(filePath);
      const compressed =
        encoding === 'br'
          ? zlib.brotliCompressSync(rawBuf, {
              params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
            })
          : zlib.gzipSync(rawBuf, { level: 6 });

      if (compressedAssetCache.size >= MAX_COMPRESSED_CACHE) {
        const oldest = compressedAssetCache.keys().next().value;
        if (oldest) compressedAssetCache.delete(oldest);
      }
      compressedAssetCache.set(cacheKey, compressed);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': encoding,
        'Content-Length': compressed.length,
        Vary: 'Accept-Encoding',
        ETag: etag,
        'Cache-Control': cacheControl,
      });
      res.end(compressed);
      return;
    }
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    ETag: etag,
    'Cache-Control': cacheControl,
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  const cfg = getKopoConfig();
  const mpesaReady = Boolean(cfg.clientId && cfg.clientSecret && cfg.tillNumber);
  console.log(
    `Playverzus v2.0 Flutter Web LIVE at http://localhost:${port} (API proxy + M-PESA gateway: ${mpesaReady ? 'CONFIGURED' : 'AWAITING .env KEYS'})`,
  );
});
