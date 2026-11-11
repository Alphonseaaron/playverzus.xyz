import { createBrowserClient, type TypedSupabaseClient } from '@playverzus/db';

export const ACTIVE_SUPABASE_URL = 'https://vebpkkjerwaaupuahomz.supabase.co';
export const ACTIVE_SUPABASE_ANON_KEY = 'sb_publishable_eKvZ4DS2IDm59Tk4JhLCVg_a6dsN7yD';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Protect against dead/expired project URLs or placeholder env variables in host deployments
const isDeadUrl = !envUrl || envUrl.includes('placeholder') || envUrl.includes('sekbqpekqcmhzxhcqjvu');
export const supabaseUrl = isDeadUrl ? ACTIVE_SUPABASE_URL : envUrl;
export const supabaseAnonKey =
  isDeadUrl || !envKey || envKey.includes('placeholder') ? ACTIVE_SUPABASE_ANON_KEY : envKey;

/**
 * Synchronises the Supabase session access token with a first-party browser cookie (`sb-auth-token`)
 * so that Next.js Edge Middleware (`middleware.ts`) recognises authenticated sessions on `/dashboard`,
 * `/cashier`, `/settings`, `/friends`, `/admin`, etc. without triggering redirect loops.
 */
export function syncAuthCookie(accessToken: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  if (accessToken) {
    document.cookie = `sb-auth-token=${encodeURIComponent(accessToken)}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax';
  }
}

let browserClient: TypedSupabaseClient | null = null;
let listenerAttached = false;

export function getSupabaseClient(): TypedSupabaseClient {
  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!listenerAttached) {
    listenerAttached = true;
    browserClient.auth
      .getSession()
      .then(({ data }) => {
        syncAuthCookie(data?.session?.access_token ?? null);
      })
      .catch(() => {
        // Ignore initial session read failure
      });
    browserClient.auth.onAuthStateChange((_event, session) => {
      syncAuthCookie(session?.access_token ?? null);
    });
  }
  return browserClient;
}
