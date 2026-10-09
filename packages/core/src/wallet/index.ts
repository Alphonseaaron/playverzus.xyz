import { createServiceClient } from '@playverzus/db';

import { DemoWallet } from './DemoWallet';
import { StubRealWallet } from './StubRealWallet';
import { PaysafeWallet } from './PaysafeWallet';

import type { WalletService } from './WalletService';

export * from './WalletService';
export * from './paysafe';
export { DemoWallet } from './DemoWallet';
export { StubRealWallet } from './StubRealWallet';
export { PaysafeWallet } from './PaysafeWallet';

let cached: WalletService | null = null;

export function setWallet(wallet: WalletService | null): void {
  cached = wallet;
}

/**
 * Returns the process-wide wallet singleton.
 * WALLET_MODE=paysafe or WALLET_MODE=real switches to PaysafeWallet when Supabase credentials exist.
 */
export function getWallet(): WalletService {
  if (cached) return cached;

  const mode = process.env.WALLET_MODE ?? 'demo';
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (mode === 'real' || mode === 'paysafe') {
    if (url && key) {
      const client = createServiceClient(url, key);
      cached = new PaysafeWallet({ client });
      return cached;
    }
    cached = new StubRealWallet();
    return cached;
  }

  if (!url || !key) {
    if (process.env.NODE_ENV === 'test' || !process.env.SUPABASE_URL) {
      const client = createServiceClient('https://placeholder.supabase.co', 'placeholder-key');
      cached = new DemoWallet({ client });
      return cached;
    }
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Wallet');
  }

  const client = createServiceClient(url, key);
  cached = new DemoWallet({ client });
  return cached;
}
