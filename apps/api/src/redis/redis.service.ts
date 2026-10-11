import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Centralised Redis client using ioredis.
 * Connects to Upstash (or any Redis URL) via REDIS_URL env var.
 * All methods degrade gracefully — if Redis is unavailable the callers
 * fall back to Supabase-based logic so nothing breaks.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor() {
    const defaultUpstashUrl = 'rediss://default:gQAAAAAAA1c6AAIgcDI0MjBjZDdhY2JmY2E0NThmODEwOTJmOWZjMTc4YWM4MQ@funky-ant-218938.upstash.io:6379';
    const url = process.env.REDIS_URL || defaultUpstashUrl;
    if (!url) {
      this.log.warn('REDIS_URL not set — Redis features disabled, using Supabase fallbacks');
      return;
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        lazyConnect: true,
        tls: url.startsWith('rediss://') ? {} : undefined,
      });
      this.client.on('error', (err) => this.log.warn({ err: err.message }, 'Redis connection error'));
      this.client.connect().catch((err) => this.log.warn({ err: err.message }, 'Redis connect failed'));
    } catch (err) {
      this.log.warn({ err }, 'Failed to initialise Redis client');
      this.client = null;
    }
  }

  get isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  /** Set a key with optional TTL in seconds */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.log.warn({ err, key }, 'Redis SET failed');
    }
  }

  /** Get a key value */
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.log.warn({ err, key }, 'Redis GET failed');
      return null;
    }
  }

  /** Delete a key */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.log.warn({ err, key }, 'Redis DEL failed');
    }
  }

  /** Acquire a distributed lock. Returns true if lock acquired. */
  async acquireLock(lockKey: string, ttlSeconds = 60): Promise<boolean> {
    if (!this.client) return true; // No Redis = assume we can proceed (single instance)
    try {
      const result = await this.client.set(`lock:${lockKey}`, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      this.log.warn({ err, lockKey }, 'Redis lock acquire failed — proceeding without lock');
      return true;
    }
  }

  /** Release a distributed lock */
  async releaseLock(lockKey: string): Promise<void> {
    await this.del(`lock:${lockKey}`);
  }

  /** Publish a message to a channel (for Web Push triggers) */
  async publish(channel: string, message: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.publish(channel, message);
    } catch (err) {
      this.log.warn({ err, channel }, 'Redis PUBLISH failed');
    }
  }

  /** Store a Web Push subscription for a user */
  async savePushSubscription(userId: string, subscription: object): Promise<void> {
    await this.set(`push:${userId}`, JSON.stringify(subscription), 60 * 60 * 24 * 90); // 90 days TTL
  }

  /** Get a user's Web Push subscription */
  async getPushSubscription(userId: string): Promise<object | null> {
    const raw = await this.get(`push:${userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Remove a user's push subscription */
  async removePushSubscription(userId: string): Promise<void> {
    await this.del(`push:${userId}`);
  }

  /** Check and enforce a cooldown. Returns remaining seconds (0 = can proceed). */
  async checkCooldown(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client) return 0; // No Redis = bypass cooldown
    try {
      const ttl = await this.client.ttl(`cooldown:${key}`);
      if (ttl > 0) return ttl;
      await this.client.set(`cooldown:${key}`, '1', 'EX', ttlSeconds);
      return 0;
    } catch (err) {
      this.log.warn({ err, key }, 'Redis cooldown check failed — bypassing');
      return 0;
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
