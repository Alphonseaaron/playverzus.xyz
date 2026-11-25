import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

/**
 * Stateful in-memory Supabase mock backing double-entry cash escrow,
 * tournament entry locks, audit logs, and Admin Treasury reports.
 */
function createInMemorySupabase() {
  const tables = {
    wallets: [] as any[],
    locks: [] as any[],
    transactions: [] as any[],
    sponsors: [] as any[],
    profiles: [] as any[],
    audit_log: [] as any[],
    matches: [] as any[],
    tournaments: [] as any[],
    tournament_entries: [] as any[],
    game_profiles: [] as any[],
    disputes: [] as any[],
  } as Record<string, any[]> & {
    wallets: any[];
    locks: any[];
    transactions: any[];
    sponsors: any[];
    profiles: any[];
    audit_log: any[];
    matches: any[];
    tournaments: any[];
    tournament_entries: any[];
    game_profiles: any[];
    disputes: any[];
  };

  let idSeq = 1;

  function makeBuilder(tableName: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' | null = null;
    let payload: any = null;
    const filters: Array<(r: any) => boolean> = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;

    const exec = async (): Promise<{ data: any; error: any }> => {
      const table = (tables[tableName] ??= []);

      if (op === 'insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const inserted: any[] = [];
        for (const r of rows) {
          if (
            tableName === 'transactions' &&
            r.idempotency_key &&
            table.some((existing) => existing.idempotency_key === r.idempotency_key)
          ) {
            return {
              data: null,
              error: { code: '23505', message: 'duplicate idempotency_key' },
            };
          }
          const row = {
            id: r.id || `row-${idSeq++}`,
            created_at: r.created_at || new Date().toISOString(),
            ...r,
          };
          table.push(row);
          inserted.push(row);
        }
        return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
      }

      if (op === 'update') {
        const updated: any[] = [];
        for (const row of table) {
          if (filters.every((fn) => fn(row))) {
            Object.assign(row, payload);
            updated.push(row);
          }
        }
        return { data: updated, error: null };
      }

      if (op === 'delete') {
        const kept: any[] = [];
        const removed: any[] = [];
        for (const row of table) {
          if (filters.every((fn) => fn(row))) {
            removed.push(row);
          } else {
            kept.push(row);
          }
        }
        tables[tableName] = kept;
        return { data: removed, error: null };
      }

      // select
      let rows = table.filter((r) => filters.every((fn) => fn(r))).map((r) => ({ ...r }));
      if (orderCol) {
        rows.sort((a, b) => {
          const av = a[orderCol!];
          const bv = b[orderCol!];
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * (orderAsc ? 1 : -1);
        });
      }
      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }
      return { data: rows, error: null };
    };

    const builder: any = {
      select() {
        if (!op) op = 'select';
        return builder;
      },
      insert(data: any) {
        op = 'insert';
        payload = data;
        return builder;
      },
      update(data: any) {
        op = 'update';
        payload = data;
        return builder;
      },
      delete() {
        op = 'delete';
        return builder;
      },
      eq(col: string, val: any) {
        filters.push((r) => r[col] === val);
        return builder;
      },
      neq(col: string, val: any) {
        filters.push((r) => r[col] !== val);
        return builder;
      },
      in(col: string, vals: any[]) {
        filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      or(expr: string) {
        const parts = expr.split(',').map((s) => s.trim());
        filters.push((r) =>
          parts.some((p) => {
            const [col, eqKw, val] = p.split('.');
            return Boolean(col) && eqKw === 'eq' && String(r[col!]) === val;
          }),
        );
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      limit(n: number) {
        limitCount = n;
        return builder;
      },
      async maybeSingle() {
        const res = await exec();
        const first = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
        return { data: first, error: res.error };
      },
      async single() {
        const res = await exec();
        const first = Array.isArray(res.data) ? res.data[0] : res.data;
        return {
          data: first ?? null,
          error: first ? res.error : { message: 'Row not found' },
        };
      },
      then(onFulfilled: any, onRejected: any) {
        return exec().then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    tables,
    from(tableName: string) {
      return makeBuilder(tableName);
    },
    async rpc() {
      return { data: null, error: { message: 'Unexpected PTS RPC during Real Cash test' } };
    },
  };
}

let activeDb = createInMemorySupabase();

vi.mock('@playverzus/db', async () => {
  const actual = await vi.importActual<any>('@playverzus/db');
  return {
    ...actual,
    createServiceClient: vi.fn(() => activeDb),
  };
});

import { WalletService } from '../wallet/wallet.service';
import { AdminService } from '../admin/admin.service';

function makeMockRedis() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    checkCooldown: vi.fn(async () => 0),
    withLock: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  };
}

function makeMockPush() {
  return {
    sendToUser: vi.fn(async () => {}),
  };
}

describe('Real-Cash USDC Escrow, Tiered Rake & Treasury Accounting', () => {
  beforeEach(() => {
    activeDb = createInMemorySupabase();
    process.env.WALLET_MODE = 'live';
  });

  it('locks, refunds on cancel, and settles 1v1 duels with exact double-entry USDC ledger parity', async () => {
    const redis = makeMockRedis();
    const push = makeMockPush();
    const wallet = new WalletService(redis as any, push as any);

    const playerA = 'user-a-uuid';
    const playerB = 'user-b-uuid';
    activeDb.tables.profiles.push(
      { id: playerA, username: 'AlphaPlayer' },
      { id: playerB, username: 'BravoPlayer' },
    );

    await wallet.creditCrossmintDeposit(playerA, 25, 'USDC', 'dep-a-1');
    await wallet.creditCrossmintDeposit(playerB, 25, 'USDC', 'dep-b-1');

    // Starter duel ($5.00 stake -> 15% rake on $10.00 pot = $1.50 rake, $8.50 winner prize)
    await wallet.lockMatchStake(playerA, 5, 'match-starter-1', true);
    // Idempotent retry must not double-lock
    await wallet.lockMatchStake(playerA, 5, 'match-starter-1', true);
    await wallet.lockMatchStake(playerB, 5, 'match-starter-1', true);

    expect((await wallet.getRealCash(playerA)).locked).toBe(5);
    expect((await wallet.getRealCash(playerB)).locked).toBe(5);
    expect(activeDb.tables.locks.filter((l) => l.status === 'LOCKED')).toHaveLength(2);

    // Separate cancelled match must release lock completely without debiting balance
    await wallet.lockMatchStake(playerA, 4, 'match-cancelled-1', true);
    expect((await wallet.getRealCash(playerA)).locked).toBe(9);
    await wallet.unlockMatchStake('match-cancelled-1', playerA, null, 4, true);
    expect((await wallet.getRealCash(playerA)).locked).toBe(5);
    expect((await wallet.getRealCash(playerA)).balance).toBe(25);

    // Settle starter duel (Winner: playerA)
    const settlement = await wallet.settleMatchStake(
      'match-starter-1',
      playerA,
      playerB,
      playerA,
      5,
      true,
    );
    expect(settlement).toEqual({ totalPot: 10, winnerPrize: 8.5, platformRake: 1.5 });

    // Re-calling settle must be strictly idempotent
    await wallet.settleMatchStake('match-starter-1', playerA, playerB, playerA, 5, true);

    const cashA = await wallet.getRealCash(playerA);
    const cashB = await wallet.getRealCash(playerB);
    expect(cashA).toEqual({ balance: 28.5, locked: 0 });
    expect(cashB).toEqual({ balance: 20, locked: 0 });

    // Pro duel ($10.00 stake -> 12.5% rake on $20.00 pot = $2.50 rake, $17.50 prize)
    await wallet.lockMatchStake(playerA, 10, 'match-pro-1', true);
    await wallet.lockMatchStake(playerB, 10, 'match-pro-1', true);
    const proSettle = await wallet.settleMatchStake(
      'match-pro-1',
      playerA,
      playerB,
      playerB,
      10,
      true,
    );
    expect(proSettle).toEqual({ totalPot: 20, winnerPrize: 17.5, platformRake: 2.5 });

    expect(await wallet.getRealCash(playerA)).toEqual({ balance: 18.5, locked: 0 });
    expect(await wallet.getRealCash(playerB)).toEqual({ balance: 27.5, locked: 0 });

    // Postgres double-entry transactions sum MUST equal live Redis cash balance for both players
    const sumCents = (uid: string) =>
      activeDb.tables.transactions
        .filter((t) => t.user_id === uid)
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    expect(sumCents(playerA)).toBe(1850);
    expect(sumCents(playerB)).toBe(2750);
  });

  it('rejects real-cash wager lock when player available cash is insufficient', async () => {
    const redis = makeMockRedis();
    const wallet = new WalletService(redis as any, makeMockPush() as any);
    await wallet.creditCrossmintDeposit('poor-user', 5, 'USDC', 'dep-poor');

    await expect(
      wallet.lockMatchStake('poor-user', 6, 'match-over', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await wallet.getRealCash('poor-user')).toEqual({ balance: 5, locked: 0 });
  });

  it('settles 5-player Blitz USDC tournaments and reports zero audit discrepancy in Admin Treasury', async () => {
    const redis = makeMockRedis();
    const wallet = new WalletService(redis as any, makeMockPush() as any);

    const players = ['p1', 'p2', 'p3', 'p4', 'p5'];
    for (const p of players) {
      activeDb.tables.profiles.push({ id: p, username: p.toUpperCase() });
      await wallet.creditCrossmintDeposit(p, 10, 'USDC', `dep-${p}`);
      await wallet.lockTournamentEntry(p, 2.5, 'blitz-1');
    }

    // Active lock check before settlement: $12.50 total active escrow across 5 entrants
    const mockCrossmint = {
      getTreasuryWalletStatus: vi.fn(async () => ({
        configured: true,
        environment: 'production' as const,
        chain: 'base',
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        onChainUsdcBalance: 50,
        explorerUrl: 'https://basescan.org/address/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        status: 'CONNECTED' as const,
        note: 'Connected',
      })),
    };
    const admin = new AdminService(mockCrossmint as any, wallet);
    // Add PTS demo wallet noise to confirm Admin keeps PTS isolated from USDC liabilities
    activeDb.tables.wallets.push({
      user_id: 'p1',
      currency: 'PTS',
      balance: 2500,
      locked: 200,
    });

    const preReport = await admin.getTreasuryReport();
    expect(preReport.currency).toBe('USDC');
    expect(preReport.playerLiabilitiesEur).toBe(50);
    expect(preReport.activeEscrowEur).toBe(12.5);
    expect(preReport.playerAvailableEur).toBe(37.5);
    expect(preReport.demoPointsTotal).toBe(2500);
    expect(preReport.demoPointsLocked).toBe(200);
    expect(preReport.audit.status).toBe('CLEARED');

    // Complete Blitz pool: Gross $12.50, 20% rake ($2.50), Prizes $6.50 + $3.50 = $10.00
    await wallet.settleTournamentRealCash(
      'blitz-1',
      [
        { userId: 'p1', placement: 1, prizeUsdc: 6.5 },
        { userId: 'p2', placement: 2, prizeUsdc: 3.5 },
      ],
      12.5,
    );

    expect(await wallet.getRealCash('p1')).toEqual({ balance: 14, locked: 0 });
    expect(await wallet.getRealCash('p2')).toEqual({ balance: 11, locked: 0 });
    expect(await wallet.getRealCash('p3')).toEqual({ balance: 7.5, locked: 0 });

    const postReport = await admin.getTreasuryReport();
    expect(postReport.activeEscrowEur).toBe(0);
    expect(postReport.playerLiabilitiesEur).toBe(47.5); // $50 deposited - $2.50 platform rake
    expect(postReport.netRetainedEarningsEur).toBe(2.5); // Exact platform rake retained!
    expect(postReport.grossCashEur).toBe(50);
    expect(postReport.audit.status).toBe('CLEARED');
    expect(postReport.audit.discrepancyCount).toBe(0);
    expect(postReport.treasuryWallet.status).toBe('CONNECTED');
    expect(postReport.treasuryWallet.onChainUsdcBalance).toBe(50);
  });
});
