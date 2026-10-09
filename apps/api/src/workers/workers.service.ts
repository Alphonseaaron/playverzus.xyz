import { Injectable, OnModuleInit } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { TournamentEngine, RatingService, namedLogger } from '@playverzus/core';

const log = namedLogger('WorkersService');

@Injectable()
export class WorkersService implements OnModuleInit {
  private supabase: TypedSupabaseClient;
  private tournamentEngine: TournamentEngine;
  private ratingService: RatingService;

  constructor() {
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
  }

  async checkNoShows() {
    try {
      const now = new Date().toISOString();
      const { data: matches } = await this.supabase
        .from('matches')
        .select('id')
        .in('status', ['LIVE', 'ACCEPTED'])
        .lt('no_show_deadline', now);

      if (matches && matches.length > 0) {
        log.info({ count: matches.length }, 'evaluating expired no-show deadlines');
        for (const m of matches) {
          await this.tournamentEngine.handleNoShow(m.id);
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
        .select('id')
        .eq('status', 'CHECKIN')
        .lt('checkin_closes_at', now);

      if (tournaments && tournaments.length > 0) {
        log.info({ count: tournaments.length }, 'starting checked-in tournaments');
        for (const t of tournaments) {
          await this.supabase.from('tournaments').update({ status: 'LIVE' }).eq('id', t.id);
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
}
