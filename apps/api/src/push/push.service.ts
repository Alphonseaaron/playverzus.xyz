import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { RedisService } from '../redis/redis.service';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  type?: 'match' | 'tournament' | 'wallet' | 'info' | 'error';
}

/**
 * Web Push Notification Service
 *
 * Sends real push notifications to users' devices — works even when the
 * browser tab is closed — using the W3C Web Push Protocol + VAPID.
 *
 * Requires env vars:
 *   VAPID_PUBLIC_KEY  — from your env (generated, see .env.example)
 *   VAPID_PRIVATE_KEY — from your env
 *   VAPID_SUBJECT     — mailto:support@playverzus.xyz
 *   REDIS_URL         — Upstash Redis connection string
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(private readonly redis: RedisService) {
    const defaultPubKey = 'BF_mYvSksdyk19iB2KoWbYfZBraady2jtgfY91v8rbTYU9Ap9xdldu03q61J3IPxvtok53htErzrMCVKU0ITYyw';
    const defaultPrivKey = 'U9Ap9xdldu03q61J3IPxvtok53htErzrMCVKU0ITYyw';
    const publicKey = process.env.VAPID_PUBLIC_KEY || defaultPubKey;
    const privateKey = process.env.VAPID_PRIVATE_KEY || defaultPrivKey;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@playverzus.xyz';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.enabled = true;
        this.log.log('Web Push (VAPID) initialised ✓');
      } catch (err) {
        this.log.warn({ err }, 'VAPID initialisation failed — push disabled');
        this.enabled = false;
      }
    } else {
      this.log.warn('VAPID keys not configured — push notifications disabled');
      this.enabled = false;
    }
  }

  /** Save a push subscription (called from the frontend after user grants permission) */
  async saveSubscription(userId: string, subscription: webpush.PushSubscription): Promise<void> {
    await this.redis.savePushSubscription(userId, subscription);
    this.log.log({ userId }, 'Push subscription saved');
  }

  /** Remove a push subscription (user revoked or unregistered) */
  async removeSubscription(userId: string): Promise<void> {
    await this.redis.removePushSubscription(userId);
  }

  /** Send a push notification to a specific user */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return;

    const sub = await this.redis.getPushSubscription(userId) as webpush.PushSubscription | null;
    if (!sub) return; // User hasn't subscribed

    await this.sendRaw(userId, sub, payload);
  }

  /** Send push to multiple users (e.g. both match participants) */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(userIds.map((id) => this.sendToUser(id, payload)));
  }

  private async sendRaw(
    userId: string,
    subscription: webpush.PushSubscription,
    payload: PushPayload,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon.png',
          badge: payload.badge || '/icon.png',
          tag: payload.tag || payload.type || 'playverzus',
          data: { url: payload.url || '/', type: payload.type || 'info' },
        }),
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        // Subscription expired or invalid — clean it up
        this.log.log({ userId }, 'Removing expired push subscription');
        await this.redis.removePushSubscription(userId);
      } else {
        this.log.warn({ err, userId }, 'Push send failed');
      }
    }
  }

  /** Return the VAPID public key for the frontend to use when subscribing */
  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || 'BF_mYvSksdyk19iB2KoWbYfZBraady2jtgfY91v8rbTYU9Ap9xdldu03q61J3IPxvtok53htErzrMCVKU0ITYyw';
  }
}
