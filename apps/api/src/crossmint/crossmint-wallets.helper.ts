import { CrossmintWallets, createCrossmint } from '@crossmint/wallets-sdk';
import type { TypedSupabaseClient } from '@playverzus/db';
import type { RedisService } from '../redis/redis.service';

export const TREASURY_REDIS_KEY = 'crossmint:treasury:address';
export const TREASURY_OWNER_LOCATOR = 'userId:playverzus_master_treasury';
export const TREASURY_ALIAS = 'playverzus_master_treasury';

const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidEvmAddress(val?: string | null): val is string {
  return Boolean(val && EVM_ADDR_RE.test(val.trim()));
}

export function resolveCrossmintEnv(serverKey = '', clientKey = ''): {
  isProd: boolean;
  baseUrl: string;
  defaultChain: string;
} {
  const explicitEnv = (process.env.CROSSMINT_ENVIRONMENT || '').trim().toLowerCase();
  let isProd = true;
  if (
    explicitEnv === 'staging' ||
    serverKey.startsWith('sk_staging_') ||
    clientKey.startsWith('ck_staging_')
  ) {
    isProd = false;
  } else {
    isProd = Boolean(
      serverKey.startsWith('sk_production_') ||
        clientKey.startsWith('ck_production_') ||
        explicitEnv === 'production' ||
        process.env.WALLET_MODE === 'live' ||
        process.env.NODE_ENV === 'production',
    );
  }
  return {
    isProd,
    baseUrl: isProd ? 'https://www.crossmint.com/api' : 'https://staging.crossmint.com/api',
    defaultChain: isProd ? 'base' : 'base-sepolia',
  };
}

export type ProvisionWalletResult =
  | {
      ok: true;
      address: string;
      raw: Record<string, any>;
    }
  | {
      ok: false;
      status: number;
      isAuthError: boolean;
      message: string;
      data?: Record<string, any>;
    };

export async function provisionCrossmintEvmWallet(params: {
  baseUrl: string;
  chain: string;
  apiKey: string;
  ownerLocator: string;
  email?: string;
  alias?: string;
  signerSecret?: string;
  signerAddress?: string;
}): Promise<ProvisionWalletResult> {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': params.apiKey,
  };

  // 1. Lookup any existing wallet tied to this owner first (Smart, MPC, or generic EVM)
  const locators = [
    `${params.ownerLocator}:evm`,
    `${params.ownerLocator}:evm-smart-wallet`,
    `${params.ownerLocator}:evm-mpc-wallet`,
    ...(params.email ? [`email:${params.email}:evm`] : []),
  ];
  for (const locator of locators) {
    try {
      const lookup = await fetch(
        `${params.baseUrl}/2025-06-09/wallets/${encodeURIComponent(locator)}`,
        { method: 'GET', headers },
      );
      if (lookup.ok) {
        const found = (await lookup.json().catch(() => ({}))) as Record<string, any>;
        if (isValidEvmAddress(found?.address)) {
          return { ok: true, address: found.address.trim(), raw: found };
        }
      }
    } catch {
      // Proceed to creation attempts
    }
  }

  // 2. If CROSSMINT_SIGNER_SECRET is configured, create via official Wallets SDK Server Signer
  const secret = (params.signerSecret || '').trim();
  if (secret) {
    try {
      const wallets = CrossmintWallets.from(createCrossmint({ apiKey: params.apiKey }));
      const created = await wallets.createWallet({
        chain: params.chain as any,
        owner: params.ownerLocator,
        alias: params.alias,
        recoveryMethods: [{ type: 'server', secret }],
      });
      if (isValidEvmAddress(created?.address)) {
        return {
          ok: true,
          address: created.address.trim(),
          raw: { address: created.address.trim(), chainType: 'evm', type: 'smart', signerType: 'server' },
        };
      }
    } catch (err: any) {
      const msg = String(err?.message || 'Smart Wallet SDK creation failed').trim();
      const isAuth = msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('scope');
      if (isAuth) {
        return { ok: false, status: 403, isAuthError: true, message: msg };
      }
    }
  }

  // 3. Provision via Crossmint Wallets REST API (Smart Wallet with API-Key/Server signer -> fallback MPC)
  const signerAddr = (params.signerAddress || '').trim();
  const recoveryEntry = signerAddr
    ? { type: 'server', address: signerAddr }
    : { type: 'api-key' };

  const candidates: Array<Record<string, unknown>> = [
    {
      chainType: 'evm',
      type: 'smart',
      owner: params.ownerLocator,
      ...(params.alias ? { alias: params.alias } : {}),
      config: {
        recoveryMethods: [recoveryEntry],
      },
    },
    {
      chainType: 'evm',
      type: 'smart',
      owner: params.ownerLocator,
      ...(params.alias ? { alias: params.alias } : {}),
      config: {
        adminSigner: recoveryEntry,
      },
    },
    {
      chainType: 'evm',
      type: 'mpc',
      owner: params.ownerLocator,
      ...(params.alias ? { alias: params.alias } : {}),
    },
  ];

  let lastStatus = 400;
  let lastMsg = '';
  let lastData: Record<string, any> | undefined;

  for (const body of candidates) {
    try {
      const response = await fetch(`${params.baseUrl}/2025-06-09/wallets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, any>;
      if (response.ok && isValidEvmAddress(data?.address)) {
        return { ok: true, address: data.address.trim(), raw: data };
      }

      lastStatus = response.status;
      lastData = data;
      lastMsg = String(data?.message || data?.error || '').trim();

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          status: response.status,
          isAuthError: true,
          message: lastMsg || 'Missing Crossmint Wallets permissions on server API key.',
          data,
        };
      }
    } catch (err: any) {
      lastStatus = 503;
      lastMsg = String(err?.message || 'Network error calling Crossmint Wallets API').trim();
    }
  }

  return {
    ok: false,
    status: lastStatus,
    isAuthError: false,
    message: lastMsg || 'Could not initialize Base USDC Smart Wallet right now.',
    data: lastData,
  };
}

export async function resolveTreasuryAddress(params: {
  explicitTreasury?: string;
  apiKey: string;
  chain: string;
  baseUrl: string;
  supabase: TypedSupabaseClient;
  redis: RedisService;
  signerSecret?: string;
  signerAddress?: string;
  autoProvision?: boolean;
}): Promise<{
  address: string | null;
  configured: boolean;
  source: 'env' | 'cache' | 'db' | 'provisioned' | 'unconfigured';
  error?: string;
}> {
  const explicit = (params.explicitTreasury || '').trim();
  if (isValidEvmAddress(explicit)) {
    return { address: explicit, configured: true, source: 'env' };
  }

  try {
    const cached = await params.redis.get(TREASURY_REDIS_KEY);
    if (isValidEvmAddress(cached)) {
      return { address: cached.trim(), configured: true, source: 'cache' };
    }
  } catch {}

  try {
    const { data } = await params.supabase
      .from('audit_log')
      .select('metadata')
      .eq('action', 'CROSSMINT_TREASURY_PROVISIONED')
      .eq('entity_id', TREASURY_ALIAS)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const dbAddr = (data?.metadata as Record<string, any> | null)?.address;
    if (isValidEvmAddress(dbAddr)) {
      try {
        await params.redis.set(TREASURY_REDIS_KEY, dbAddr.trim(), 60 * 60 * 24 * 365);
      } catch {}
      return { address: dbAddr.trim(), configured: true, source: 'db' };
    }
  } catch {}

  if (!params.autoProvision || !params.apiKey) {
    return { address: null, configured: false, source: 'unconfigured' };
  }

  const prov = await provisionCrossmintEvmWallet({
    baseUrl: params.baseUrl,
    chain: params.chain,
    apiKey: params.apiKey,
    ownerLocator: TREASURY_OWNER_LOCATOR,
    alias: TREASURY_ALIAS,
    signerSecret: params.signerSecret,
    signerAddress: params.signerAddress,
  });

  if (!prov.ok) {
    return {
      address: null,
      configured: false,
      source: 'unconfigured',
      error: prov.message,
    };
  }

  try {
    await params.redis.set(TREASURY_REDIS_KEY, prov.address, 60 * 60 * 24 * 365);
  } catch {}
  try {
    await params.supabase.from('audit_log').insert({
      actor_id: null,
      action: 'CROSSMINT_TREASURY_PROVISIONED',
      entity_type: 'crossmint_treasury',
      entity_id: TREASURY_ALIAS,
      metadata: {
        address: prov.address,
        chain: params.chain,
        ownerLocator: TREASURY_OWNER_LOCATOR,
        type: prov.raw?.type || 'smart',
      },
    });
  } catch {}

  return { address: prov.address, configured: true, source: 'provisioned' };
}

export async function executeCrossmintUsdcTransfer(params: {
  baseUrl: string;
  chain: string;
  apiKey: string;
  fromWalletAddress: string;
  toAddress: string;
  amountUsdc: number;
  idempotencyKey: string;
  signerSecret?: string;
}): Promise<
  | {
      ok: true;
      txId: string | null;
      txHash: string | null;
      explorerLink: string | null;
      status: string;
      raw: Record<string, any>;
    }
  | {
      ok: false;
      status: number;
      isAuthError: boolean;
      message: string;
      data?: Record<string, any>;
    }
> {
  const secret = (params.signerSecret || '').trim();
  if (secret) {
    try {
      const wallets = CrossmintWallets.from(createCrossmint({ apiKey: params.apiKey }));
      const wallet = await wallets.getWallet(params.fromWalletAddress, {
        chain: params.chain as any,
      });
      await wallet.useSigner({ type: 'server', secret });
      const tx = await wallet.send(params.toAddress, 'usdc', params.amountUsdc.toFixed(2));
      return {
        ok: true,
        txId: tx?.transactionId || null,
        txHash: tx?.hash || null,
        explorerLink: tx?.explorerLink || null,
        status: 'SUBMITTED',
        raw: tx as unknown as Record<string, any>,
      };
    } catch (err: any) {
      const msg = String(err?.message || 'SDK transfer failed').trim();
      const isAuth = msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('scope');
      return {
        ok: false,
        status: isAuth ? 403 : 400,
        isAuthError: isAuth,
        message: msg,
      };
    }
  }

  // REST Token Transfers endpoint (for api-key / MPC custodial wallets)
  const tokenLocator = `${params.chain}:usdc`;
  const endpoint = `${params.baseUrl}/2025-06-09/wallets/${encodeURIComponent(params.fromWalletAddress)}/tokens/${encodeURIComponent(tokenLocator)}/transfers`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': params.apiKey,
        'x-idempotency-key': params.idempotencyKey,
      },
      body: JSON.stringify({
        recipient: params.toAddress,
        amount: params.amountUsdc.toFixed(2),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (response.ok) {
      return {
        ok: true,
        txId: String(data.id || data.transferId || '') || null,
        txHash: String(data.txHash || data.onChain?.txId || '') || null,
        explorerLink: String(data.explorerLink || data.onChain?.explorerLink || '') || null,
        status: String(data.status || 'SUBMITTED'),
        raw: data,
      };
    }

    const msg = String(data?.message || data?.error || '').trim();
    const isAuth = response.status === 401 || response.status === 403;
    return {
      ok: false,
      status: response.status,
      isAuthError: isAuth,
      message: msg || 'Crossmint rejected the USDC transfer.',
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 503,
      isAuthError: false,
      message: String(err?.message || 'Network error calling Crossmint transfer API').trim(),
    };
  }
}
