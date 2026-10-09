import type { TypedSupabaseClient } from '@playverzus/db';

import { DEFAULT_ELO, QUICK_MATCH_ELO_WINDOW, type GameType, type MatchFormat } from '../constants';
import { namedLogger } from '../logger';

import { MatchService } from './MatchService';

const log = namedLogger('QuickMatch');

export interface QueueTicket {
  userId: string;
  profileId: string;
  gameType: GameType;
  format: MatchFormat;
  rating: number;
  enqueuedAt: number;
  deviceFingerprint?: string;
  ipSubnet?: string;
}

export interface QuickMatchDeps {
  client: TypedSupabaseClient;
  matchService: MatchService;
}

/**
 * In-memory quick-match queue keyed by gameType.
 * Proximity-based matching on ELO with anti-collusion & win-trading guards.
 */
export class QuickMatchService {
  private queues = new Map<GameType, QueueTicket[]>();

  constructor(private readonly deps: QuickMatchDeps) {}

  async enqueue(
    userId: string,
    profileId: string,
    gameType: GameType,
    format: MatchFormat,
    telemetry?: { deviceFingerprint?: string; ipSubnet?: string }
  ): Promise<void> {
    const rating = await this.getRating(userId, gameType);
    const ticket: QueueTicket = {
      userId,
      profileId,
      gameType,
      format,
      rating,
      enqueuedAt: Date.now(),
      deviceFingerprint: telemetry?.deviceFingerprint,
      ipSubnet: telemetry?.ipSubnet,
    };
    const q = this.queues.get(gameType) ?? [];
    q.push(ticket);
    this.queues.set(gameType, q);

    await this.tryMatch(gameType);
  }

  async dequeue(userId: string, gameType: GameType): Promise<void> {
    const q = this.queues.get(gameType);
    if (!q) return;
    const idx = q.findIndex((t) => t.userId === userId);
    if (idx >= 0) q.splice(idx, 1);
  }

  async checkRematchLimit(playerA: string, playerB: string, maxRematches24h = 3): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data, error } = await this.deps.client
        .from('matches')
        .select('id')
        .or(`and(player_a.eq.${playerA},player_b.eq.${playerB}),and(player_a.eq.${playerB},player_b.eq.${playerA})`)
        .gte('created_at', twentyFourHoursAgo);

      if (error || !data) return false;
      return data.length >= maxRematches24h;
    } catch {
      return false;
    }
  }

  private async tryMatch(gameType: GameType): Promise<void> {
    const q = this.queues.get(gameType);
    if (!q || q.length < 2) return;

    const sorted = [...q].sort((a, b) => a.enqueuedAt - b.enqueuedAt);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        if (a.userId === b.userId) continue;
        if (a.profileId !== b.profileId) continue;
        if (a.format !== b.format) continue;
        if (Math.abs(a.rating - b.rating) > QUICK_MATCH_ELO_WINDOW) continue;

        // Anti-Fraud 1: Device and Subnet Collision Guard (Prevent local multi-accounting)
        if (a.deviceFingerprint && b.deviceFingerprint && a.deviceFingerprint === b.deviceFingerprint) {
          log.warn({ a: a.userId, b: b.userId }, 'collusion guard: identical device fingerprint detected');
          continue;
        }
        if (a.ipSubnet && b.ipSubnet && a.ipSubnet === b.ipSubnet) {
          log.warn({ a: a.userId, b: b.userId }, 'collusion guard: identical IP subnet collision detected');
          continue;
        }

        // Anti-Fraud 2: Win-trading rematch frequency cap (max 3 matches per 24 hours)
        const isRematchCapped = await this.checkRematchLimit(a.userId, b.userId, 3);
        if (isRematchCapped) {
          log.warn({ a: a.userId, b: b.userId }, 'collusion guard: 24h rematch frequency limit reached (>=3)');
          continue;
        }

        await this.deps.matchService.create({
          creatorId: a.userId,
          profileId: a.profileId,
          playerA: a.userId,
          playerB: b.userId,
          format: a.format,
        });
        await this.dequeue(a.userId, gameType);
        await this.dequeue(b.userId, gameType);
        log.info({ a: a.userId, b: b.userId, gameType }, 'quick match created');
        return;
      }
    }
  }

  private async getRating(userId: string, gameType: GameType): Promise<number> {
    const { data } = await this.deps.client
      .from('ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('game_type', gameType)
      .maybeSingle();
    return data?.rating ?? DEFAULT_ELO;
  }
}
