import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CrossmintService } from './crossmint.service';
import { WalletService } from '../wallet/wallet.service';

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

describe('CrossmintService No-KYB Direct USDC Wallets', () => {
  const origEnv = { ...process.env };
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.CROSSMINT_SERVER_API_KEY = 'sk_production_test_wallets_key';
    process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY = 'ck_production_test_key';
    process.env.CROSSMINT_TREASURY_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    process.env.CROSSMINT_WEBHOOK_SECRET = '';
    delete process.env.CROSSMINT_ENVIRONMENT;
  });

  afterEach(() => {
    process.env = origEnv;
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('routes staging keys cleanly even when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    expect(CrossmintService.resolveIsProd('sk_staging_abc', 'ck_staging_def')).toBe(false);
    process.env.CROSSMINT_ENVIRONMENT = 'staging';
    expect(CrossmintService.resolveIsProd('sk_production_abc', 'ck_production_def')).toBe(false);
    delete process.env.CROSSMINT_ENVIRONMENT;
    expect(CrossmintService.resolveIsProd('sk_production_abc', 'ck_production_def')).toBe(true);
  });

  it('provisions a No-KYB Base USDC deposit wallet and caches its address', async () => {
    const redis = makeMockRedis();
    const walletSvc = {
      creditCrossmintDeposit: vi.fn(async () => ({ success: true })),
    } as unknown as WalletService;

    const depositAddr = '0x1111111111111111111111111111111111111111';
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return new Response(JSON.stringify({ error: true }), { status: 404 });
      }
      expect(url).toBe('https://www.crossmint.com/api/2025-06-09/wallets');
      return new Response(
        JSON.stringify({ address: depositAddr, chainType: 'evm', type: 'mpc' }),
        { status: 201 },
      );
    });
    globalThis.fetch = fetchMock as any;

    const svc = new CrossmintService(walletSvc, redis as any);
    const info = await svc.getOrProvisionDepositWallet('user-uuid-123', 'p@playverzus.xyz');

    expect(info.address).toBe(depositAddr);
    expect(info.chain).toBe('base');
    expect(info.noKybRequired).toBe(true);
    expect(info.minDepositUsdc).toBe(5);
    expect(info.depositFeeUsdc).toBe(0);
    expect(info.treasuryConfigured).toBe(true);

    // Second call uses Redis cache without extra Crossmint POST
    const callsBefore = fetchMock.mock.calls.length;
    const cached = await svc.getOrProvisionDepositWallet('user-uuid-123', 'p@playverzus.xyz');
    expect(cached.address).toBe(depositAddr);
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('throws clear ServiceUnavailableException when server key lacks Wallets scopes (403)', async () => {
    const redis = makeMockRedis();
    const walletSvc = {} as WalletService;

    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: true,
          message: "doesn't have required scopes: wallets.create",
        }),
        { status: 403 },
      );
    }) as any;

    const svc = new CrossmintService(walletSvc, redis as any);
    await expect(
      svc.getOrProvisionDepositWallet('user-uuid-403', 'p@playverzus.xyz'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('credits valid Base USDC >= 5 via wallets.transfer.in webhook and blocks sub-$5 or testnet spam', async () => {
    const redis = makeMockRedis();
    const creditSpy = vi.fn(async () => ({ success: true, duplicate: false }));
    const walletSvc = { creditCrossmintDeposit: creditSpy } as unknown as WalletService;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'sweep-1' }), { status: 200 })) as any;

    const svc = new CrossmintService(walletSvc, redis as any);
    await redis.set('cm:addr:0x2222222222222222222222222222222222222222', 'user-uuid-2');

    // 1) Under minimum ($2.50) ignored
    const small = (await svc.handleWebhook({
      type: 'wallets.transfer.in',
      data: {
        transferId: 'tx-small',
        status: 'succeeded',
        destination: {
          address: '0x2222222222222222222222222222222222222222',
          chain: 'base',
        },
        token: { symbol: 'USDC', amount: '2.50', chain: 'base' },
      },
    })) as Record<string, any>;
    expect(small.ignored).toBe(true);
    expect(creditSpy).not.toHaveBeenCalled();

    // 2) Testnet token on production ignored
    const testnet = (await svc.handleWebhook({
      type: 'wallets.transfer.in',
      data: {
        transferId: 'tx-sepolia',
        status: 'succeeded',
        destination: {
          address: '0x2222222222222222222222222222222222222222',
          chain: 'base-sepolia',
        },
        token: { symbol: 'USDC', amount: '25.00', chain: 'base-sepolia' },
      },
    })) as Record<string, any>;
    expect(testnet.ignored).toBe(true);
    expect(creditSpy).not.toHaveBeenCalled();

    // 3) Valid 12.50 Base USDC deposit credited
    const ok = (await svc.handleWebhook({
      type: 'wallets.transfer.in',
      data: {
        transferId: 'tx-valid-1',
        status: 'succeeded',
        destination: {
          address: '0x2222222222222222222222222222222222222222',
          chain: 'base',
        },
        token: { symbol: 'USDC', amount: '12.50', chain: 'base' },
        onChain: { txId: '0xdeadbeef' },
      },
    })) as Record<string, any>;
    expect(ok.status).toBe('CREDITED');
    expect(creditSpy).toHaveBeenCalledWith(
      'user-uuid-2',
      12.5,
      'USDC',
      'wallet-in-tx-valid-1',
      expect.objectContaining({ rail: 'CROSSMINT_WALLET_DIRECT', chain: 'base' }),
    );
  });

  it('WalletService.requestPayout does not deduct ledger if Crossmint rejects payout', async () => {
    const redis = makeMockRedis();
    await redis.set('cash:user-payout-1', JSON.stringify({ balance: 25, locked: 0 }));

    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: true, message: 'missing wallets:transactions.create scope' }),
        { status: 403 },
      );
    }) as any;

    const walletSvc = new WalletService(redis as any);
    await expect(
      walletSvc.requestPayout('user-payout-1', 10, {
        type: 'CROSSMINT_USDC',
        destinationAddress: '0x3333333333333333333333333333333333333333',
        chain: 'base',
      } as any),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    // Balance remained untouched (25.00 USDC)
    const after = await walletSvc.getRealCash('user-payout-1');
    expect(after.balance).toBe(25);

    // Invalid EVM address fails validation immediately
    await expect(
      walletSvc.requestPayout('user-payout-1', 10, {
        type: 'CROSSMINT_USDC',
        destinationAddress: 'not-an-address',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fetches live Crossmint Treasury wallet Base USDC balance and BaseScan link', async () => {
    const redis = makeMockRedis();
    const walletSvc = {} as WalletService;

    globalThis.fetch = vi.fn(async (url: string) => {
      expect(url).toContain('/2025-06-09/wallets/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/balances');
      return new Response(
        JSON.stringify([
          {
            symbol: 'usdc',
            amount: '142.75',
            balances: { base: '142.75' },
          },
        ]),
        { status: 200 },
      );
    }) as any;

    const svc = new CrossmintService(walletSvc, redis as any);
    const treasury = await svc.getTreasuryWalletStatus();
    expect(treasury.configured).toBe(true);
    expect(treasury.status).toBe('CONNECTED');
    expect(treasury.onChainUsdcBalance).toBe(142.75);
    expect(treasury.explorerUrl).toBe(
      'https://basescan.org/address/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });

  it('auto-provisions Master Base Treasury Smart Wallet when CROSSMINT_TREASURY_ADDRESS env var is unset', async () => {
    delete process.env.CROSSMINT_TREASURY_ADDRESS;
    const redis = makeMockRedis();
    const walletSvc = {} as WalletService;
    const treasuryAddr = '0x9999999999999999999999999999999999999999';

    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'GET' && url.includes('/wallets/')) {
        return new Response(JSON.stringify({ error: true }), { status: 404 });
      }
      if (init?.method === 'POST' && url.endsWith('/2025-06-09/wallets')) {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body.type).toBe('smart');
        expect(body.owner).toBe('userId:playverzus_master_treasury');
        expect(body.config?.recoveryMethods?.[0]?.type).toBe('api-key');
        return new Response(
          JSON.stringify({ address: treasuryAddr, chainType: 'evm', type: 'smart' }),
          { status: 201 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as any;

    const svc = new CrossmintService(walletSvc, redis as any);
    const liveCfg = await svc.getLiveConfig();
    expect(liveCfg.treasuryConfigured).toBe(true);
    expect(liveCfg.treasuryAddress).toBe(treasuryAddr);

    // Cached in Redis after provisioning
    expect(await redis.get('crossmint:treasury:address')).toBe(treasuryAddr);
  });
});
