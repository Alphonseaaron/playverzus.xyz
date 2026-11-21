/**
 * Lightweight zero-dependency Upstash Redis REST client for Vercel serverless routes.
 * Keeps active payment rail (`kopokopo` <-> `crossmint`) and Ground Force Agents ledger
 * 100% persistent across serverless cold starts and edge instances.
 */
function getRedisRestConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  return url && token ? { url, token } : null;
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const cfg = getRedisRestConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    if (!json.result) return null;
    return JSON.parse(json.result) as T;
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown): Promise<void> {
  const cfg = getRedisRestConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(value)),
      cache: 'no-store',
    });
  } catch {
    // Non-fatal fallback to in-memory state
  }
}
