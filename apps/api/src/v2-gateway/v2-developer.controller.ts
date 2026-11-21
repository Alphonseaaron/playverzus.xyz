import {
  Body,
  Controller,
  Delete,
  Get,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';

const VALID_PLATFORMS = new Set(['PC', 'CONSOLE', 'MOBILE', 'WEB']);
const VALID_GAME_TYPES = new Set(['HEAD_TO_HEAD', 'HIGH_SCORE', 'BINARY_RESULT']);
const VALID_AUTH_TYPES = new Set(['NONE', 'API_KEY_HEADER', 'BEARER_TOKEN', 'QUERY_PARAM']);

interface DevStore {
  developers: Record<string, any>;
  games: any[];
}

@Controller('developer')
export class V2DeveloperController {
  private memStore: DevStore = { developers: {}, games: [] };
  private readonly redisKey = 'playverzus_v2_dev_store_v1';

  constructor(@Optional() private readonly redis?: RedisService) {}

  private async loadStore(): Promise<DevStore> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(this.redisKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.memStore = {
            developers: parsed?.developers || {},
            games: Array.isArray(parsed?.games) ? parsed.games : [],
          };
        }
      } catch {}
    }
    return this.memStore;
  }

  private async saveStore(store: DevStore): Promise<void> {
    this.memStore = store;
    if (this.redis) {
      try {
        await this.redis.set(this.redisKey, JSON.stringify(store), 60 * 60 * 24 * 365);
      } catch {}
    }
  }

  private validateExternalApiUrl(urlStr: string): { ok: boolean; url?: URL; error?: string } {
    let u: URL;
    try {
      u = new URL(urlStr);
    } catch {
      return { ok: false, error: 'Invalid API URL format. Include https:// or http://' };
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return { ok: false, error: 'API URL must use https:// or http://' };
    }
    const host = u.hostname.toLowerCase();
    if (
      host === '169.254.169.254' ||
      host === '169.254.170.2' ||
      host === 'metadata.google.internal' ||
      host === 'metadata'
    ) {
      return { ok: false, error: 'Target host is restricted.' };
    }
    return { ok: true, url: u };
  }

  private extractDotPath(obj: any, dotPath?: string): any {
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

  private sanitizePlatformApi(api: any) {
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

  private sanitizeGame(game: any) {
    return {
      ...game,
      platformApis: (game.platformApis || []).map((a: any) => this.sanitizePlatformApi(a)),
    };
  }

  private normalizePlatformApis(rawApis: any[], platforms: string[], existingApis: any[] = []) {
    const existingByPlatform = new Map(
      (existingApis || []).map((a) => [String(a.platform || '').toUpperCase(), a]),
    );
    const list = Array.isArray(rawApis) ? rawApis : [];
    const normalized: any[] = [];

    for (const item of list) {
      const plat = String(item.platform || 'ALL').toUpperCase();
      if (plat !== 'ALL' && !VALID_PLATFORMS.has(plat)) continue;
      const prev = existingByPlatform.get(plat);
      const incomingSecret = typeof item.authSecret === 'string' ? item.authSecret.trim() : '';
      const keepSecret = item.clearSecret === true ? '' : incomingSecret || prev?.authSecret || '';
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
    return normalized;
  }

  private async executePlatformStatsFetch(params: {
    apiConfig: any;
    statsMapping?: any;
    playerId?: string;
    matchId?: string;
    platform?: string;
    mode?: string;
  }) {
    const { apiConfig, statsMapping = {}, playerId = '', matchId = '', platform = '', mode = 'player' } = params;
    const base = String(apiConfig.baseUrl || '').trim().replace(/\/+$/, '');
    const rawPath =
      mode === 'match' && apiConfig.matchResultPath
        ? apiConfig.matchResultPath
        : apiConfig.playerStatsPath || apiConfig.matchResultPath || '';
    const interpolate = (str: string) =>
      String(str)
        .replace(/\{playerId\}/gi, encodeURIComponent(playerId))
        .replace(/\{handle\}/gi, encodeURIComponent(playerId))
        .replace(/\{matchId\}/gi, encodeURIComponent(matchId))
        .replace(/\{platform\}/gi, encodeURIComponent((platform || apiConfig.platform || '').toLowerCase()));

    const p = interpolate(rawPath);
    const full = /^https?:\/\//i.test(rawPath)
      ? p
      : p
        ? `${base}${p.startsWith('/') || p.startsWith('?') ? '' : '/'}${p}`
        : base;

    const check = this.validateExternalApiUrl(full);
    if (!check.ok || !check.url) {
      return { ok: false, statusCode: 400, latencyMs: 0, error: check.error };
    }

    const urlObj = check.url;
    const secret = String(apiConfig.authSecret || '');
    if (apiConfig.authType === 'QUERY_PARAM' && secret) {
      urlObj.searchParams.set(apiConfig.authParamName || 'api_key', secret);
    }
    const safeUrlObj = new URL(urlObj.toString());
    if (apiConfig.authType === 'QUERY_PARAM' && secret) {
      safeUrlObj.searchParams.set(apiConfig.authParamName || 'api_key', '••••••••');
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'Playverzus-StatsEngine/2.0 (+https://playverzus.xyz)',
    };
    if (apiConfig.authType === 'BEARER_TOKEN' && secret) {
      headers['Authorization'] = `Bearer ${secret}`;
    } else if (apiConfig.authType === 'API_KEY_HEADER' && secret) {
      headers[apiConfig.authHeaderName || 'X-API-Key'] = secret;
    }

    const method = apiConfig.httpMethod === 'POST' ? 'POST' : 'GET';
    const startedAt = Date.now();
    try {
      const upstreamRes = await fetch(urlObj.toString(), {
        method,
        headers: method === 'POST' ? { ...headers, 'Content-Type': 'application/json' } : headers,
        body:
          method === 'POST'
            ? JSON.stringify({ playerId, matchId, platform: (platform || apiConfig.platform || '').toUpperCase() })
            : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      const latencyMs = Date.now() - startedAt;
      const rawText = await upstreamRes.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {}

      const extractedStats: Record<string, any> = {};
      if (parsedJson && typeof parsedJson === 'object') {
        const pairs: Array<[string, string | undefined]> = [
          ['score', statsMapping.scorePath],
          ['wins', statsMapping.winsPath],
          ['losses', statsMapping.lossesPath],
          ['kills', statsMapping.killsPath],
          ['rank', statsMapping.rankPath],
          ['winner', statsMapping.winnerPath],
        ];
        for (const [k, dot] of pairs) {
          const val = this.extractDotPath(parsedJson, dot);
          if (val !== undefined) extractedStats[k] = val;
        }
      }

      return {
        ok: upstreamRes.ok,
        statusCode: upstreamRes.status,
        latencyMs,
        resolvedUrl: safeUrlObj.toString(),
        platform: (platform || apiConfig.platform || '').toUpperCase(),
        extractedStats,
        isJson: parsedJson !== null,
        rawPreview: rawText.length > 4000 ? `${rawText.slice(0, 4000)}\n... (truncated)` : rawText,
        error: upstreamRes.ok ? null : `Upstream game API responded with HTTP ${upstreamRes.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        statusCode: 502,
        latencyMs: Date.now() - startedAt,
        resolvedUrl: safeUrlObj.toString(),
        platform: (platform || apiConfig.platform || '').toUpperCase(),
        extractedStats: {},
        isJson: false,
        rawPreview: '',
        error: err?.message || 'Failed to reach game API endpoint.',
      };
    }
  }

  @Post('register-role')
  async registerRole(@Body() body: any) {
    const email = String(body?.email || '').trim().toLowerCase();
    const userId = String(body?.userId || '').trim();
    const username = String(body?.username || '').trim();
    const studioName = String(body?.studioName || '').trim().slice(0, 80) || `${username || 'Indie'} Studio`;
    if (!email && !userId) throw new BadRequestException('Email or userId is required.');
    const store = await this.loadStore();
    const key = email || userId;
    store.developers[key] = {
      userId: userId || store.developers[key]?.userId || '',
      email: email || store.developers[key]?.email || '',
      username: username || store.developers[key]?.username || '',
      studioName,
      registeredAt: store.developers[key]?.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveStore(store);
    return { ok: true, role: 'GAME_DEVELOPER', developer: store.developers[key] };
  }

  @Get('role-check')
  async roleCheck(@Query('email') emailRaw?: string, @Query('userId') userIdRaw?: string) {
    const email = String(emailRaw || '').trim().toLowerCase();
    const userId = String(userIdRaw || '').trim();
    const store = await this.loadStore();
    let found = email ? store.developers[email] : null;
    if (!found && userId) {
      found = Object.values(store.developers).find((d: any) => d.userId && d.userId === userId) || null;
    }
    return {
      isDeveloper: Boolean(found),
      studioName: found?.studioName || '',
      registeredAt: found?.registeredAt || null,
    };
  }

  @Get('games')
  async listGames(@Query('ownerId') ownerId?: string, @Query('platform') platform?: string) {
    const store = await this.loadStore();
    let list = store.games;
    if (ownerId) list = list.filter((g) => g.ownerUserId === ownerId);
    if (platform && VALID_PLATFORMS.has(platform.toUpperCase())) {
      list = list.filter((g) => (g.platforms || []).includes(platform.toUpperCase()));
    }
    return { games: list.map((g) => this.sanitizeGame(g)) };
  }

  @Post('games')
  async createGame(@Body() body: any) {
    const title = String(body?.title || '').trim();
    if (title.length < 2) throw new BadRequestException('Game title must be at least 2 characters.');
    const platforms = (Array.isArray(body?.platforms) ? body.platforms : [])
      .map((p: any) => String(p).toUpperCase())
      .filter((p: string) => VALID_PLATFORMS.has(p));
    if (platforms.length === 0) throw new BadRequestException('Select at least one platform.');
    const platformApis = this.normalizePlatformApis(body.platformApis, platforms);
    for (const api of platformApis) {
      if (!api.baseUrl) throw new BadRequestException(`Provide a Base API URL for ${api.platform}.`);
      const check = this.validateExternalApiUrl(api.baseUrl);
      if (!check.ok) throw new BadRequestException(`${api.platform}: ${check.error}`);
    }

    const store = await this.loadStore();
    const shortName =
      String(body.shortName || '').trim().toUpperCase().slice(0, 10) ||
      title.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) ||
      'GAME';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
    const id = `dev_${slug || 'game'}_${crypto.randomBytes(3).toString('hex')}`;
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
        scorePath: String(body.statsMapping?.scorePath || '').trim(),
        winsPath: String(body.statsMapping?.winsPath || '').trim(),
        lossesPath: String(body.statsMapping?.lossesPath || '').trim(),
        killsPath: String(body.statsMapping?.killsPath || '').trim(),
        rankPath: String(body.statsMapping?.rankPath || '').trim(),
        winnerPath: String(body.statsMapping?.winnerPath || '').trim(),
      },
      status: body.verified ? 'VERIFIED_LIVE' : 'CONFIGURED',
      lastVerifiedAt: body.verified ? now : null,
      lastLatencyMs: typeof body.lastLatencyMs === 'number' ? body.lastLatencyMs : null,
      createdAt: now,
      updatedAt: now,
    };

    store.games.unshift(newGame);
    await this.saveStore(store);
    return { ok: true, game: this.sanitizeGame(newGame) };
  }

  @Post('test-fetch')
  async testFetch(@Body() body: any) {
    const store = await this.loadStore();
    let apiConfig: any = null;
    let statsMapping = body?.statsMapping || {};
    let matchedGame: any = null;
    const requestedPlatform = String(body?.platform || '').toUpperCase();

    if (body?.gameId) {
      matchedGame = store.games.find((g) => g.id === body.gameId) || null;
      if (!matchedGame) throw new NotFoundException('Developer game not found.');
      apiConfig =
        matchedGame.platformApis.find((a: any) => a.platform === requestedPlatform) ||
        matchedGame.platformApis.find((a: any) => a.platform === 'ALL') ||
        matchedGame.platformApis[0];
      statsMapping = Object.keys(statsMapping).length > 0 ? statsMapping : matchedGame.statsMapping;
    }

    if (body?.apiConfig && typeof body.apiConfig === 'object') {
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
      throw new BadRequestException('Provide a Base API URL to test stats fetching.');
    }

    const result = await this.executePlatformStatsFetch({
      apiConfig,
      statsMapping,
      playerId: String(body?.playerId || '').trim(),
      matchId: String(body?.matchId || '').trim(),
      platform: requestedPlatform || apiConfig.platform,
      mode: body?.mode === 'match' ? 'match' : 'player',
    });

    if (matchedGame && result.ok) {
      matchedGame.status = 'VERIFIED_LIVE';
      matchedGame.lastVerifiedAt = new Date().toISOString();
      matchedGame.lastLatencyMs = result.latencyMs;
      await this.saveStore(store);
    }

    return result;
  }

  @Get('games/:id/stats')
  async getGameStats(
    @Param('id') id: string,
    @Query('playerId') playerId = '',
    @Query('matchId') matchId = '',
    @Query('platform') platform = '',
    @Query('mode') mode = 'player',
  ) {
    const store = await this.loadStore();
    const game = store.games.find((g) => g.id === id);
    if (!game) throw new NotFoundException('Developer game not found.');
    const platUpper = platform.toUpperCase();
    const apiConfig =
      game.platformApis.find((a: any) => a.platform === platUpper) ||
      game.platformApis.find((a: any) => a.platform === 'ALL') ||
      game.platformApis[0];
    if (!apiConfig) throw new BadRequestException('No platform API configured for this game.');
    const res = await this.executePlatformStatsFetch({
      apiConfig,
      statsMapping: game.statsMapping,
      playerId,
      matchId,
      platform: platUpper || apiConfig.platform,
      mode,
    });
    return { gameId: game.id, title: game.title, studioName: game.studioName, ...res };
  }

  @Patch('games/:id')
  async updateGame(@Param('id') id: string, @Body() body: any) {
    const store = await this.loadStore();
    const idx = store.games.findIndex((g) => g.id === id);
    if (idx === -1) throw new NotFoundException('Developer game not found.');
    const prev = store.games[idx];
    const nextPlatforms = Array.isArray(body?.platforms)
      ? body.platforms.map((p: any) => String(p).toUpperCase()).filter((p: string) => VALID_PLATFORMS.has(p))
      : prev.platforms;
    const nextApis = body?.platformApis
      ? this.normalizePlatformApis(body.platformApis, nextPlatforms, prev.platformApis)
      : prev.platformApis;

    const now = new Date().toISOString();
    const updated = {
      ...prev,
      title: body?.title ? String(body.title).trim() : prev.title,
      shortName: body?.shortName ? String(body.shortName).trim().toUpperCase().slice(0, 10) : prev.shortName,
      tagline: body?.tagline !== undefined ? String(body.tagline).trim().slice(0, 140) : prev.tagline,
      platforms: nextPlatforms,
      unifiedApi: body?.unifiedApi !== undefined ? Boolean(body.unifiedApi) : prev.unifiedApi,
      platformApis: nextApis,
      statsMapping: body?.statsMapping ? { ...prev.statsMapping, ...body.statsMapping } : prev.statsMapping,
      updatedAt: now,
    };
    store.games[idx] = updated;
    await this.saveStore(store);
    return { ok: true, game: this.sanitizeGame(updated) };
  }

  @Delete('games/:id')
  async deleteGame(@Param('id') id: string) {
    const store = await this.loadStore();
    const idx = store.games.findIndex((g) => g.id === id);
    if (idx === -1) throw new NotFoundException('Developer game not found.');
    store.games.splice(idx, 1);
    await this.saveStore(store);
    return { ok: true, deletedId: id };
  }
}
