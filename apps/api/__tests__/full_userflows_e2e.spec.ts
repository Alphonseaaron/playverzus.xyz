import { describe, it, expect } from 'vitest';
import {
  MatchService as CoreMatchService,
  TournamentEngine,
  Leaderboard as CoreLeaderboard,
  FriendshipService,
  WalletService as CoreWalletInterface,
  setWallet,
  verifyGamertagBinding,
  computeTemporalConfidence,
  analyzeScoreStream,
  COUNTRIES,
  type GameProfile,
} from '@playverzus/core';
import type { TypedSupabaseClient } from '@playverzus/db';
import { MatchService as ApiMatchService } from '../src/match/match.service';
import { TournamentService } from '../src/tournament/tournament.service';
import { SocialService } from '../src/social/social.service';
import { LeaderboardService } from '../src/leaderboard/leaderboard.service';
import { WorkersService } from '../src/workers/workers.service';

/**
 * In-Memory Relational Database Simulator for Full Multi-Actor E2E Verification.
 * Implements tables (`profiles`, `game_profiles`, `matches`, `score_frames`, `tournaments`,
 * `tournament_entries`, `disputes`, `review_tasks`, `wallets`, `transactions`, `locks`,
 * `ratings`, `friendships`) and Supabase RPCs (`create_match`, `accept_match`, `start_match`,
 * `submit_score`, `wallet_settle`, `wallet_refund`, `update_rating`, etc.).
 */
function createInMemoryPlatformDb() {
  const tables: Record<string, any[]> = {
    profiles: [
      { id: 'u-usa', username: 'ace_sniper', display_name: 'Ace Sniper', region: 'US', role: 'PLAYER' },
      { id: 'u-ger', username: 'blitz_krieger', display_name: 'Blitz', region: 'DE', role: 'PLAYER' },
      { id: 'u-nga', username: 'lagos_king', display_name: 'Lagos King', region: 'NG', role: 'PLAYER' },
      { id: 'u-bra', username: 'rio_legend', display_name: 'Rio Legend', region: 'BR', role: 'PLAYER' },
    ],
    game_profiles: [
      {
        id: 'game-cs2-pc',
        display_name: 'Counter-Strike 2',
        game_type: 'HEAD_TO_HEAD',
        platform: 'PC',
        roi: { x: 0.4, y: 0.02, w: 0.2, h: 0.08 },
        constraints: { min: 0, max: 30 },
        end_keywords: ['VICTORY', 'MATCH POINT', 'DEFEAT'],
        regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
        approved: true,
        is_official: true,
      },
      {
        id: 'game-fc25-console',
        display_name: 'EA Sports FC 25',
        game_type: 'HEAD_TO_HEAD',
        platform: 'CONSOLE',
        roi: { x: 0.05, y: 0.05, w: 0.2, h: 0.08 },
        constraints: { min: 0, max: 20 },
        end_keywords: ['FULL TIME', 'MATCH OVER', 'FINAL SCORE'],
        regex_pattern: '(\\d{1,2})\\s*[-:]\\s*(\\d{1,2})',
        approved: true,
        is_official: true,
      },
      {
        id: 'game-tekken8-console',
        display_name: 'Tekken 8',
        game_type: 'BINARY_RESULT',
        platform: 'CONSOLE',
        roi: { x: 0.3, y: 0.3, w: 0.4, h: 0.2 },
        constraints: {},
        end_keywords: ['K.O.', 'YOU WIN', 'YOU LOSE', 'VICTORY', 'DEFEAT'],
        regex_pattern: null,
        approved: true,
        is_official: true,
      },
      {
        id: 'game-subway-mobile',
        display_name: 'High Score (Mobile)',
        game_type: 'HIGH_SCORE',
        platform: 'MOBILE',
        roi: { x: 0.65, y: 0.05, w: 0.3, h: 0.08 },
        constraints: { min: 0, max: 1000000, maxJumpPerSec: 5000 },
        end_keywords: ['Game Over', 'High Score'],
        regex_pattern: '([0-9][0-9,\\.]*)',
        approved: true,
        is_official: true,
      },
    ],
    matches: [],
    score_frames: [],
    tournaments: [],
    tournament_entries: [],
    disputes: [],
    review_tasks: [],
    wallets: [
      { user_id: 'u-usa', balance: 1000, locked: 0, currency: 'POINTS' },
      { user_id: 'u-ger', balance: 1000, locked: 0, currency: 'POINTS' },
      { user_id: 'u-nga', balance: 1000, locked: 0, currency: 'POINTS' },
      { user_id: 'u-bra', balance: 1000, locked: 0, currency: 'POINTS' },
    ],
    transactions: [],
    locks: [],
    ratings: [],
    friendships: [],
  };

  let idSeq = 1;
  const nextId = (prefix: string) => `${prefix}-${idSeq++}`;

  function buildQuery(tableName: string) {
    let rows = [...(tables[tableName] || [])];
    let pendingUpdate: Record<string, any> | null = null;
    let pendingInsert: any[] | null = null;
    const filters: Array<(r: any) => boolean> = [];

    const applyFilters = () => {
      const source = tables[tableName] || [];
      return source.filter((r) => filters.every((fn) => fn(r)));
    };

    const executeMutation = () => {
      if (pendingInsert) {
        const inserted: any[] = [];
        for (const item of pendingInsert) {
          const row = {
            id: item.id || nextId(tableName.slice(0, 3)),
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          tables[tableName]!.push(row);
          inserted.push(row);
        }
        pendingInsert = null;
        return inserted;
      }
      if (pendingUpdate) {
        const matched = applyFilters();
        for (const r of matched) {
          Object.assign(r, pendingUpdate);
        }
        pendingUpdate = null;
        return matched;
      }
      return applyFilters();
    };

    const builder: any = {
      select: (_cols?: string) => builder,
      insert: (payload: any) => {
        pendingInsert = Array.isArray(payload) ? payload : [payload];
        return builder;
      },
      upsert: (payload: any, opts?: { onConflict?: string }) => {
        const items = Array.isArray(payload) ? payload : [payload];
        const key = opts?.onConflict || 'id';
        const results: any[] = [];
        for (const item of items) {
          const existing = (tables[tableName] || []).find((r) => r[key] === item[key]);
          if (existing) {
            Object.assign(existing, item);
            results.push(existing);
          } else {
            const row = {
              id: item.id || nextId(tableName.slice(0, 3)),
              created_at: new Date().toISOString(),
              ...item,
            };
            tables[tableName]!.push(row);
            results.push(row);
          }
        }
        rows = results;
        return {
          select: () => ({
            single: async () => ({ data: results[0] ?? null, error: null }),
            maybeSingle: async () => ({ data: results[0] ?? null, error: null }),
          }),
        };
      },
      update: (updates: Record<string, any>) => {
        pendingUpdate = updates;
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      is: (col: string, val: any) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val));
        return builder;
      },
      not: (col: string, op: string, val: any) => {
        if (op === 'is' && val === null) {
          filters.push((r) => r[col] !== null && r[col] !== undefined);
        }
        return builder;
      },
      or: (expr: string) => {
        filters.push((r) => {
          return expr.split(',').some((part) => {
            const [col, , val] = part.split('.');
            return r[col!] === val;
          });
        });
        return builder;
      },
      lt: (col: string, val: any) => {
        filters.push((r) => r[col] && r[col] < val);
        return builder;
      },
      gte: (col: string, val: any) => {
        filters.push((r) => r[col] && r[col] >= val);
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        const asc = opts?.ascending ?? true;
        rows = executeMutation().sort((a, b) => {
          if (a[col] === b[col]) return 0;
          return (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1);
        });
        return builder;
      },
      limit: (_n: number) => builder,
      range: (_from: number, _to: number) => builder,
      single: async () => {
        const res = executeMutation();
        return { data: res[0] ?? null, error: res[0] ? null : { message: 'Not found' } };
      },
      maybeSingle: async () => {
        const res = executeMutation();
        return { data: res[0] ?? null, error: null };
      },
      then: (resolve: any) => {
        const res = executeMutation();
        // Attach joined relations if requested on tournaments or matches
        const enriched = res.map((row) => {
          if (tableName === 'tournaments') {
            return {
              ...row,
              game_profiles: tables.game_profiles!.find((g) => g.id === row.profile_id) || null,
              tournament_entries: tables.tournament_entries!.filter((e) => e.tournament_id === row.id),
            };
          }
          return row;
        });
        return resolve({ data: enriched, error: null });
      },
    };

    return builder;
  }

  const client = {
    from: (table: string) => buildQuery(table),
    rpc: async (fnName: string, args: Record<string, any>) => {
      if (fnName === 'create_match') {
        const match = {
          id: nextId('match'),
          profile_id: args.p_profile_id,
          player_a: args.p_player_a,
          player_b: args.p_player_b ?? null,
          format: args.p_format ?? 'BO1',
          room_code: args.p_room_code ?? null,
          status: 'OPEN',
          entry_fee: 100,
          prize_pool: 200,
          created_by: args.p_creator,
          created_at: new Date().toISOString(),
        };
        tables.matches!.push(match);
        return { data: match, error: null };
      }

      if (fnName === 'accept_match') {
        const match = tables.matches!.find((m) => m.id === args.p_match_id && m.status === 'OPEN');
        if (!match) return { data: null, error: { message: 'Match cannot be accepted' } };
        match.status = 'ACCEPTED';
        match.player_b = match.player_b ?? args.p_user_id;
        match.started_at = new Date().toISOString();

        // Lock entry fee from both players' wallets
        if (match.entry_fee > 0) {
          for (const uid of [match.player_a, match.player_b]) {
            const w = tables.wallets!.find((x) => x.user_id === uid);
            if (w) {
              w.balance -= match.entry_fee;
              w.locked += match.entry_fee;
              tables.locks!.push({
                id: nextId('lock'),
                user_id: uid,
                match_id: match.id,
                amount: match.entry_fee,
                status: 'LOCKED',
              });
            }
          }
        }
        return { data: match, error: null };
      }

      if (fnName === 'start_match') {
        const match = tables.matches!.find((m) => m.id === args.p_match_id);
        if (!match) return { data: null, error: { message: 'Match not found' } };
        match.status = 'LIVE';
        match.started_at = new Date().toISOString();
        return { data: match, error: null };
      }

      if (fnName === 'submit_score') {
        const match = tables.matches!.find((m) => m.id === args.p_match_id);
        if (!match || !['LIVE', 'CAPTURING', 'VERIFYING'].includes(match.status)) {
          return { data: null, error: { message: 'Cannot submit score for this match' } };
        }
        const frame = {
          id: nextId('frame'),
          match_id: args.p_match_id,
          player_id: args.p_player_id,
          raw_text: args.p_raw_text,
          parsed: args.p_parsed,
          confidence: args.p_confidence,
          is_verified: true,
          is_final: args.p_is_final,
          image_hash: args.p_image_hash,
          source: args.p_source ?? 'CLIENT_OCR',
          created_at: new Date(Date.now() + idSeq * 2000).toISOString(),
        };
        tables.score_frames!.push(frame);
        return { data: frame, error: null };
      }

      if (fnName === 'wallet_settle') {
        const activeLocks = tables.locks!.filter(
          (l) => l.match_id === args.p_match_id && l.status === 'LOCKED',
        );
        let total = 0;
        for (const l of activeLocks) {
          const w = tables.wallets!.find((x) => x.user_id === l.user_id);
          if (w) w.locked = Math.max(0, w.locked - l.amount);
          l.status = 'RELEASED';
          total += l.amount;
        }
        const prize = args.p_amount ?? total;
        const winnerWallet = tables.wallets!.find((x) => x.user_id === args.p_winner_id);
        if (winnerWallet && prize > 0) {
          winnerWallet.balance += prize;
          tables.transactions!.push({
            id: nextId('tx'),
            user_id: args.p_winner_id,
            amount: prize,
            balance_after: winnerWallet.balance,
            reason: 'prize',
            metadata: { match_id: args.p_match_id },
            created_at: new Date().toISOString(),
          });
        }
        return { data: null, error: null };
      }

      if (fnName === 'wallet_refund') {
        const activeLocks = tables.locks!.filter(
          (l) => l.match_id === args.p_match_id && l.status === 'LOCKED',
        );
        for (const l of activeLocks) {
          const w = tables.wallets!.find((x) => x.user_id === l.user_id);
          if (w) {
            w.locked = Math.max(0, w.locked - l.amount);
            w.balance += l.amount;
          }
          l.status = 'REFUNDED';
        }
        return { data: null, error: null };
      }

      if (fnName === 'update_rating') {
        let ratingRow = tables.ratings!.find(
          (r) => r.user_id === args.p_user_id && r.game_type === args.p_game_type,
        );
        if (!ratingRow) {
          ratingRow = {
            id: nextId('rat'),
            user_id: args.p_user_id,
            game_type: args.p_game_type,
            rating: 1200,
            games_played: 0,
            wins: 0,
            losses: 0,
          };
          tables.ratings!.push(ratingRow);
        }
        ratingRow.games_played += 1;
        if (args.p_won) {
          ratingRow.wins += 1;
          ratingRow.rating += 25;
        } else {
          ratingRow.losses += 1;
          ratingRow.rating -= 20;
        }
        return { data: ratingRow, error: null };
      }

      if (fnName === 'create_tournament') {
        const t = {
          id: nextId('tour'),
          name: args.p_name,
          profile_id: args.p_profile_id,
          format: args.p_format,
          size: args.p_size,
          entry_fee: args.p_entry_fee ?? 0,
          prize_pool: args.p_prize_pool ?? 0,
          prize_distribution: { '1': 0.7, '2': 0.3 },
          status: 'REGISTRATION',
          created_by: args.p_creator,
          created_at: new Date().toISOString(),
        };
        tables.tournaments!.push(t);
        return { data: t, error: null };
      }

      if (fnName === 'join_tournament') {
        const entry = {
          id: nextId('tentry'),
          tournament_id: args.p_tournament_id,
          user_id: args.p_user_id,
          seed: tables.tournament_entries!.filter((e) => e.tournament_id === args.p_tournament_id).length + 1,
          checked_in: true,
          eliminated: false,
          final_placement: null,
          prize_awarded: 0,
        };
        tables.tournament_entries!.push(entry);
        return { data: entry, error: null };
      }

      return { data: null, error: null };
    },
    _tables: tables,
  } as unknown as TypedSupabaseClient & { _tables: typeof tables };

  // Wire Core Wallet singleton to use this in-memory DB
  const walletAdapter: CoreWalletInterface = {
    getBalance: async (userId: string) => {
      const w = tables.wallets!.find((x) => x.user_id === userId);
      return { balance: w?.balance ?? 0, locked: w?.locked ?? 0, currency: 'POINTS' };
    },
    credit: async (userId: string, amount: number, reason: string) => {
      const w = tables.wallets!.find((x) => x.user_id === userId);
      if (w) w.balance += amount;
      return {
        id: nextId('tx'),
        userId,
        amount,
        balanceAfter: w?.balance ?? amount,
        reason,
        metadata: {},
        createdAt: new Date(),
      };
    },
    debit: async (userId: string, amount: number, reason: string) => {
      const w = tables.wallets!.find((x) => x.user_id === userId);
      if (w) w.balance -= amount;
      return {
        id: nextId('tx'),
        userId,
        amount: -amount,
        balanceAfter: w?.balance ?? 0,
        reason,
        metadata: {},
        createdAt: new Date(),
      };
    },
    lock: async (userId: string, amount: number, ctx) => {
      const w = tables.wallets!.find((x) => x.user_id === userId);
      if (w) {
        w.balance -= amount;
        w.locked += amount;
      }
      return {
        id: nextId('lock'),
        userId,
        amount,
        matchId: ctx.matchId ?? null,
        tournamentId: ctx.tournamentId ?? null,
        status: 'LOCKED',
        createdAt: new Date(),
      };
    },
    settle: async (matchId: string, winnerId: string, amount?: number) => {
      await client.rpc('wallet_settle', {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_amount: amount ?? null,
      });
    },
    refund: async (matchId: string) => {
      await client.rpc('wallet_refund', { p_match_id: matchId });
    },
    refundTournament: async () => {},
    payout: async () => ({ success: true, reference: 'ref-1' }),
    history: async () => [],
  };
  setWallet(walletAdapter);

  return client;
}

describe('End-to-End Multi-Actor & Multi-Platform Userflow Verification Suite (Zero-Manual)', () => {
  it('Flow 1: PC 1v1 Duel (Counter-Strike 2) — Room Code Join, Escrow Lock, Live CLIENT_OCR & Instant Auto-Settlement', async () => {
    const db = createInMemoryPlatformDb();
    const apiMatchService = new ApiMatchService();
    (apiMatchService as any).supabase = db;
    (apiMatchService as any).coreMatchService = new CoreMatchService({ client: db });

    // 1. Player A (US) creates a CS2 1v1 match with 100 PTS entry fee
    const created = await apiMatchService.createMatch('u-usa', 'game-cs2-pc', null, 'BO1', 100);
    expect(created.status).toBe('OPEN');
    expect(created.roomCode).toHaveLength(6);

    // 2. Player B (DE) joins via Room Code -> Locks 100 PTS from both players (balance: 900, locked: 100)
    const accepted = await apiMatchService.joinByRoomCode(created.roomCode!, 'u-ger');
    expect(accepted.status).toBe('ACCEPTED');
    expect(accepted.playerB).toBe('u-ger');

    const walletA = db._tables.wallets.find((w) => w.user_id === 'u-usa')!;
    const walletB = db._tables.wallets.find((w) => w.user_id === 'u-ger')!;
    expect(walletA.balance).toBe(900);
    expect(walletA.locked).toBe(100);
    expect(walletB.balance).toBe(900);
    expect(walletB.locked).toBe(100);

    // 3. Enriched match details include both players' usernames & country codes for CountryFlag display
    const enrichedMatch = await apiMatchService.getMatch(created.id);
    expect(enrichedMatch.playerAUsername).toBe('ace_sniper');
    expect(enrichedMatch.playerACountry).toBe('US');
    expect(enrichedMatch.playerBUsername).toBe('blitz_krieger');
    expect(enrichedMatch.playerBCountry).toBe('DE');

    // 4. Player A & Player B game windows stream live CLIENT_OCR frames
    // Notice we DO NOT manually call startMatch() or settleMatch() — submitScore handles both 100% automatically!
    await apiMatchService.submitScore(created.id, 'u-usa', '7 - 5', 0.92, false, 'h1', 'CLIENT_OCR');
    await apiMatchService.submitScore(created.id, 'u-ger', '7 - 5', 0.91, false, 'h2', 'CLIENT_OCR');

    // Final scoreboard frame: 13 - 9 VICTORY (Player A wins)
    await apiMatchService.submitScore(created.id, 'u-usa', '13 - 9 VICTORY', 0.96, true, 'h3', 'CLIENT_OCR');

    // 5. Verify match is ALREADY settled automatically with zero manual action!
    const settledMatch = await apiMatchService.getMatch(created.id);
    expect(settledMatch.status).toBe('SETTLED');
    expect(settledMatch.winner).toBe('u-usa');
    expect(settledMatch.verifiedBy).toBe('AI');

    // 6. Verify escrow released & winner credited 200 PTS (900 + 200 = 1100)
    expect(walletA.locked).toBe(0);
    expect(walletB.locked).toBe(0);
    expect(walletA.balance).toBe(1100);
    expect(walletB.balance).toBe(900);

    // 7. Verify Elo ratings updated automatically on the global leaderboard
    const leaderboardService = new LeaderboardService();
    (leaderboardService as any).supabase = db;
    (leaderboardService as any).coreLeaderboard = new CoreLeaderboard(db);

    const topPlayers = await leaderboardService.getTop('HEAD_TO_HEAD', 10);
    expect(topPlayers.length).toBe(2);
    expect(topPlayers[0]?.userId).toBe('u-usa');
    expect(topPlayers[0]?.username).toBe('ace_sniper');
    expect(topPlayers[0]?.countryCode).toBe('US');
    expect(topPlayers[0]?.wins).toBe(1);
  });

  it('Flow 2: Console (PS5 / Xbox) 1v1 Duel (EA Sports FC 25 & Tekken 8) — Zero-Manual STREAM_INGEST & Gamertag Binding', async () => {
    const db = createInMemoryPlatformDb();
    const apiMatchService = new ApiMatchService();
    (apiMatchService as any).supabase = db;
    (apiMatchService as any).coreMatchService = new CoreMatchService({ client: db });

    // 1. Create EA Sports FC 25 Console Duel between Nigeria (u-nga) and Brazil (u-bra)
    const fcMatch = await apiMatchService.createMatch('u-nga', 'game-fc25-console', null, 'BO1', 100);
    await apiMatchService.acceptMatch(fcMatch.id, 'u-bra');

    // 2. Verify Gamertag Binding anti-hijack check on live PS5/Xbox broadcast HUD text
    const hudText = 'PSN: Lagos_King_PS5 3 - 1 Rio_Legend_XBX FULL TIME';
    const bindingCheck = verifyGamertagBinding(hudText, 'Lagos_King_PS5');
    expect(bindingCheck.matched).toBe(true);
    expect(bindingCheck.confidence).toBe(1.0);

    // 3. Console Stream Ingest submits live frames from Twitch/YouTube PS5 broadcast
    await apiMatchService.submitScore(fcMatch.id, 'u-nga', '1 - 0', 0.94, false, 'ps5_f1', 'STREAM_INGEST');
    await apiMatchService.submitScore(fcMatch.id, 'u-nga', '2 - 1', 0.95, false, 'ps5_f2', 'STREAM_INGEST');
    await apiMatchService.submitScore(
      fcMatch.id,
      'u-nga',
      hudText,
      0.98,
      true,
      'ps5_f3',
      'STREAM_INGEST',
    );

    // 4. Verify instant zero-manual settlement for Console Stream (`AI_CONSOLE_STREAM`)
    const settledFc = await apiMatchService.getMatch(fcMatch.id);
    expect(settledFc.status).toBe('SETTLED');
    expect(settledFc.winner).toBe('u-nga');
    expect(settledFc.verifiedBy).toBe('AI_CONSOLE_STREAM');

    // 5. Also verify Tekken 8 (Console BINARY_RESULT) zero-manual settlement
    const tekkenMatch = await apiMatchService.createMatch('u-bra', 'game-tekken8-console', null, 'BO1', 100);
    await apiMatchService.acceptMatch(tekkenMatch.id, 'u-usa');
    await apiMatchService.submitScore(
      tekkenMatch.id,
      'u-bra',
      'K.O. YOU WIN',
      0.98,
      true,
      'tekken_ko_1',
      'STREAM_INGEST',
    );

    const settledTekken = await apiMatchService.getMatch(tekkenMatch.id);
    expect(settledTekken.status).toBe('SETTLED');
    expect(settledTekken.winner).toBe('u-bra');
    expect(settledTekken.verifiedBy).toBe('AI_CONSOLE_STREAM');
  });

  it('Flow 3: Autonomous AI Anti-Cheat & Zero-Manual Dispute Resolution (No Human Admin Needed)', async () => {
    const db = createInMemoryPlatformDb();
    const apiMatchService = new ApiMatchService();
    (apiMatchService as any).supabase = db;
    (apiMatchService as any).coreMatchService = new CoreMatchService({ client: db });

    // Scenario A: Player B attempts a 5-frame identical replay attack while Player A plays legitimately
    const mobileMatch = await apiMatchService.createMatch('u-usa', 'game-subway-mobile', null, 'BO1', 100);
    await apiMatchService.acceptMatch(mobileMatch.id, 'u-ger');

    // Player A submits legitimate progressive scores
    await apiMatchService.submitScore(mobileMatch.id, 'u-usa', '2,500', 0.95, false, 'legit_1', 'CLIENT_OCR');
    await apiMatchService.submitScore(mobileMatch.id, 'u-usa', '6,400', 0.95, false, 'legit_2', 'CLIENT_OCR');

    // Player B submits 5 identical replay frames claiming 99,999
    for (let i = 0; i < 5; i++) {
      await apiMatchService.submitScore(
        mobileMatch.id,
        'u-ger',
        '99,999',
        0.95,
        i === 4,
        'replay_static_hash',
        'CLIENT_OCR',
      );
    }

    // Player A submits final score
    await apiMatchService.submitScore(mobileMatch.id, 'u-usa', '9,200 Game Over', 0.96, true, 'legit_3', 'CLIENT_OCR');

    // Verify AI Anti-Cheat automatically disqualified Player B and awarded victory to Player A!
    const settledMobile = await apiMatchService.getMatch(mobileMatch.id);
    expect(settledMobile.status).toBe('SETTLED');
    expect(settledMobile.winner).toBe('u-usa');
    expect(settledMobile.verifiedBy).toBe('AI_ANTICHEAT');

    // Scenario B: Conflicting BINARY_RESULT claims + Dispute raised -> Autonomous AI Arbiter resolves immediately
    const disputedMatch = await apiMatchService.createMatch('u-nga', 'game-tekken8-console', null, 'BO1', 100);
    await apiMatchService.acceptMatch(disputedMatch.id, 'u-bra');
    await apiMatchService.startMatch(disputedMatch.id);

    // Player A has 3 consistent frames of "VICTORY" (temporal stability boost -> 1.0)
    await apiMatchService.submitScore(disputedMatch.id, 'u-nga', 'VICTORY', 0.95, false, 'nga_1', 'CLIENT_OCR');
    await apiMatchService.submitScore(disputedMatch.id, 'u-nga', 'VICTORY', 0.95, false, 'nga_2', 'CLIENT_OCR');

    // Insert conflicting final frames and call disputeMatch
    db._tables.score_frames.push(
      {
        id: 'f-conflict-a',
        match_id: disputedMatch.id,
        player_id: 'u-nga',
        raw_text: 'VICTORY',
        parsed: { primary: 'WIN', raw: 'VICTORY', confidence: 0.98 },
        confidence: 0.98,
        is_verified: true,
        is_final: true,
        image_hash: 'nga_3',
        source: 'CLIENT_OCR',
        created_at: new Date().toISOString(),
      },
      {
        id: 'f-conflict-b',
        match_id: disputedMatch.id,
        player_id: 'u-bra',
        raw_text: 'VICTORY',
        parsed: { primary: 'WIN', raw: 'VICTORY', confidence: 0.72 },
        confidence: 0.72,
        is_verified: true,
        is_final: true,
        image_hash: 'bra_1',
        source: 'CLIENT_OCR',
        created_at: new Date().toISOString(),
      },
    );

    const disputeResult = await apiMatchService.disputeMatch(
      disputedMatch.id,
      'u-bra',
      'Opponent and I both saw win screen',
    );

    // Verify dispute was resolved 100% automatically by AI_ARBITER without waiting for human admin!
    expect(disputeResult.status).toBe('RESOLVED');
    expect(disputeResult.resolution).toContain('AI_ARBITER');

    const resolvedMatch = await apiMatchService.getMatch(disputedMatch.id);
    expect(resolvedMatch.status).toBe('SETTLED');
    expect(resolvedMatch.winner).toBe('u-nga');
    expect(resolvedMatch.verifiedBy).toBe('AI_ARBITER');
  });

  it('Flow 4: Match Cancellation & Automatic 100% Escrow Refund', async () => {
    const db = createInMemoryPlatformDb();
    const apiMatchService = new ApiMatchService();
    (apiMatchService as any).supabase = db;
    (apiMatchService as any).coreMatchService = new CoreMatchService({ client: db });

    const m = await apiMatchService.createMatch('u-usa', 'game-cs2-pc', null, 'BO1', 100);
    await apiMatchService.acceptMatch(m.id, 'u-ger');

    // Both players have 900 available, 100 locked
    expect(db._tables.wallets.find((w) => w.user_id === 'u-usa')!.balance).toBe(900);

    // Cancel match -> 100% automatic refund
    const cancelled = await apiMatchService.cancelMatch(m.id, 'u-usa');
    expect(cancelled.status).toBe('CANCELLED');
    expect(db._tables.wallets.find((w) => w.user_id === 'u-usa')!.balance).toBe(1000);
    expect(db._tables.wallets.find((w) => w.user_id === 'u-usa')!.locked).toBe(0);
    expect(db._tables.wallets.find((w) => w.user_id === 'u-ger')!.balance).toBe(1000);
    expect(db._tables.wallets.find((w) => w.user_id === 'u-ger')!.locked).toBe(0);
  });

  it('Flow 5: 4-Player Global Tournament — Auto-Bracket, Auto-Advance Semifinals to Finals & Auto-Prize Distribution', async () => {
    const db = createInMemoryPlatformDb();
    const tournamentService = new TournamentService();
    (tournamentService as any).supabase = db;
    (tournamentService as any).engine = new TournamentEngine({ client: db });

    const apiMatchService = new ApiMatchService();
    (apiMatchService as any).supabase = db;
    (apiMatchService as any).coreMatchService = new CoreMatchService({ client: db });

    // 1. Create 4-player EA Sports FC 25 Global Cup with 1,000 PTS Prize Pool
    const tour = await tournamentService.createTournament('u-usa', {
      name: 'EA FC 25 Global Champions Cup',
      profileId: 'game-fc25-console',
      format: 'SINGLE_ELIM',
      size: 4,
      entryFee: 0,
      prizePool: 1000,
    });

    // 2. All 4 international players register (US, DE, NG, BR)
    await tournamentService.joinTournament(tour.id, 'u-usa');
    await tournamentService.joinTournament(tour.id, 'u-ger');
    await tournamentService.joinTournament(tour.id, 'u-nga');
    await tournamentService.joinTournament(tour.id, 'u-bra');

    // 3. Start tournament -> Generates 2 Semifinals (Round 1) + 1 Grand Final (Round 2) linked via next_match_id
    const startRes = await tournamentService.startTournament(tour.id);
    expect(startRes.matchesCreated).toBe(3);

    const bracket = await tournamentService.getBracket(tour.id);
    const round1 = bracket.filter((m: any) => m.bracket_round === 1);
    const round2 = bracket.filter((m: any) => m.bracket_round === 2);
    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(1);

    // Verify country flags enrichment on bracket matches
    expect(round1[0]?.player_a_username).toBe('ace_sniper');
    expect(round1[0]?.player_a_country).toBe('US');
    expect(round1[0]?.player_b_username).toBe('blitz_krieger');
    expect(round1[0]?.player_b_country).toBe('DE');

    // 4. Semifinal 1 (u-usa vs u-ger): u-usa wins 3 - 0 via autonomous OCR
    await apiMatchService.submitScore(
      round1[0].id,
      'u-usa',
      '3 - 0 FULL TIME',
      0.97,
      true,
      'sf1_final',
      'STREAM_INGEST',
    );

    // 5. Semifinal 2 (u-nga vs u-bra): u-nga wins 2 - 1 via autonomous OCR
    await apiMatchService.submitScore(
      round1[1].id,
      'u-nga',
      '2 - 1 FULL TIME',
      0.97,
      true,
      'sf2_final',
      'STREAM_INGEST',
    );

    // 6. Verify both semifinal winners (u-usa and u-nga) AUTOMATICALLY advanced into the Grand Final and it is now LIVE!
    const updatedBracket = await tournamentService.getBracket(tour.id);
    const grandFinal = updatedBracket.find((m: any) => m.bracket_round === 2)!;
    expect(grandFinal.player_a).toBe('u-usa');
    expect(grandFinal.player_b).toBe('u-nga');
    expect(grandFinal.status).toBe('LIVE');

    // 7. Grand Final (u-usa vs u-nga): u-nga wins 1 - 2 FULL TIME (Player B wins)
    await apiMatchService.submitScore(
      grandFinal.id,
      'u-nga',
      '1 - 2 FULL TIME',
      0.99,
      true,
      'gf_final',
      'STREAM_INGEST',
    );

    // 8. Verify Tournament automatically transitioned to COMPLETED and distributed prizes (1st: 700, 2nd: 300)!
    const completedTour = await tournamentService.getTournament(tour.id);
    expect(completedTour.status).toBe('COMPLETED');

    const ngaWallet = db._tables.wallets.find((w) => w.user_id === 'u-nga')!;
    const usaWallet = db._tables.wallets.find((w) => w.user_id === 'u-usa')!;
    expect(ngaWallet.balance).toBe(1000 + 700); // 1st place prize
    expect(usaWallet.balance).toBe(1000 + 300); // 2nd place prize
  });

  it('Flow 6: Social Friendships & Global Flag Country Catalog Integrity', async () => {
    const db = createInMemoryPlatformDb();
    const socialService = new SocialService();
    (socialService as any).supabase = db;
    (socialService as any).friendshipService = new FriendshipService(db);

    // 1. Send & accept friend request between US and Nigeria players
    const req = await socialService.requestFriend('u-usa', 'u-nga');
    expect(req.status).toBe('PENDING');

    await socialService.acceptFriend(req.id, 'u-nga');

    // 2. Verify listFriends returns enriched friendUsername & friendCountryCode
    const friendsOfUsa = await socialService.listFriends('u-usa');
    expect(friendsOfUsa).toHaveLength(1);
    expect(friendsOfUsa[0]?.status).toBe('ACCEPTED');
    expect(friendsOfUsa[0]?.friendUsername).toBe('lagos_king');
    expect(friendsOfUsa[0]?.friendCountryCode).toBe('NG');

    // 3. Verify ISO countries exist in COUNTRIES catalog for CountrySelect & CountryFlag
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(100);
    expect(COUNTRIES.some((c) => c.code === 'US' && c.name === 'United States')).toBe(true);
    expect(COUNTRIES.some((c) => c.code === 'NG' && c.name === 'Nigeria')).toBe(true);
    expect(COUNTRIES.some((c) => c.code === 'DE' && c.name === 'Germany')).toBe(true);
  });

  it('Flow 7: Background Autonomous AI Verification Worker auto-settles pending matches and review tasks', async () => {
    const db = createInMemoryPlatformDb();
    const workers = new WorkersService(
      { get: async () => null, set: async () => {}, del: async () => {} } as any,
      { sendToUser: async () => {}, sendToUsers: async () => {} } as any,
    );
    (workers as any).supabase = db;
    (workers as any).coreMatchService = new CoreMatchService({ client: db });

    // Create a match stuck in REVIEW with a pending review_task and a final score frame
    db._tables.matches.push({
      id: 'm-worker-1',
      profile_id: 'game-fc25-console',
      format: 'BO1',
      status: 'REVIEW',
      player_a: 'u-usa',
      player_b: 'u-ger',
      entry_fee: 0,
      prize_pool: 0,
      created_at: new Date().toISOString(),
    });
    db._tables.score_frames.push({
      id: 'sf-worker-1',
      match_id: 'm-worker-1',
      player_id: 'u-usa',
      raw_text: '4 - 1 FULL TIME',
      parsed: { primary: 4, fields: { a: 4, b: 1 }, raw: '4 - 1 FULL TIME', confidence: 0.95 },
      confidence: 0.95,
      is_verified: true,
      is_final: true,
      image_hash: 'hw1',
      source: 'STREAM_INGEST',
      created_at: new Date().toISOString(),
    });
    db._tables.review_tasks.push({
      id: 'rt-1',
      match_id: 'm-worker-1',
      score_frame_id: 'sf-worker-1',
      status: 'PENDING',
      priority: 5,
      created_at: new Date().toISOString(),
    });

    // Run background autonomous AI verifier
    await workers.autoVerifyPendingMatches();

    const settled = db._tables.matches.find((m) => m.id === 'm-worker-1')!;
    expect(settled.status).toBe('SETTLED');
    expect(settled.winner).toBe('u-usa');

    const task = db._tables.review_tasks.find((t) => t.id === 'rt-1')!;
    expect(task.status).toBe('APPROVED');
  });
});
