import { NextResponse } from 'next/server';

const UPSTREAM_API = 'https://playverzus-api.onrender.com';

// Fallback in-memory store for instant availability while Render redeploys
const memStore: { developers: Record<string, any>; games: any[] } = {
  developers: {},
  games: [],
};

function extractDotPath(obj: any, dotPath?: string): any {
  if (!dotPath || typeof dotPath !== 'string' || obj == null) return undefined;
  const tokens = dotPath
    .trim()
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let cur = obj;
  for (const t of tokens) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[t];
  }
  return cur;
}

async function proxyToUpstream(req: Request, pathSuffix: string) {
  const url = new URL(req.url);
  const targetUrl = `${UPSTREAM_API}/api/developer/${pathSuffix}${url.search}`;
  const method = req.method.toUpperCase();
  const bodyText =
    method === 'POST' || method === 'PATCH'
      ? await req.text()
      : undefined;

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: bodyText,
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status !== 404) {
      const json = await res.json().catch(() => ({}));
      return NextResponse.json(json, { status: res.status });
    }
  } catch {}

  // Fallback handler inside Vercel Edge/Node if upstream is still deploying
  const parsedBody = bodyText ? JSON.parse(bodyText) : {};

  if (pathSuffix === 'register-role' && method === 'POST') {
    const email = String(parsedBody.email || '').trim().toLowerCase();
    const userId = String(parsedBody.userId || '').trim();
    const key = email || userId || 'dev';
    memStore.developers[key] = {
      userId,
      email,
      username: String(parsedBody.username || ''),
      studioName: String(parsedBody.studioName || 'Indie Studio'),
      registeredAt: new Date().toISOString(),
    };
    return NextResponse.json({
      ok: true,
      role: 'GAME_DEVELOPER',
      developer: memStore.developers[key],
    });
  }

  if (pathSuffix === 'role-check' && method === 'GET') {
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const userId = (url.searchParams.get('userId') || '').trim();
    const found =
      (email && memStore.developers[email]) ||
      Object.values(memStore.developers).find((d) => d.userId === userId) ||
      null;
    return NextResponse.json({
      isDeveloper: Boolean(found),
      studioName: found?.studioName || '',
    });
  }

  if (pathSuffix === 'games' && method === 'GET') {
    return NextResponse.json({ games: memStore.games });
  }

  if (pathSuffix === 'games' && method === 'POST') {
    const now = new Date().toISOString();
    const game = {
      id: `dev_${Date.now().toString(36)}`,
      ...parsedBody,
      status: parsedBody.verified ? 'VERIFIED_LIVE' : 'CONFIGURED',
      createdAt: now,
      updatedAt: now,
    };
    memStore.games.unshift(game);
    return NextResponse.json({ ok: true, game }, { status: 201 });
  }

  if (pathSuffix === 'test-fetch' && method === 'POST') {
    const cfg = parsedBody.apiConfig || {};
    const mapping = parsedBody.statsMapping || {};
    const playerId = String(parsedBody.playerId || '').trim();
    const matchId = String(parsedBody.matchId || '').trim();
    const platform = String(parsedBody.platform || cfg.platform || 'PC');
    const base = String(cfg.baseUrl || '').trim().replace(/\/+$/, '');
    const rawPath = String(cfg.playerStatsPath || '').trim();
    const interp = (s: string) =>
      s
        .replace(/\{playerId\}/gi, encodeURIComponent(playerId))
        .replace(/\{handle\}/gi, encodeURIComponent(playerId))
        .replace(/\{matchId\}/gi, encodeURIComponent(matchId))
        .replace(/\{platform\}/gi, encodeURIComponent(platform.toLowerCase()));
    const p = interp(rawPath);
    const fullUrl = /^https?:\/\//i.test(rawPath)
      ? p
      : p
        ? `${base}${p.startsWith('/') ? '' : '/'}${p}`
        : base;

    const startedAt = Date.now();
    try {
      const r = await fetch(fullUrl, {
        method: cfg.httpMethod === 'POST' ? 'POST' : 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Playverzus-StatsEngine/2.0 (+https://playverzus.xyz)',
        },
        signal: AbortSignal.timeout(10_000),
      });
      const latencyMs = Date.now() - startedAt;
      const rawText = await r.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {}
      const extractedStats: Record<string, any> = {};
      if (parsedJson && typeof parsedJson === 'object') {
        for (const [k, dot] of [
          ['score', mapping.scorePath],
          ['wins', mapping.winsPath],
          ['losses', mapping.lossesPath],
          ['kills', mapping.killsPath],
          ['rank', mapping.rankPath],
          ['winner', mapping.winnerPath],
        ] as const) {
          const val = extractDotPath(parsedJson, dot);
          if (val !== undefined) extractedStats[k] = val;
        }
      }
      return NextResponse.json({
        ok: r.ok,
        statusCode: r.status,
        latencyMs,
        resolvedUrl: fullUrl,
        platform,
        extractedStats,
        isJson: parsedJson !== null,
        rawPreview: rawText.slice(0, 4000),
      });
    } catch (e) {
      return NextResponse.json({
        ok: false,
        statusCode: 502,
        latencyMs: Date.now() - startedAt,
        resolvedUrl: fullUrl,
        platform,
        extractedStats: {},
        isJson: false,
        rawPreview: '',
        error: e instanceof Error ? e.message : 'Fetch error',
      });
    }
  }

  return NextResponse.json({ message: 'Not found' }, { status: 404 });
}

export async function GET(
  req: Request,
  context: { params: { slug: string[] } },
) {
  const pathSuffix = (context.params?.slug || []).join('/');
  return proxyToUpstream(req, pathSuffix);
}

export async function POST(
  req: Request,
  context: { params: { slug: string[] } },
) {
  const pathSuffix = (context.params?.slug || []).join('/');
  return proxyToUpstream(req, pathSuffix);
}

export async function PATCH(
  req: Request,
  context: { params: { slug: string[] } },
) {
  const pathSuffix = (context.params?.slug || []).join('/');
  return proxyToUpstream(req, pathSuffix);
}

export async function DELETE(
  req: Request,
  context: { params: { slug: string[] } },
) {
  const pathSuffix = (context.params?.slug || []).join('/');
  return proxyToUpstream(req, pathSuffix);
}
