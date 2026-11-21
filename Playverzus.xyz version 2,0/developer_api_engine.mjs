import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, '.playverzus_dev_store.json');

const VALID_PLATFORMS = new Set(['PC', 'CONSOLE', 'MOBILE', 'WEB']);
const VALID_GAME_TYPES = new Set(['HEAD_TO_HEAD', 'HIGH_SCORE', 'BINARY_RESULT']);
const VALID_AUTH_TYPES = new Set(['NONE', 'API_KEY_HEADER', 'BEARER_TOKEN', 'QUERY_PARAM']);

function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { developers: {}, games: [] };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      developers: parsed && typeof parsed.developers === 'object' ? parsed.developers : {},
      games: Array.isArray(parsed?.games) ? parsed.games : [],
    };
  } catch {
    return { developers: {}, games: [] };
  }
}

function saveStore(store) {
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 250_000) reject(new Error('Payload too large'));
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

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function validateExternalApiUrl(urlStr) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    return { ok: false, error: 'Invalid API URL format. Include https:// or http://' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, error: 'API URL must use https:// or http://' };
  }
  const host = u.hostname.toLowerCase();
  const blockedHosts = new Set([
    '169.254.169.254',
    '169.254.170.2',
    'metadata.google.internal',
    'metadata',
  ]);
  if (blockedHosts.has(host)) {
    return { ok: false, error: 'Target host is restricted.' };
  }
  return { ok: true, url: u };
}

function extractDotPath(obj, dotPath) {
  if (!dotPath || typeof dotPath !== 'string' || obj == null) return undefined;
  const clean = dotPath.trim();
  if (!clean) return undefined;
  const tokens = clean
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let cur = obj;
  for (const token of tokens) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[token];
  }
  return cur;
}

function sanitizePlatformApiForClient(api) {
  const secret = String(api.authSecret || '');
  return {
    platform: api.platform,
    providerPreset: api.providerPreset || 'CUSTOM_REST',
    baseUrl: api.baseUrl || '',
    playerStatsPath: api.playerStatsPath || '',
    matchResultPath: api.matchResultPath || '',
    httpMethod: api.httpMethod === 'POST' ? 'POST' : 'GET',
    authType: VALID_AUTH_TYPES.has(api.authType) ? api.authType : 'NONE',
    authHeaderName: api.authHeaderName || 'X-API-Key',
    authParamName: api.authParamName || 'api_key',
    hasSecret: secret.length > 0,
    secretHint: secret.length >= 4 ? `••••${secret.slice(-4)}` : secret.length > 0 ? '••••' : '',
    launchUriOrPackage: api.launchUriOrPackage || '',
  };
}

function sanitizeGameForClient(game) {
  return {
    id: game.id,
    ownerUserId: game.ownerUserId,
    ownerEmail: game.ownerEmail,
    ownerUsername: game.ownerUsername,
    studioName: game.studioName,
    title: game.title,
    shortName: game.shortName,
    tagline: game.tagline,
    gameType: game.gameType,
    platforms: game.platforms,
    posterUrl: game.posterUrl || '',
    gamertagLabel: game.gamertagLabel || 'Player ID',
    gamertagPlaceholder: game.gamertagPlaceholder || 'Enter in-game ID',
    unifiedApi: Boolean(game.unifiedApi),
    platformApis: (game.platformApis || []).map(sanitizePlatformApiForClient),
    statsMapping: game.statsMapping || {},
    status: game.status || 'CONFIGURED',
    lastVerifiedAt: game.lastVerifiedAt || null,
    lastLatencyMs: game.lastLatencyMs ?? null,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

function normalizePlatformApis(rawApis, platforms, existingApis = []) {
  const existingByPlatform = new Map(
    (existingApis || []).map((a) => [String(a.platform || '').toUpperCase(), a]),
  );
  const list = Array.isArray(rawApis) ? rawApis : [];
  const normalized = [];

  for (const item of list) {
    const plat = String(item.platform || 'ALL').toUpperCase();
    if (plat !== 'ALL' && !VALID_PLATFORMS.has(plat)) continue;
    const prev = existingByPlatform.get(plat);
    const incomingSecret = typeof item.authSecret === 'string' ? item.authSecret.trim() : '';
    const keepSecret = item.clearSecret === true ? '' : (incomingSecret || prev?.authSecret || '');
    normalized.push({
      platform: plat,
      providerPreset: String(item.providerPreset || 'CUSTOM_REST').slice(0, 48),
      baseUrl: String(item.baseUrl || '').trim().replace(/\/+$/, ''),
      playerStatsPath: String(item.playerStatsPath || '').trim(),
      matchResultPath: String(item.matchResultPath || '').trim(),
      httpMethod: String(item.httpMethod || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET',
      authType: VALID_AUTH_TYPES.has(String(item.authType || '').toUpperCase())
        ? String(item.authType).toUpperCase()
        : 'NONE',
      authHeaderName: String(item.authHeaderName || 'X-API-Key').trim().slice(0, 64),
      authParamName: String(item.authParamName || 'api_key').trim().slice(0, 64),
      authSecret: keepSecret,
      launchUriOrPackage: String(item.launchUriOrPackage || '').trim().slice(0, 240),
    });
  }

  // Ensure at least one config exists if platforms provided
  if (normalized.length === 0 && platforms.length > 0) {
    normalized.push({
      platform: platforms[0],
      providerPreset: 'CUSTOM_REST',
      baseUrl: '',
      playerStatsPath: '',
      matchResultPath: '',
      httpMethod: 'GET',
      authType: 'NONE',
      authHeaderName: 'X-API-Key',
      authParamName: 'api_key',
      authSecret: '',
      launchUriOrPackage: '',
    });
  }
  return normalized;
}

function buildResolvedUrl(apiConfig, { playerId = '', matchId = '', platform = '', mode = 'player' }) {
  const base = String(apiConfig.baseUrl || '').trim().replace(/\/+$/, '');
  const rawPath =
    mode === 'match' && apiConfig.matchResultPath
      ? apiConfig.matchResultPath
      : apiConfig.playerStatsPath || apiConfig.matchResultPath || '';
  const interpolate = (str) =>
    String(str)
      .replace(/\{playerId\}/gi, encodeURIComponent(playerId || ''))
      .replace(/\{handle\}/gi, encodeURIComponent(playerId || ''))
      .replace(/\{matchId\}/gi, encodeURIComponent(matchId || ''))
      .replace(/\{platform\}/gi, encodeURIComponent((platform || apiConfig.platform || '').toLowerCase()));

  let full = '';
  if (/^https?:\/\//i.test(rawPath)) {
    full = interpolate(rawPath);
  } else {
    const p = interpolate(rawPath);
    full = p ? `${base}${p.startsWith('/') || p.startsWith('?') ? '' : '/'}${p}` : base;
  }

  const check = validateExternalApiUrl(full);
  if (!check.ok) return check;

  const urlObj = check.url;
  const secret = String(apiConfig.authSecret || '');
  if (apiConfig.authType === 'QUERY_PARAM' && secret) {
    urlObj.searchParams.set(apiConfig.authParamName || 'api_key', secret);
  }

  // Produce a safe redacted URL for displaying in UI
  const safeUrlObj = new URL(urlObj.toString());
  if (apiConfig.authType === 'QUERY_PARAM' && secret) {
    safeUrlObj.searchParams.set(apiConfig.authParamName || 'api_key', '••••••••');
  }

  return { ok: true, fetchUrl: urlObj.toString(), displayUrl: safeUrlObj.toString() };
}

async function executePlatformStatsFetch({
  apiConfig,
  statsMapping = {},
  playerId = '',
  matchId = '',
  platform = '',
  mode = 'player',
}) {
  const built = buildResolvedUrl(apiConfig, { playerId, matchId, platform, mode });
  if (!built.ok) {
    return { ok: false, statusCode: 400, latencyMs: 0, error: built.error };
  }

  const headers = {
    Accept: 'application/json',
    'User-Agent': 'Playverzus-StatsEngine/2.0 (+https://playverzus.xyz)',
  };
  const secret = String(apiConfig.authSecret || '');
  if (apiConfig.authType === 'BEARER_TOKEN' && secret) {
    headers['Authorization'] = `Bearer ${secret}`;
  } else if (apiConfig.authType === 'API_KEY_HEADER' && secret) {
    headers[apiConfig.authHeaderName || 'X-API-Key'] = secret;
  }

  const method = apiConfig.httpMethod === 'POST' ? 'POST' : 'GET';
  const fetchOpts = {
    method,
    headers,
    signal: AbortSignal.timeout(10_000),
  };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify({
      playerId,
      matchId,
      platform: (platform || apiConfig.platform || '').toUpperCase(),
    });
  }

  const startedAt = Date.now();
  try {
    const upstreamRes = await fetch(built.fetchUrl, fetchOpts);
    const latencyMs = Date.now() - startedAt;
    const rawText = await upstreamRes.text();
    let parsedJson = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = null;
    }

    const extractedStats = {};
    if (parsedJson != null && typeof parsedJson === 'object') {
      const mappingKeys = [
        ['score', statsMapping.scorePath],
        ['wins', statsMapping.winsPath],
        ['losses', statsMapping.lossesPath],
        ['kills', statsMapping.killsPath],
        ['rank', statsMapping.rankPath],
        ['winner', statsMapping.winnerPath],
      ];
      for (const [label, dotPath] of mappingKeys) {
        if (dotPath && String(dotPath).trim()) {
          const val = extractDotPath(parsedJson, String(dotPath));
          if (val !== undefined) extractedStats[label] = val;
        }
      }
    }

    const previewStr = rawText.length > 4000 ? `${rawText.slice(0, 4000)}\n... (truncated)` : rawText;

    return {
      ok: upstreamRes.ok,
      statusCode: upstreamRes.status,
      latencyMs,
      resolvedUrl: built.displayUrl,
      platform: (platform || apiConfig.platform || '').toUpperCase(),
      extractedStats,
      isJson: parsedJson !== null,
      rawPreview: previewStr,
      error: upstreamRes.ok
        ? null
        : `Upstream game API responded with HTTP ${upstreamRes.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: 502,
      latencyMs: Date.now() - startedAt,
      resolvedUrl: built.displayUrl,
      platform: (platform || apiConfig.platform || '').toUpperCase(),
      extractedStats: {},
      isJson: false,
      rawPreview: '',
      error: err?.name === 'TimeoutError'
        ? 'Game API timed out after 10 seconds.'
        : (err?.message || 'Failed to reach game API endpoint.'),
    };
  }
}

export async function handleDeveloperApiRequest(req, res, port) {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, `http://localhost:${port}`);
  const pathname = parsed.pathname;

  // 1. Register or upgrade account as GAME_DEVELOPER
  if (pathname === '/api/developer/register-role' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const userId = String(body.userId || '').trim();
      const username = String(body.username || '').trim();
      const studioName = String(body.studioName || '').trim().slice(0, 80) || `${username || 'Indie'} Studio`;
      if (!email && !userId) {
        sendJson(res, 400, { message: 'Email or userId is required.' });
        return true;
      }
      const store = loadStore();
      const key = email || userId;
      store.developers[key] = {
        userId: userId || store.developers[key]?.userId || '',
        email: email || store.developers[key]?.email || '',
        username: username || store.developers[key]?.username || '',
        studioName,
        registeredAt: store.developers[key]?.registeredAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveStore(store);
      sendJson(res, 200, {
        ok: true,
        role: 'GAME_DEVELOPER',
        developer: store.developers[key],
      });
      return true;
    } catch (err) {
      sendJson(res, 400, { message: err.message || 'Invalid request' });
      return true;
    }
  }

  // 2. Check if user is a registered GAME_DEVELOPER
  if (pathname === '/api/developer/role-check' && req.method === 'GET') {
    const email = (parsed.searchParams.get('email') || '').trim().toLowerCase();
    const userId = (parsed.searchParams.get('userId') || '').trim();
    const store = loadStore();
    let found = email ? store.developers[email] : null;
    if (!found && userId) {
      found = Object.values(store.developers).find((d) => d.userId && d.userId === userId) || null;
    }
    sendJson(res, 200, {
      isDeveloper: Boolean(found),
      studioName: found?.studioName || '',
      registeredAt: found?.registeredAt || null,
    });
    return true;
  }

  // 3. List configured developer games
  if (pathname === '/api/developer/games' && req.method === 'GET') {
    const ownerId = (parsed.searchParams.get('ownerId') || '').trim();
    const ownerEmail = (parsed.searchParams.get('ownerEmail') || '').trim().toLowerCase();
    const platform = (parsed.searchParams.get('platform') || '').trim().toUpperCase();
    const store = loadStore();
    let list = store.games;
    if (ownerId || ownerEmail) {
      list = list.filter(
        (g) =>
          (ownerId && g.ownerUserId === ownerId) ||
          (ownerEmail && String(g.ownerEmail || '').toLowerCase() === ownerEmail),
      );
    }
    if (platform && VALID_PLATFORMS.has(platform)) {
      list = list.filter((g) => (g.platforms || []).includes(platform));
    }
    sendJson(res, 200, { games: list.map(sanitizeGameForClient) });
    return true;
  }

  // 4. Create new API-configured game
  if (pathname === '/api/developer/games' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const title = String(body.title || '').trim();
      if (title.length < 2) {
        sendJson(res, 400, { message: 'Game title must be at least 2 characters.' });
        return true;
      }
      const platforms = (Array.isArray(body.platforms) ? body.platforms : [])
        .map((p) => String(p).toUpperCase())
        .filter((p) => VALID_PLATFORMS.has(p));
      if (platforms.length === 0) {
        sendJson(res, 400, { message: 'Select at least one platform (PC, CONSOLE, MOBILE, WEB).' });
        return true;
      }
      const platformApis = normalizePlatformApis(body.platformApis, platforms);
      for (const api of platformApis) {
        if (!api.baseUrl) {
          sendJson(res, 400, {
            message: `Provide a Base API URL for platform ${api.platform}.`,
          });
          return true;
        }
        const urlCheck = validateExternalApiUrl(api.baseUrl);
        if (!urlCheck.ok) {
          sendJson(res, 400, { message: `${api.platform}: ${urlCheck.error}` });
          return true;
        }
      }

      const store = loadStore();
      const shortName =
        String(body.shortName || '').trim().toUpperCase().slice(0, 10) ||
        title.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) ||
        'GAME';
      const id = `dev_${slugify(title) || 'game'}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();

      const newGame = {
        id,
        ownerUserId: String(body.ownerUserId || ''),
        ownerEmail: String(body.ownerEmail || '').toLowerCase(),
        ownerUsername: String(body.ownerUsername || ''),
        studioName: String(body.studioName || 'Independent Studio').trim().slice(0, 80),
        title,
        shortName,
        tagline: String(body.tagline || `${title} · API Stats Integrated`).trim().slice(0, 140),
        gameType: VALID_GAME_TYPES.has(String(body.gameType || '').toUpperCase())
          ? String(body.gameType).toUpperCase()
          : 'HEAD_TO_HEAD',
        platforms,
        posterUrl: String(body.posterUrl || '').trim().slice(0, 500),
        gamertagLabel: String(body.gamertagLabel || 'In-Game Player ID').trim().slice(0, 50),
        gamertagPlaceholder: String(body.gamertagPlaceholder || 'Enter your player handle').trim().slice(0, 60),
        unifiedApi: Boolean(body.unifiedApi),
        platformApis,
        statsMapping: {
          scorePath: String(body.statsMapping?.scorePath || '').trim().slice(0, 120),
          winsPath: String(body.statsMapping?.winsPath || '').trim().slice(0, 120),
          lossesPath: String(body.statsMapping?.lossesPath || '').trim().slice(0, 120),
          killsPath: String(body.statsMapping?.killsPath || '').trim().slice(0, 120),
          rankPath: String(body.statsMapping?.rankPath || '').trim().slice(0, 120),
          winnerPath: String(body.statsMapping?.winnerPath || '').trim().slice(0, 120),
        },
        status: body.verified ? 'VERIFIED_LIVE' : 'CONFIGURED',
        lastVerifiedAt: body.verified ? now : null,
        lastLatencyMs: typeof body.lastLatencyMs === 'number' ? body.lastLatencyMs : null,
        createdAt: now,
        updatedAt: now,
      };

      store.games.unshift(newGame);
      saveStore(store);
      sendJson(res, 201, { ok: true, game: sanitizeGameForClient(newGame) });
      return true;
    } catch (err) {
      sendJson(res, 400, { message: err.message || 'Could not save game configuration.' });
      return true;
    }
  }

  // 5. Live Test Stats Fetch (supports unsaved form config OR saved gameId)
  if (pathname === '/api/developer/test-fetch' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const store = loadStore();
      let apiConfig = null;
      let statsMapping = body.statsMapping || {};
      let matchedGame = null;
      const requestedPlatform = String(body.platform || '').toUpperCase();

      if (body.gameId) {
        matchedGame = store.games.find((g) => g.id === body.gameId) || null;
        if (!matchedGame) {
          sendJson(res, 404, { message: 'Developer game not found.' });
          return true;
        }
        apiConfig =
          matchedGame.platformApis.find((a) => a.platform === requestedPlatform) ||
          matchedGame.platformApis.find((a) => a.platform === 'ALL') ||
          matchedGame.platformApis[0];
        statsMapping = Object.keys(statsMapping).length > 0 ? statsMapping : matchedGame.statsMapping;
      }

      // Allow draft overrides (and fall back to stored secret when testing an edited saved game)
      if (body.apiConfig && typeof body.apiConfig === 'object') {
        const draft = body.apiConfig;
        const storedSecret = apiConfig?.authSecret || '';
        apiConfig = {
          platform: String(draft.platform || requestedPlatform || 'PC').toUpperCase(),
          baseUrl: String(draft.baseUrl || '').trim(),
          playerStatsPath: String(draft.playerStatsPath || '').trim(),
          matchResultPath: String(draft.matchResultPath || '').trim(),
          httpMethod: String(draft.httpMethod || 'GET').toUpperCase(),
          authType: String(draft.authType || 'NONE').toUpperCase(),
          authHeaderName: String(draft.authHeaderName || 'X-API-Key').trim(),
          authParamName: String(draft.authParamName || 'api_key').trim(),
          authSecret: String(draft.authSecret || '').trim() || storedSecret,
        };
      }

      if (!apiConfig || !apiConfig.baseUrl) {
        sendJson(res, 400, { message: 'Provide a Base API URL to test stats fetching.' });
        return true;
      }

      const result = await executePlatformStatsFetch({
        apiConfig,
        statsMapping,
        playerId: String(body.playerId || '').trim(),
        matchId: String(body.matchId || '').trim(),
        platform: requestedPlatform || apiConfig.platform,
        mode: body.mode === 'match' ? 'match' : 'player',
      });

      if (matchedGame && result.ok) {
        matchedGame.status = 'VERIFIED_LIVE';
        matchedGame.lastVerifiedAt = new Date().toISOString();
        matchedGame.lastLatencyMs = result.latencyMs;
        saveStore(store);
      }

      sendJson(res, 200, result);
      return true;
    } catch (err) {
      sendJson(res, 400, { message: err.message || 'Stats test failed.' });
      return true;
    }
  }

  // 6. Live Production Stats Fetch for a saved developer game: GET /api/developer/games/:id/stats
  const statsMatch = pathname.match(/^\/api\/developer\/games\/([^/]+)\/stats$/);
  if (statsMatch && req.method === 'GET') {
    const gameId = decodeURIComponent(statsMatch[1]);
    const playerId = (parsed.searchParams.get('playerId') || '').trim();
    const matchId = (parsed.searchParams.get('matchId') || '').trim();
    const platform = (parsed.searchParams.get('platform') || '').trim().toUpperCase();
    const mode = parsed.searchParams.get('mode') === 'match' ? 'match' : 'player';

    const store = loadStore();
    const game = store.games.find((g) => g.id === gameId);
    if (!game) {
      sendJson(res, 404, { message: 'Developer game not found.' });
      return true;
    }
    const apiConfig =
      game.platformApis.find((a) => a.platform === platform) ||
      game.platformApis.find((a) => a.platform === 'ALL') ||
      game.platformApis[0];
    if (!apiConfig) {
      sendJson(res, 400, { message: 'No platform API configured for this game.' });
      return true;
    }

    const result = await executePlatformStatsFetch({
      apiConfig,
      statsMapping: game.statsMapping,
      playerId,
      matchId,
      platform: platform || apiConfig.platform,
      mode,
    });
    sendJson(res, 200, {
      gameId: game.id,
      title: game.title,
      studioName: game.studioName,
      ...result,
    });
    return true;
  }

  // 7. Update or Delete a developer game: PATCH/DELETE /api/developer/games/:id
  const gameIdMatch = pathname.match(/^\/api\/developer\/games\/([^/]+)$/);
  if (gameIdMatch && (req.method === 'PATCH' || req.method === 'DELETE' || req.method === 'GET')) {
    const gameId = decodeURIComponent(gameIdMatch[1]);
    const store = loadStore();
    const idx = store.games.findIndex((g) => g.id === gameId);
    if (idx === -1) {
      sendJson(res, 404, { message: 'Developer game not found.' });
      return true;
    }

    if (req.method === 'GET') {
      sendJson(res, 200, { game: sanitizeGameForClient(store.games[idx]) });
      return true;
    }

    if (req.method === 'DELETE') {
      store.games.splice(idx, 1);
      saveStore(store);
      sendJson(res, 200, { ok: true, deletedId: gameId });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      const prev = store.games[idx];
      const nextPlatforms = Array.isArray(body.platforms)
        ? body.platforms.map((p) => String(p).toUpperCase()).filter((p) => VALID_PLATFORMS.has(p))
        : prev.platforms;
      if (nextPlatforms.length === 0) {
        sendJson(res, 400, { message: 'At least one platform is required.' });
        return true;
      }

      const nextApis = body.platformApis
        ? normalizePlatformApis(body.platformApis, nextPlatforms, prev.platformApis)
        : prev.platformApis;

      for (const api of nextApis) {
        if (!api.baseUrl) {
          sendJson(res, 400, { message: `Provide a Base API URL for ${api.platform}.` });
          return true;
        }
        const urlCheck = validateExternalApiUrl(api.baseUrl);
        if (!urlCheck.ok) {
          sendJson(res, 400, { message: `${api.platform}: ${urlCheck.error}` });
          return true;
        }
      }

      const now = new Date().toISOString();
      const updated = {
        ...prev,
        title: body.title ? String(body.title).trim() : prev.title,
        shortName: body.shortName
          ? String(body.shortName).trim().toUpperCase().slice(0, 10)
          : prev.shortName,
        tagline: body.tagline !== undefined ? String(body.tagline).trim().slice(0, 140) : prev.tagline,
        studioName: body.studioName ? String(body.studioName).trim().slice(0, 80) : prev.studioName,
        gameType: VALID_GAME_TYPES.has(String(body.gameType || '').toUpperCase())
          ? String(body.gameType).toUpperCase()
          : prev.gameType,
        platforms: nextPlatforms,
        posterUrl: body.posterUrl !== undefined ? String(body.posterUrl).trim().slice(0, 500) : prev.posterUrl,
        gamertagLabel: body.gamertagLabel ? String(body.gamertagLabel).trim().slice(0, 50) : prev.gamertagLabel,
        gamertagPlaceholder: body.gamertagPlaceholder
          ? String(body.gamertagPlaceholder).trim().slice(0, 60)
          : prev.gamertagPlaceholder,
        unifiedApi: body.unifiedApi !== undefined ? Boolean(body.unifiedApi) : prev.unifiedApi,
        platformApis: nextApis,
        statsMapping: body.statsMapping
          ? {
              scorePath: String(body.statsMapping.scorePath || '').trim().slice(0, 120),
              winsPath: String(body.statsMapping.winsPath || '').trim().slice(0, 120),
              lossesPath: String(body.statsMapping.lossesPath || '').trim().slice(0, 120),
              killsPath: String(body.statsMapping.killsPath || '').trim().slice(0, 120),
              rankPath: String(body.statsMapping.rankPath || '').trim().slice(0, 120),
              winnerPath: String(body.statsMapping.winnerPath || '').trim().slice(0, 120),
            }
          : prev.statsMapping,
        status: body.verified ? 'VERIFIED_LIVE' : prev.status,
        lastVerifiedAt: body.verified ? now : prev.lastVerifiedAt,
        lastLatencyMs: typeof body.lastLatencyMs === 'number' ? body.lastLatencyMs : prev.lastLatencyMs,
        updatedAt: now,
      };

      store.games[idx] = updated;
      saveStore(store);
      sendJson(res, 200, { ok: true, game: sanitizeGameForClient(updated) });
      return true;
    } catch (err) {
      sendJson(res, 400, { message: err.message || 'Could not update game configuration.' });
      return true;
    }
  }

  return false;
}
