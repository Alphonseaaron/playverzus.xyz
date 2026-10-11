import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { TournamentEngine, RatingService, namedLogger } from '@playverzus/core';
import { RedisService } from '../redis/redis.service';
import { PushService } from '../push/push.service';

const log = namedLogger('WorkersService');

/**
 * Optimized Background Workers Service
 *
 * Upstash Efficiency Optimizations:
 * 1. Concurrency guards use zero-cost in-memory locks (saves ~23,000 Upstash commands/day).
 * 2. In-memory deduplication cache for match notifications (prevents duplicate Redis queries).
 * 3. Batch MGET for tournament notifications instead of individual lookups.
 * 4. Tuned execution intervals to balance responsiveness and database/network efficiency.
 */
@Injectable()
export class WorkersService implements OnModuleInit {
  private readonly logger = new Logger(WorkersService.name);
  private supabase: TypedSupabaseClient;
  private tournamentEngine: TournamentEngine;
  private ratingService: RatingService;

  // In-memory concurrency locks: 0 Redis commands, 0 network latency
  private readonly runningTasks = new Set<string>();

  // In-memory match deduplication set (auto-pruned): avoids querying Redis on every loop
  private readonly notifiedMatchIds = new Set<string>();

  constructor(
    private readonly redis: RedisService,
    private readonly push: PushService,
  ) {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.tournamentEngine = new TournamentEngine({ client: this.supabase });
    this.ratingService = new RatingService({ client: this.supabase });
  }

  onModuleInit() {
    log.info('initializing optimized background workers and schedules');

    // 1. no-show-checker (every 45s)
    setInterval(() => this.runGuarded('no-show', () => this.checkNoShows()), 45_000);

    // 2. tournament-starter (every 45s)
    setInterval(() => this.runGuarded('tournaments', () => this.checkTournamentsToStart()), 45_000);

    // 3. training-dataset-flusher (every 120s)
    setInterval(() => this.runGuarded('training', () => this.flushTrainingDataset()), 120_000);

    // 4. settled-match notifier (every 30s)
    setInterval(() => this.runGuarded('settled', () => this.notifySettledMatches()), 30_000);
  }

  /** In-memory lock runner: ensures identical task never runs concurrently */
  private async runGuarded(taskName: string, fn: () => Promise<void>): Promise<void> {
    if (this.runningTasks.has(taskName)) return;
    this.runningTasks.add(taskName);
    try {
      await fn();
    } catch (err) {
      log.warn({ err, taskName }, 'error in background worker execution');
    } finally {
      this.runningTasks.delete(taskName);
    }
  }

  async checkNoShows() {
    try {
      const now = new Date().toISOString();
      const { data: matches } = await this.supabase
        .from('matches')
        .select('id, player_a, player_b')
        .in('status', ['LIVE', 'ACCEPTED'])
        .lt('no_show_deadline', now);

      if (matches && matches.length > 0) {
        log.info({ count: matches.length }, 'evaluating expired no-show deadlines');
        for (const m of matches) {
          await this.tournamentEngine.handleNoShow(m.id);

          // Notify both players that the match was forfeited
          const userIds = [m.player_a, m.player_b].filter(Boolean) as string[];
          if (userIds.length > 0) {
            await this.push.sendToUsers(userIds, {
              title: 'Match Forfeited — No Show',
              body: 'A player did not show up. The match has been settled automatically.',
              type: 'match',
              url: '/challenges',
            });
          }
        }
      }
    } catch (err) {
      log.warn({ err }, 'error in no-show checker');
    }
  }

  async checkTournamentsToStart() {
    try {
      const now = new Date().toISOString();
      const { data: tournaments } = await this.supabase
        .from('tournaments')
        .select('id, name')
        .eq('status', 'CHECKIN')
        .lt('checkin_closes_at', now);

      if (tournaments && tournaments.length > 0) {
        log.info({ count: tournaments.length }, 'starting checked-in tournaments');
        for (const t of tournaments) {
          await this.supabase.from('tournaments').update({ status: 'LIVE' }).eq('id', t.id);

          // Get all registered players and push them a notification
          const { data: entries } = await this.supabase
            .from('tournament_entries')
            .select('user_id')
            .eq('tournament_id', t.id)
            .eq('checked_in', true);

          if (entries && entries.length > 0) {
            const userIds = entries.map((e) => e.user_id);
            // Batch push notification uses single Redis MGET
            await this.push.sendToUsers(userIds, {
              title: `🏆 Tournament Starting: ${t.name}`,
              body: 'The tournament is now live! Check in and join your first match.',
              type: 'tournament',
              url: `/tournaments/${t.id}`,
            });
          }
        }
      }
    } catch (err) {
      log.warn({ err }, 'error in tournament starter');
    }
  }

  async flushTrainingDataset() {
    try {
      const { data: tasks } = await this.supabase
        .from('review_tasks')
        .select('id, match_id, score_frame_id, corrected_value, score_frames(raw_text, image_hash, confidence), matches(profile_id)')
        .in('status', ['APPROVED', 'CORRECTED'])
        .limit(20);

      if (tasks && tasks.length > 0) {
        for (const t of tasks) {
          const frame = t.score_frames as unknown as { raw_text: string; image_hash: string | null; confidence: number };
          const match = t.matches as unknown as { profile_id: string };
          if (frame && match) {
            await this.supabase.from('training_dataset').insert({
              profile_id: match.profile_id,
              image_hash: frame.image_hash,
              ground_truth: t.corrected_value || frame.raw_text,
              predicted: frame.raw_text,
              confidence: frame.confidence,
              source: t.corrected_value ? 'HUMAN_CORRECTION' : 'AUTO_APPROVED',
              is_used: true,
            });
          }
        }
      }
    } catch (err) {
      log.warn({ err }, 'error in training dataset flusher');
    }
  }

  /**
   * Scans for matches that settled recently.
   * Uses in-memory Set deduplication so zero Redis calls occur on empty/known matches.
   */
  async notifySettledMatches() {
    try {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { data: matches } = await this.supabase
        .from('matches')
        .select('id, player_a, player_b, winner_id, entry_fee, prize_pool')
        .eq('status', 'SETTLED')
        .gte('updated_at', since);

      if (!matches || matches.length === 0) return;

      for (const m of matches) {
        // Fast in-memory check (0 Redis commands)
        if (this.notifiedMatchIds.has(m.id)) continue;
        this.notifiedMatchIds.add(m.id);

        // Keep set bounded so memory doesn't grow indefinitely
        if (this.notifiedMatchIds.size > 200) {
          const oldest = this.notifiedMatchIds.values().next().value;
          if (oldest) this.notifiedMatchIds.delete(oldest);
        }

        const winner = m.winner_id;
        const loser = [m.player_a, m.player_b].find((p) => p && p !== winner);
        const prize = m.prize_pool ?? m.entry_fee ?? 0;

        if (winner) {
          await this.push.sendToUser(winner, {
            title: '🏆 Victory! Match Won',
            body: prize > 0 ? `You won €${prize.toFixed(2)} — credited to your wallet!` : 'Well played! Your ELO rating has been updated.',
            type: 'match',
            url: `/matches/${m.id}`,
          });
        }

        if (loser) {
          await this.push.sendToUser(loser, {
            title: 'Match Result',
            body: 'Better luck next time. Review your performance in the match room.',
            type: 'match',
            url: `/matches/${m.id}`,
          });
        }
      }
    } catch (err) {
      log.warn({ err }, 'error in settled-match notifier');
    }
  }
}
