import { createBrowserClient, type TypedSupabaseClient } from '@playverzus/db';

const ACTIVE_SUPABASE_URL = 'https://vebpkkjerwaaupuahomz.supabase.co';
const ACTIVE_SUPABASE_ANON_KEY = 'sb_publishable_eKvZ4DS2IDm59Tk4JhLCVg_a6dsN7yD';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Protect against dead/expired project URLs or placeholder env variables in host deployments
const isDeadUrl = !envUrl || envUrl.includes('placeholder') || envUrl.includes('sekbqpekqcmhzxhcqjvu');
const supabaseUrl = isDeadUrl ? ACTIVE_SUPABASE_URL : envUrl;
const supabaseAnonKey = isDeadUrl || !envKey || envKey.includes('placeholder') ? ACTIVE_SUPABASE_ANON_KEY : envKey;

let browserClient: TypedSupabaseClient | null = null;

export function getSupabaseClient(): TypedSupabaseClient {
  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}
