import { getSupabaseClient } from './supabase';

const ACTIVE_API_URL = 'https://playverzus-api.onrender.com/api';

const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
// Ensure production browsers use the live playverzus-api instead of dead/localhost hosts
const isDeadApi =
  !envApiUrl ||
  envApiUrl.includes('placeholder') ||
  envApiUrl.includes('verzus-xyz.onrender.com') ||
  (typeof window !== 'undefined' && envApiUrl.includes('localhost') && window.location.hostname !== 'localhost');

const API_BASE = isDeadApi ? ACTIVE_API_URL : envApiUrl;

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE.replace(/\/$/, '')}/${cleanEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `HTTP Error ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}
