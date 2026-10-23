import { describe, it, expect } from 'vitest';
import {
  calculateElo,
  DEFAULT_ELO,
  canTransition,
  assertTransition,
  isTerminal,
  checkGeoblock,
  generateRoomCode,
  analyzeScoreStream,
  TournamentEngine,
  MIN_WITHDRAWAL_EUR,
  MAX_WITHDRAWAL_EUR,
  MIN_DEPOSIT_EUR,
  MAX_DEPOSIT_EUR,
  computeDHashFromGrayscale,
  hammingDistance,
  isPerceptualMatch,
  ImagePreprocessor,
  computeTemporalConfidence,
  runEngines,
  generateSessionSecret,
  signTelemetry,
  verifyTelemetry,
  verifyGamertagBinding,
  validateParsed,
  QuickMatchService,
} from '../src';
import { getEngine, TypeRegistry } from '../src/types/TypeRegistry';
import { safeRegExp, parseIntLoose, parseTimeToMs } from '../src/types/TypeEngine';
import { MatchStateError, WalletError } from '../src/errors';
import { PaysafeWallet } from '../src/wallet/PaysafeWallet';
import type { GameProfile, MatchContext, ScoreFrame } from '../src/types';
import type { TypedSupabaseClient } from '@playverzus/db';

/** Mock in-memory Supabase client for testing PaysafeWallet invariants */
function createMockWalletSupabase(initialBalance = 100, initialLocked = 0) {
  let balance = initialBalance;
  let locked = initialLocked;
  const transactions: any[] = [];
  const locks: any[] = [];

  const mockClient = {
    from: (table: string) => ({
      select: (_cols?: string) => ({
        eq: (col: string, val: any) => {
          const res = {
            data: table === 'transactions' ? transactions : table === 'locks' ? locks : null,
            error: null,
            maybeSingle: async () => {
              if (table === 'wallets') {
                return { data: { balance, locked, currency: 'EUR' }, error: null };
              }
              return { data: null, error: null };
            },
            single: async () => ({ data: null, error: null }),
            order: () => ({
              range: async () => ({ data: transactions, error: null }),
            }),
            then: (resolve: any) =>
              resolve({
                data: table === 'transactions' ? transactions : table === 'locks' ? locks : null,
                error: null,
              }),
          };
          return res;
        },
      }),
      insert: (record: any) => ({
        select: () => ({
          single: async () => {
            if (table === 'transactions') {
              const row = { id: `tx-${transactions.length + 1}`, ...record, created_at: new Date().toISOString() };
              transactions.push(row);
              return { data: row, error: null };
            }
            if (table === 'locks') {
              const row = { id: `lk-${locks.length + 1}`, ...record, created_at: new Date().toISOString() };
              locks.push(row);
              return { data: row, error: null };
            }
            return { data: record, error: null };
          },
        }),
      }),
      update: (updates: any) => ({
        eq: (col: string, _val: any) => {
          if (table === 'wallets') {
            if (updates.balance !== undefined) balance = updates.balance;
            if (updates.locked !== undefined) locked = updates.locked;
          }
          return { data: null, error: null };
        },
      }),
    }),
    _getState: () => ({ balance, locked, transactions, locks }),
    _seedTransaction: (tx: any) => transactions.push(tx),
    _seedLock: (lk: any) => locks.push(lk),
  } as unknown as TypedSupabaseClient & {
    _getState: () => any;
    _seedTransaction: (tx: any) => void;
    _seedLock: (lk: any) => void;
  };

  return mockClient;
}

describe('Master Bizarre & Edge Case Audit Suite', () => {
  describe('1. Financial Accounting & Wallet Extremes', () => {
    it('rejects negative, zero, and -0 amounts on credit', async () => {
      const mockClient = createMockWalletSupabase(100, 0);
      const wallet = new PaysafeWallet({ client: mockClient });

      await expect(wallet.credit('u1', -50, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.credit('u1', 0, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.credit('u1', -0, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.credit('u1', -0.0001, 'test')).rejects.toThrowError(WalletError);
    });

    it('rejects NaN, Infinity, and non-numeric payloads on credit', async () => {
      const mockClient = createMockWalletSupabase(100, 0);
      const wallet = new PaysafeWallet({ client: mockClient });

      await expect(wallet.credit('u1', NaN, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.credit('u1', Infinity, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.credit('u1', -Infinity, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.credit('u1', '100' as any, 'test')).rejects.toThrowError(WalletError);
    });

    it('rejects negative, zero, NaN, and Infinity on debit', async () => {
      const mockClient = createMockWalletSupabase(100, 0);
      const wallet = new PaysafeWallet({ client: mockClient });

      await expect(wallet.debit('u1', -10, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.debit('u1', 0, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.debit('u1', NaN, 'test')).rejects.toThrowError(WalletError);
      await expect(wallet.debit('u1', Infinity, 'test')).rejects.toThrowError(WalletError);
    });

    it('rejects negative, zero, NaN, and Infinity on lock', async () => {
      const mockClient = createMockWalletSupabase(100, 0);
      const wallet = new PaysafeWallet({ client: mockClient });

      await expect(wallet.lock('u1', -5, { matchId: 'm1' })).rejects.toThrowError(WalletError);
      await expect(wallet.lock('u1', 0, { matchId: 'm1' })).rejects.toThrowError(WalletError);
      await expect(wallet.lock('u1', NaN, { matchId: 'm1' })).rejects.toThrowError(WalletError);
      await expect(wallet.lock('u1', Infinity, { matchId: 'm1' })).rejects.toThrowError(WalletError);
    });

    it('prevents overdraft when funds are locked in active matches', async () => {
      // Balance is 100, but 95 is locked in active match -> available is only 5
      const mockClient = createMockWalletSupabase(100, 95);
      const wallet = new PaysafeWallet({ client: mockClient });

      // Requesting 10 should fail with INSUFFICIENT_FUNDS
      await expect(wallet.debit('u1', 10, 'entry_fee')).rejects.toThrowError('Insufficient available EUR balance');

      // Requesting available 5 should succeed
      const tx = await wallet.debit('u1', 5, 'entry_fee');
      expect(tx.amount).toBe(-5);
      expect(tx.balanceAfter).toBe(95);
    });

    it('strictly applies 2 decimal cents financial rounding without floating point drift', async () => {
      const mockClient = createMockWalletSupabase(0, 0);
      const wallet = new PaysafeWallet({ client: mockClient });

      // In JS, 0.1 + 0.2 is 0.30000000000000004
      await wallet.credit('u1', 0.1, 'c1');
      await wallet.credit('u1', 0.2, 'c2');

      const snap = await wallet.getBalance('u1');
      expect(snap.balance).toBe(0.3); // Exactly 0.3, not 0.30000000000000004
    });

    it('enforces withdrawal minimum and maximum thresholds', async () => {
      const mockClient = createMockWalletSupabase(10000, 0);
      const wallet = new PaysafeWallet({ client: mockClient });

      // Below MIN_WITHDRAWAL_EUR (10)
      await expect(wallet.payout('u1', 9.99, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        `minimum withdrawal threshold is $${MIN_WITHDRAWAL_EUR.toFixed(2)} USDC`,
      );

      // Above MAX_WITHDRAWAL_EUR
      await expect(wallet.payout('u1', MAX_WITHDRAWAL_EUR + 0.01, { type: 'BANK_ACCOUNT' } as any)).rejects.toThrowError(
        `maximum withdrawal limit is $${MAX_WITHDRAWAL_EUR.toFixed(2)} USDC`,
      );
    });
  });

  describe('2. Match State Machine Transitions & Terminal Locks', () => {
    it('allows valid progressive lifecycle', () => {
      expect(canTransition('DRAFT', 'OPEN')).toBe(true);
      expect(canTransition('OPEN', 'ACCEPTED')).toBe(true);
      expect(canTransition('ACCEPTED', 'LIVE')).toBe(true);
      expect(canTransition('LIVE', 'CAPTURING')).toBe(true);
      expect(canTransition('CAPTURING', 'VERIFYING')).toBe(true);
      expect(canTransition('VERIFYING', 'VERIFIED')).toBe(true);
      expect(canTransition('VERIFIED', 'SETTLED')).toBe(true);
    });

    it('allows dispute and review workflows', () => {
      expect(canTransition('VERIFYING', 'DISPUTED')).toBe(true);
      expect(canTransition('DISPUTED', 'REVIEW')).toBe(true);
      expect(canTransition('REVIEW', 'SETTLED')).toBe(true);
      expect(canTransition('DISPUTED', 'SETTLED')).toBe(true);
      expect(canTransition('VERIFYING', 'REVIEW')).toBe(true);
    });

    it('blocks all illegal jumps, backtracks, and resurrecting dead matches', () => {
      // Skipping entire match
      expect(canTransition('DRAFT', 'SETTLED')).toBe(false);
      expect(() => assertTransition('DRAFT', 'SETTLED')).toThrowError(MatchStateError);

      // Reopening settled match
      expect(canTransition('SETTLED', 'OPEN')).toBe(false);
      expect(() => assertTransition('SETTLED', 'OPEN')).toThrowError(MatchStateError);

      // Double settling
      expect(canTransition('SETTLED', 'SETTLED')).toBe(false);
      expect(() => assertTransition('SETTLED', 'SETTLED')).toThrowError(MatchStateError);

      // Resurrecting cancelled match
      expect(canTransition('CANCELLED', 'LIVE')).toBe(false);
      expect(() => assertTransition('CANCELLED', 'LIVE')).toThrowError(MatchStateError);

      // Backtracking from disputed to draft
      expect(canTransition('DISPUTED', 'DRAFT')).toBe(false);
      expect(() => assertTransition('DISPUTED', 'DRAFT')).toThrowError(MatchStateError);
    });

    it('identifies terminal states correctly', () => {
      expect(isTerminal('SETTLED')).toBe(true);
      expect(isTerminal('CANCELLED')).toBe(true);
      expect(isTerminal('LIVE')).toBe(false);
      expect(isTerminal('VERIFYING')).toBe(false);
      expect(isTerminal('DRAFT')).toBe(false);
    });
  });

  describe('3. Game Type Engines Bizarre Inputs & Malformed Regex', () => {
    it('safeRegExp safely handles invalid regex syntax without crashing', () => {
      const defaultReg = /default/;
      expect(safeRegExp('(?<unclosed', defaultReg)).toBe(defaultReg);
      expect(safeRegExp('[a-z', defaultReg)).toBe(defaultReg);
      expect(safeRegExp('*invalid', defaultReg)).toBe(defaultReg);
      expect(safeRegExp(null, defaultReg)).toBe(defaultReg);
      expect(safeRegExp(undefined, defaultReg)).toBe(defaultReg);

      const validReg = safeRegExp('(\\d+)', defaultReg);
      expect(validReg.source).toBe('(\\d+)');
    });

    it('HighScoreEngine parses large numbers with commas and handles invalid strings', () => {
      const engine = getEngine('HIGH_SCORE');
      const profile: GameProfile = {
        id: 'p1',
        displayName: 'Subway Surfers',
        gameType: 'HIGH_SCORE',
        platform: 'MOBILE',
        roi: { x: 0, y: 0, w: 1, h: 1 },
        constraints: { min: 0, max: 10000000 },
        endKeywords: ['game over'],
        approved: true,
        isOfficial: true,
      };

      // Large number with commas
      const res = engine.parse('Final Score: 9,876,543', profile);
      expect(res).not.toBeNull();
      expect(res?.primary).toBe(9876543);

      // Completely empty / invalid text
      expect(engine.parse('', profile)).toBeNull();
      expect(engine.parse('GAME OVER NO SCORE', profile)).toBeNull();

      // Comparing with NaN returns uncomparable, not accidental winner
      const decisionNaN = engine.compare({ primary: NaN, raw: '', confidence: 1 }, { primary: 100, raw: '', confidence: 1 }, 'BO1');
      expect(decisionNaN.winnerId).toBeNull();

      // Identical scores tie
      const tieDecision = engine.compare({ primary: 500, raw: '', confidence: 1 }, { primary: 500, raw: '', confidence: 1 }, 'BO1');
      expect(tieDecision.winnerId).toBeNull();
      expect(tieDecision.reason).toBe('tie');
    });

    it('LowTimeEngine handles edge timestamps and invalid durations', () => {
      const engine = getEngine('LOW_TIME');
      const profile: GameProfile = {
        id: 'p2',
        displayName: 'Speedrun',
        gameType: 'LOW_TIME',
        platform: 'PC',
        roi: { x: 0, y: 0, w: 1, h: 1 },
        constraints: {},
        endKeywords: ['finished'],
        approved: true,
        isOfficial: true,
      };

      // Valid times
      expect(parseTimeToMs('01:23.45')).toBe(83450);
      expect(parseTimeToMs('00:05.100')).toBe(5100);

      // Invalid seconds (>= 60)
      expect(parseTimeToMs('01:65.00')).toBeNull();
      expect(parseTimeToMs('invalid')).toBeNull();

      // NaN comparison safety
      const decision = engine.compare({ primary: NaN, raw: '', confidence: 1 }, { primary: 5000, raw: '', confidence: 1 }, 'BO1');
      expect(decision.winnerId).toBeNull();
    });

    it('BinaryResultEngine handles ambiguous OCR containing both victory and defeat', () => {
      const engine = getEngine('BINARY_RESULT');
      const profile: GameProfile = {
        id: 'p3',
        displayName: 'Fighting Game',
        gameType: 'BINARY_RESULT',
        platform: 'CONSOLE',
        roi: { x: 0, y: 0, w: 1, h: 1 },
        constraints: {},
        endKeywords: ['victory', 'defeat'],
        approved: true,
        isOfficial: true,
      };

      // Clear victory
      const winRes = engine.parse('MATCH WON - VICTORY!', profile);
      expect(winRes?.primary).toBe('WIN');
      expect(winRes?.confidence).toBe(0.98);

      // Ambiguous screen containing both words
      const ambiguousRes = engine.parse('Defeated your opponent! VICTORY!', profile);
      expect(ambiguousRes).not.toBeNull();
      // Should have reduced confidence for human review flag
      expect(ambiguousRes?.confidence).toBe(0.6);
    });

    it('HeadToHeadEngine does not crash on malformed regex and handles ties', () => {
      const engine = getEngine('HEAD_TO_HEAD');
      const profile: GameProfile = {
        id: 'p4',
        displayName: 'FIFA',
        gameType: 'HEAD_TO_HEAD',
        platform: 'CONSOLE',
        roi: { x: 0, y: 0, w: 1, h: 1 },
        constraints: {},
        endKeywords: [],
        regexPattern: '(?<a\\d+)', // Malformed unclosed group!
        approved: true,
        isOfficial: true,
      };

      // Must not crash
      expect(() => engine.parse('3 - 2', profile)).not.toThrow();

      // Compare ties
      const tie = engine.compare(
        { primary: 2, fields: { a: 2, b: 2 }, raw: '', confidence: 1 },
        { primary: 2, fields: { a: 2, b: 2 }, raw: '', confidence: 1 },
        'BO1',
      );
      expect(tie.winnerId).toBeNull();
      expect(tie.reason).toBe('draw');
    });
  });

  describe('4. Tournament Engine Edge Cases & Solvency Protection', () => {
    const mockClient = {} as TypedSupabaseClient;
    const engine = new TournamentEngine({ client: mockClient });

    it('returns empty brackets for 0 or 1 participant', () => {
      expect(engine.generateSingleElim([])).toEqual([]);
      expect(engine.generateSingleElim([{ userId: 'u1' }])).toEqual([]);
      expect(engine.generateRoundRobin([])).toEqual([]);
      expect(engine.generateRoundRobin([{ userId: 'u1' }])).toEqual([]);
      expect(engine.generateDoubleElim([])).toEqual([]);
      expect(engine.generateSwiss([])).toEqual([]);
    });

    it('deduplicates duplicate user IDs in entry lists', () => {
      const duplicates = [{ userId: 'u1' }, { userId: 'u1' }];
      // Deduplicated to 1 player, so cannot generate bracket
      expect(engine.generateSingleElim(duplicates)).toEqual([]);
    });

    it('handles odd participant counts with bye padding', () => {
      const threePlayers = [
        { userId: 'u1', seed: 1 },
        { userId: 'u2', seed: 2 },
        { userId: 'u3', seed: 3 },
      ];

      const drafts = engine.generateSingleElim(threePlayers);
      // Bracket size becomes 4, so 2 matches in round 1 + 1 in round 2 = 3 drafts
      expect(drafts.length).toBe(3);

      const round1 = drafts.filter((d) => d.round === 1);
      expect(round1.length).toBe(2);
      // First match has two players
      expect(round1[0]?.playerA).toBe('u1');
      expect(round1[0]?.playerB).toBe('u2');
      // Second match has third player and a bye (null)
      expect(round1[1]?.playerA).toBe('u3');
      expect(round1[1]?.playerB).toBeNull();
    });

    it('generates exact N*(N-1)/2 matches for Round Robin', () => {
      const fourPlayers = [
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
        { userId: 'u4' },
      ];
      const drafts = engine.generateRoundRobin(fourPlayers);
      expect(drafts.length).toBe(6); // (4 * 3) / 2 = 6
    });
  });

  describe('5. Elo Rating Calculation Extremes', () => {
    it('handles extreme rating differentials without overflow or NaN', () => {
      // 40,000 vs 100 rating
      const [newA, newB] = calculateElo(40000, 100, true);
      expect(Number.isFinite(newA)).toBe(true);
      expect(Number.isFinite(newB)).toBe(true);
      expect(newA).toBeGreaterThanOrEqual(100);
      expect(newB).toBeGreaterThanOrEqual(100);
    });

    it('falls back safely to DEFAULT_ELO when NaN or negative rating passed', () => {
      const [newA, newB] = calculateElo(NaN, -500, true);
      expect(Number.isFinite(newA)).toBe(true);
      expect(Number.isFinite(newB)).toBe(true);
      expect(newA).toBeGreaterThanOrEqual(100);
      expect(newB).toBeGreaterThanOrEqual(100);
    });

    it('supports draw outcomes where aWon is null', () => {
      const [newA, newB] = calculateElo(1200, 1200, null);
      // Equal rating and draw means no change
      expect(newA).toBe(1200);
      expect(newB).toBe(1200);
    });
  });

  describe('6. Anti-Cheat Stream Analysis Extremes', () => {
    const profile: GameProfile = {
      id: 'p1',
      displayName: 'Cheat Test',
      gameType: 'HIGH_SCORE',
      platform: 'MOBILE',
      roi: { x: 0, y: 0, w: 1, h: 1 },
      constraints: { min: 0, max: 10000, maxJumpPerSec: 50 },
      endKeywords: [],
      approved: true,
      isOfficial: true,
    };

    it('handles frames with invalid Date timestamps without crashing', () => {
      const frames: ScoreFrame[] = [
        {
          id: 'f1',
          matchId: 'm1',
          playerId: 'p1',
          rawText: '100',
          parsed: { primary: 100, raw: '100', confidence: 1 },
          confidence: 1,
          isVerified: true,
          isFinal: false,
          imageHash: 'h1',
          source: 'CLIENT_OCR',
          createdAt: new Date('invalid date string'),
        },
      ];

      expect(() => analyzeScoreStream(frames, profile)).not.toThrow();
    });

    it('detects replay attack when 5 identical image hashes are submitted', () => {
      const frames: ScoreFrame[] = Array.from({ length: 5 }, (_, i) => ({
        id: `f${i}`,
        matchId: 'm1',
        playerId: 'p1',
        rawText: '500',
        parsed: { primary: 500, raw: '500', confidence: 1 },
        confidence: 1,
        isVerified: true,
        isFinal: false,
        imageHash: 'identical_hash_abc123',
        source: 'CLIENT_OCR' as const,
        createdAt: new Date(Date.now() + i * 1000),
      }));

      const res = analyzeScoreStream(frames, profile);
      expect(res.suspicious).toBe(true);
      expect(res.reasons.some((r) => r.includes('replay'))).toBe(true);
    });

    it('detects impossible velocity jumps', () => {
      const frames: ScoreFrame[] = [
        {
          id: 'f1',
          matchId: 'm1',
          playerId: 'p1',
          rawText: '10',
          parsed: { primary: 10, raw: '10', confidence: 1 },
          confidence: 1,
          isVerified: true,
          isFinal: false,
          imageHash: 'h1',
          source: 'CLIENT_OCR',
          createdAt: new Date(1000),
        },
        {
          id: 'f2',
          matchId: 'm1',
          playerId: 'p1',
          rawText: '5000', // Jumped by 4990 in 1 second when max is 50/sec
          parsed: { primary: 5000, raw: '5000', confidence: 1 },
          confidence: 1,
          isVerified: true,
          isFinal: true,
          imageHash: 'h2',
          source: 'CLIENT_OCR',
          createdAt: new Date(2000),
        },
      ];

      const res = analyzeScoreStream(frames, profile);
      expect(res.suspicious).toBe(true);
      expect(res.reasons.some((r) => r.includes('impossible velocity'))).toBe(true);
    });
  });

  describe('7. Geoblocking & Regulatory Compliance', () => {
    it('blocks sanctioned jurisdictions with case and whitespace trimming', () => {
      expect(checkGeoblock('KP').allowed).toBe(false);
      expect(checkGeoblock('kp').allowed).toBe(false);
      expect(checkGeoblock('  ir  ').allowed).toBe(false);
      expect(checkGeoblock('SY').allowed).toBe(false);
      expect(checkGeoblock('CU').allowed).toBe(false);
    });

    it('allows compliant regions and graceful empty parameters', () => {
      expect(checkGeoblock('DE').allowed).toBe(true);
      expect(checkGeoblock('US').allowed).toBe(true);
      expect(checkGeoblock('GB').allowed).toBe(true);
      expect(checkGeoblock('FR').allowed).toBe(true);
      expect(checkGeoblock(null).allowed).toBe(true);
      expect(checkGeoblock(undefined).allowed).toBe(true);
      expect(checkGeoblock('').allowed).toBe(true);
    });
  });

  describe('8. Room Code Generation & Entropy', () => {
    it('generates 6 character codes without ambiguous glyphs (I, O, 0, 1)', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);

      // Must not contain confusing characters
      expect(code).not.toMatch(/[IO01]/);
    });

    it('generates distinct codes across multiple invocations', () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i++) {
        set.add(generateRoomCode());
      }
      expect(set.size).toBe(50);
    });
  });

  describe('9. Advanced Anti-Cheat, AML & Vision Defenses', () => {
    describe('Perceptual Hashing & Hamming Distance', () => {
      it('calculates Hamming distance accurately across 64-bit hex strings', () => {
        const hashA = '0000000000000000';
        const hashB = '0000000000000001'; // 1 bit diff
        const hashC = '000000000000000f'; // 4 bits diff (1111)
        const hashD = 'ffffffffffffffff'; // 64 bits diff

        expect(hammingDistance(hashA, hashA)).toBe(0);
        expect(hammingDistance(hashA, hashB)).toBe(1);
        expect(hammingDistance(hashA, hashC)).toBe(4);
        expect(hammingDistance(hashA, hashD)).toBe(64);
        expect(hammingDistance(hashA, 'short')).toBe(64);
      });

      it('evaluates perceptual match within threshold <= 4', () => {
        const base = '1234567890abcdef';
        // Same hash
        expect(isPerceptualMatch(base, base, 4)).toBe(true);
        // Bit diff within 4
        expect(isPerceptualMatch('0000000000000000', '0000000000000007', 4)).toBe(true); // 3 bits diff
        // Bit diff exceeding 4
        expect(isPerceptualMatch('0000000000000000', '000000000000001f', 4)).toBe(false); // 5 bits diff
      });

      it('computes deterministic dHash from 9x8 grayscale pixels', () => {
        const flatPixels = new Uint8Array(72);
        // Fill with a horizontal gradient
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 9; x++) {
            flatPixels[y * 9 + x] = x * 25;
          }
        }
        const dHash = computeDHashFromGrayscale(flatPixels);
        expect(dHash).toHaveLength(16);
        // Gradient left < right across all rows produces all bits 1
        expect(dHash).toBe('ffffffffffffffff');
      });

      it('flags replay attack when consecutive frames have matching perceptual hashes despite compression noise', () => {
        const profile: GameProfile = {
          id: 'test_game',
          displayName: 'Test Game',
          gameType: 'HIGH_SCORE',
          platform: 'PC',
          roi: { x: 0, y: 0, w: 1, h: 1 },
          constraints: { min: 0, max: 10000 },
          endKeywords: [],
          approved: true,
          isOfficial: true,
        };

        // 5 frames where SHA-256 imageHash differs due to compression, but perceptualHash has hamming distance <= 2
        const frames: ScoreFrame[] = [
          {
            id: 'f1',
            matchId: 'm1',
            playerId: 'p1',
            rawText: '100',
            parsed: { primary: 100, raw: '100', confidence: 0.9 },
            confidence: 0.9,
            isVerified: true,
            isFinal: false,
            imageHash: 'sha256_noise_111',
            perceptualHash: '0000000000000000',
            source: 'CLIENT_OCR',
            createdAt: new Date(1000),
          },
          {
            id: 'f2',
            matchId: 'm1',
            playerId: 'p1',
            rawText: '100',
            parsed: { primary: 100, raw: '100', confidence: 0.9 },
            confidence: 0.9,
            isVerified: true,
            isFinal: false,
            imageHash: 'sha256_noise_222',
            perceptualHash: '0000000000000001', // 1 bit diff
            source: 'CLIENT_OCR',
            createdAt: new Date(2000),
          },
          {
            id: 'f3',
            matchId: 'm1',
            playerId: 'p1',
            rawText: '100',
            parsed: { primary: 100, raw: '100', confidence: 0.9 },
            confidence: 0.9,
            isVerified: true,
            isFinal: false,
            imageHash: 'sha256_noise_333',
            perceptualHash: '0000000000000003', // 2 bits diff
            source: 'CLIENT_OCR',
            createdAt: new Date(3000),
          },
          {
            id: 'f4',
            matchId: 'm1',
            playerId: 'p1',
            rawText: '100',
            parsed: { primary: 100, raw: '100', confidence: 0.9 },
            confidence: 0.9,
            isVerified: true,
            isFinal: false,
            imageHash: 'sha256_noise_444',
            perceptualHash: '0000000000000001',
            source: 'CLIENT_OCR',
            createdAt: new Date(4000),
          },
          {
            id: 'f5',
            matchId: 'm1',
            playerId: 'p1',
            rawText: '100',
            parsed: { primary: 100, raw: '100', confidence: 0.9 },
            confidence: 0.9,
            isVerified: true,
            isFinal: true,
            imageHash: 'sha256_noise_555',
            perceptualHash: '0000000000000000',
            source: 'CLIENT_OCR',
            createdAt: new Date(5000),
          },
        ];

        const report = analyzeScoreStream(frames, profile);
        expect(report.suspicious).toBe(true);
        expect(report.reasons.some((r) => r.includes('video replay') || r.includes('replay'))).toBe(true);
      });
    });

    describe('Anchor Geometry & Aspect Ratio Adaptation', () => {
      it('centers 16:9 game viewport on 21:9 ultrawide monitor', () => {
        const preprocessor = new ImagePreprocessor({
          x: 0,
          y: 0,
          w: 0.5,
          h: 0.2,
          aspectRatioConstraint: '16:9',
          anchor: 'TOP_LEFT',
        });

        // 2560x1080 ultrawide monitor: 16:9 viewport is 1920x1080 centered at x = 320
        const box = preprocessor.calculateCropBox(2560, 1080);
        expect(box.left).toBe(320);
        expect(box.top).toBe(0);
        expect(box.width).toBe(Math.round(0.5 * 1920)); // 960
        expect(box.height).toBe(Math.round(0.2 * 1080)); // 216
      });

      it('applies TOP_RIGHT anchor correctly on ultrawide display', () => {
        const preprocessor = new ImagePreprocessor({
          x: 0.05, // 5% inset from right edge
          y: 0.02,
          w: 0.15,
          h: 0.08,
          aspectRatioConstraint: '16:9',
          anchor: 'TOP_RIGHT',
        });

        const box = preprocessor.calculateCropBox(2560, 1080);
        const gameX = 320;
        const gameW = 1920;
        const roiW = Math.round(0.15 * 1920); // 288
        const expectedLeft = Math.round(gameX + gameW - 0.05 * gameW - roiW);
        expect(box.left).toBe(expectedLeft);
      });
    });

    describe('Temporal Persistence Voting', () => {
      it('boosts confidence proportionally for stable consecutive reads', () => {
        expect(computeTemporalConfidence('Score: 42', 0.85, []).effectiveConfidence).toBe(0.85);
        expect(
          computeTemporalConfidence('Score: 42', 0.85, [{ rawText: 'Score: 42' }]).effectiveConfidence
        ).toBeCloseTo(0.935, 3);
        expect(
          computeTemporalConfidence('Score: 42', 0.85, [
            { rawText: 'Score: 42' },
            { rawText: 'Score: 42' },
          ]).effectiveConfidence
        ).toBeCloseTo(1.0, 3);
      });

      it('promotes dual engine consensus with temporal persistence above auto-settle threshold', async () => {
        const runners = [
          { name: 'tesseract', run: async () => ({ text: 'Score: 42', confidence: 0.9 }) },
          { name: 'paddleocr', run: async () => ({ text: 'Score: 42', confidence: 0.9 }) },
        ];

        const recentHistory = [
          { rawText: 'Score: 42' },
          { rawText: 'Score: 42' },
        ];

        const result = await runEngines(runners, { recentHistory });

        // Combined (0.9) + 2 consecutive frames (+20%) = 1.0 (capped), needsReview: false
        expect(result.confidence).toBeGreaterThanOrEqual(0.95);
        expect(result.needsReview).toBe(false);
        expect(result.consecutiveStableFrames).toBe(2);
      });
    });

    describe('Telemetry HMAC Signing & Anti-Tamper', () => {
      const secret = generateSessionSecret();

      it('generates valid HMAC signature that verifies cleanly', () => {
        const payload = {
          matchId: 'm-1234',
          playerId: 'p-5678',
          seq: 1,
          timestamp: Date.now(),
          perceptualHash: '1234567890abcdef',
          rawText: 'Score 100',
        };

        const sig = signTelemetry(secret, payload);
        const res = verifyTelemetry(secret, sig, payload);
        expect(res.valid).toBe(true);
      });

      it('rejects sequence regression (replay / out-of-order packets)', () => {
        const payload = {
          matchId: 'm-1234',
          playerId: 'p-5678',
          seq: 5,
          timestamp: Date.now(),
        };

        const sig = signTelemetry(secret, payload);
        // Last verified seq was 5; receiving seq 5 or lower must fail
        const res = verifyTelemetry(secret, sig, payload, 5);
        expect(res.valid).toBe(false);
        expect(res.reason).toContain('Sequence regression');
      });

      it('rejects packets with clock skew exceeding allowable window', () => {
        const stalePayload = {
          matchId: 'm-1234',
          playerId: 'p-5678',
          seq: 10,
          timestamp: Date.now() - 30_000, // 30s ago (exceeds default 15s)
        };

        const sig = signTelemetry(secret, stalePayload);
        const res = verifyTelemetry(secret, sig, stalePayload);
        expect(res.valid).toBe(false);
        expect(res.reason).toContain('Timestamp skew');
      });

      it('rejects tampered telemetry payloads', () => {
        const payload = {
          matchId: 'm-1234',
          playerId: 'p-5678',
          seq: 1,
          timestamp: Date.now(),
          rawText: 'Score 10',
        };

        const sig = signTelemetry(secret, payload);
        // Malicious user modifies rawText to 9999 in DevTools
        const tampered = { ...payload, rawText: 'Score 9999' };
        const res = verifyTelemetry(secret, sig, tampered);
        expect(res.valid).toBe(false);
        expect(res.reason).toContain('Invalid telemetry signature');
      });
    });

    describe('Gamertag OCR HUD Binding', () => {
      it('verifies exact gamertags on HUD', () => {
        const check = verifyGamertagBinding('TEAM A [PRO] NinjaX Score: 5', 'NinjaX');
        expect(check.matched).toBe(true);
        expect(check.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('handles common OCR glyph confusions (0/O, 1/L, 5/S)', () => {
        // OCR misreads 'ProGamer01' as 'Pr0GameROl'
        const check = verifyGamertagBinding('Match Victory - Pr0GameROl', 'ProGamer01');
        expect(check.matched).toBe(true);
      });

      it('flags missing gamertag indicating possible stream hijack', () => {
        const check = verifyGamertagBinding('Tournament Finals: Shroud vs S1mple', 'MyPlayerTag');
        expect(check.matched).toBe(false);
        expect(check.confidence).toBeLessThanOrEqual(0.3);
      });

      it('integrates gamertag validation into validateParsed', () => {
        const ctx: MatchContext = {
          matchId: 'm1',
          playerA: 'p1',
          playerB: 'p2',
          profile: {
            id: 'g1',
            displayName: 'G',
            gameType: 'HIGH_SCORE',
            platform: 'PC',
            roi: { x: 0, y: 0, w: 1, h: 1 },
            constraints: {},
            endKeywords: [],
            approved: true,
            isOfficial: true,
          },
          format: 'BEST_OF_1',
          previousFrames: [],
          gamertags: { playerA: 'ApexLegend99' },
          activePlayerId: 'p1',
        };

        const parsed = {
          primary: 500,
          raw: 'Score: 500 - Opponent: Faker',
          confidence: 0.95,
        };

        const result = validateParsed(parsed, ctx);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.includes('ApexLegend99'))).toBe(true);
      });
    });

    describe('Financial AML 1x Rollover Wagering Invariant', () => {
      it('calculates 1x rollover requirement correctly on deposits and wagers', async () => {
        const mockClient = createMockWalletSupabase(100, 0);
        // Seed a deposit transaction of €100
        mockClient._seedTransaction({
          amount: 100,
          reason: 'Deposit via PAYSAFE',
          metadata: { provider: 'PAYSAFE' },
        });

        const wallet = new PaysafeWallet({ client: mockClient });
        const rollover = await wallet.getRolloverStatus('u1');

        expect(rollover.totalDeposited).toBe(100);
        expect(rollover.totalWagered).toBe(0);
        expect(rollover.remainingRollover).toBe(100);
        expect(rollover.withdrawableBalance).toBe(0); // Cannot withdraw deposited money without wagering
      });

      it('blocks payout when withdrawable balance is restricted by 1x rollover', async () => {
        const mockClient = createMockWalletSupabase(100, 0);
        mockClient._seedTransaction({
          amount: 100,
          reason: 'Deposit via PAYSAFE',
          metadata: { provider: 'PAYSAFE' },
        });

        const wallet = new PaysafeWallet({ client: mockClient });
        await expect(
          wallet.payout('u1', 50, { type: 'PAYSAFE', iban: 'DE1234567890' })
        ).rejects.toThrowError(/anti-money laundering/i);
      });

      it('releases withdrawable balance as matches are completed', async () => {
        const mockClient = createMockWalletSupabase(100, 0);
        mockClient._seedTransaction({
          amount: 100,
          reason: 'Deposit via PAYSAFE',
          metadata: { provider: 'PAYSAFE' },
        });
        // Seed €60 in completed match wagers
        mockClient._seedLock({
          amount: 60,
          status: 'RELEASED',
        });

        const wallet = new PaysafeWallet({ client: mockClient });
        const rollover = await wallet.getRolloverStatus('u1');

        expect(rollover.totalDeposited).toBe(100);
        expect(rollover.totalWagered).toBe(60);
        expect(rollover.remainingRollover).toBe(40);
        expect(rollover.withdrawableBalance).toBe(60); // €60 is now eligible for withdrawal
      });
    });

    describe('Anti-Collusion Matchmaking Defense', () => {
      it('blocks pairing players with identical device fingerprints', async () => {
        const matchesCreated: any[] = [];
        const mockMatchService = {
          create: async (data: any) => {
            matchesCreated.push(data);
            return data;
          },
        } as any;

        const mockClient = {
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { rating: 1200 }, error: null }),
                }),
              }),
            }),
          }),
        } as any;

        const qms = new QuickMatchService({
          client: mockClient,
          matchService: mockMatchService,
        });

        // Enqueue Player A and Player B with identical device fingerprint (multi-accounting / self-trading)
        await qms.enqueue('u1', 'prof1', 'HIGH_SCORE', 'BEST_OF_1', {
          deviceFingerprint: 'canvas-fp-abc-123',
        });
        await qms.enqueue('u2', 'prof1', 'HIGH_SCORE', 'BEST_OF_1', {
          deviceFingerprint: 'canvas-fp-abc-123',
        });

        expect(matchesCreated).toHaveLength(0); // Collusion guard blocked match
      });

      it('blocks pairing players with identical IP subnets', async () => {
        const matchesCreated: any[] = [];
        const mockMatchService = {
          create: async (data: any) => {
            matchesCreated.push(data);
            return data;
          },
        } as any;

        const mockClient = {
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { rating: 1200 }, error: null }),
                }),
              }),
            }),
          }),
        } as any;

        const qms = new QuickMatchService({
          client: mockClient,
          matchService: mockMatchService,
        });

        // Enqueue Player A and Player B from same local subnet (e.g. 192.168.1.0/24)
        await qms.enqueue('u1', 'prof1', 'HIGH_SCORE', 'BEST_OF_1', {
          ipSubnet: '192.168.1.0/24',
        });
        await qms.enqueue('u2', 'prof1', 'HIGH_SCORE', 'BEST_OF_1', {
          ipSubnet: '192.168.1.0/24',
        });

        expect(matchesCreated).toHaveLength(0);
      });

      it('detects when 24h rematch frequency limit (>=3) has been reached', async () => {
        const mockClient = {
          from: () => ({
            select: () => ({
              or: () => ({
                gte: async () => ({
                  data: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }], // 3 matches already in 24h
                  error: null,
                }),
              }),
            }),
          }),
        } as any;

        const qms = new QuickMatchService({
          client: mockClient,
          matchService: {} as any,
        });

        const isCapped = await qms.checkRematchLimit('p1', 'p2', 3);
        expect(isCapped).toBe(true);
      });
    });
  });
});
