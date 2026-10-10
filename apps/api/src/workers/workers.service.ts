import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { TournamentEngine, RatingService, namedLogger } from '@playverzus/core';
import { RedisService } from '../redis/redis.service';
import { PushService } from '../push/push.service';

const log = namedLogger('WorkersService');

@Injectable()
export class WorkersService implements OnModuleInit {
  private readonly logger = new Logger(WorkersService.name);
  private supabase: TypedSupabaseClient;
  private tournamentEngine: TournamentEngine;
  private ratingService: RatingService;

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
    log.info('initializing background workers and schedules');

    // 1. no-show-checker (every 30s)
    setInterval(() => this.checkNoShows(), 30_000);

    // 2. tournament-starter (every 30s)
    setInterval(() => this.checkTournamentsToStart(), 30_000);

    // 3. training-dataset-flusher (every 60s)
    setInterval(() => this.flushTrainingDataset(), 60_000);

    // 4. settled-match notifier (every 20s) — pushes device notifications for match results
    setInterval(() => this.notifySettledMatches(), 20_000);
  }

  async checkNoShows() {
    // Distributed lock prevents duplicate processing on multi-instance deploys
    const locked = await this.redis.acquireLock('no-show-checker', 25);
    if (!locked) return;

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
          await this.push.sendToUsers(userIds, {
            title: 'Match Forfeited — No Show',
            body: 'A player did not show up. The match has been settled automatically.',
            type: 'match',
            url: '/challenges',
          });
        }
      }
    } catch (err) {
      log.warn({ err }, 'error in no-show checker');
    } finally {
      await this.redis.releaseLock('no-show-checker');
    }
  }

  async checkTournamentsToStart() {
    const locked = await this.redis.acquireLock('tournament-starter', 25);
    if (!locked) return;

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
    } finally {
      await this.redis.releaseLock('tournament-starter');
    }
  }

  async flushTrainingDataset() {
    const locked = await this.redis.acquireLock('training-flusher', 55);
    if (!locked) return;

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
    } finally {
      await this.redis.releaseLock('training-flusher');
    }
  }

  /**
   * Scans for matches that just settled (within last 30s) and haven't had
   * a push notification sent yet. Marks them in Redis to avoid duplicates.
   */
  async notifySettledMatches() {
    const locked = await this.redis.acquireLock('settled-notifier', 18);
    if (!locked) return;

    try {
      const since = new Date(Date.now() - 30_000).toISOString();
      const { data: matches } = await this.supabase
        .from('matches')
        .select('id, player_a, player_b, winner_id, entry_fee, prize_pool')
        .eq('status', 'SETTLED')
        .gte('updated_at', since);

      if (matches && matches.length > 0) {
        for (const m of matches) {
          // Only notify once per match
          const alreadyNotified = await this.redis.get(`notified:settled:${m.id}`);
          if (alreadyNotified) continue;

          await this.redis.set(`notified:settled:${m.id}`, '1', 60 * 60 * 24); // 24h dedup

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
      }
    } catch (err) {
      log.warn({ err }, 'error in settled-match notifier');
    } finally {
      await this.redis.releaseLock('settled-notifier');
    }
  }
}
