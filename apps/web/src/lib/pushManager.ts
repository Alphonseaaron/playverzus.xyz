'use client';

/**
 * PlayVerzus Web Push Manager
 *
 * Registers the Service Worker, fetches the VAPID public key from the API,
 * subscribes the browser to Web Push, and stores the subscription server-side.
 *
 * Call `initPushNotifications()` once the user is logged in (e.g. in the
 * dashboard layout or after login success).
 */

import { apiClient } from './api';

let pushInitialised = false;

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as unknown as BufferSource;
}

/**
 * Initialise push notifications for the current user.
 * - Registers sw.js as the Service Worker
 * - Requests notification permission
 * - Subscribes to Web Push using the server's VAPID public key
 * - Sends the subscription to the API for storage in Redis
 *
 * Safe to call multiple times — idempotent.
 */
export async function initPushNotifications(): Promise<void> {
  if (pushInitialised) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[Push] Web Push not supported in this browser');
    return;
  }

  try {
    // 1. Register the Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    // 2. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[Push] Notification permission not granted');
      return;
    }

    // 3. Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — just make sure it's saved server-side
      await apiClient('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: existing.toJSON() }),
      }).catch(() => {});
      pushInitialised = true;
      return;
    }

    // 4. Fetch VAPID public key from API
    const { publicKey } = await apiClient<{ publicKey: string }>('/push/vapid-public-key');
    if (!publicKey) {
      console.warn('[Push] No VAPID public key from server — push disabled');
      return;
    }

    // 5. Subscribe via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // 6. Save subscription to server (stored in Redis)
    await apiClient('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    pushInitialised = true;
    console.info('[Push] ✓ Web Push subscription active — notifications enabled');
  } catch (err) {
    // Non-fatal — app works without push
    console.warn('[Push] Initialisation failed:', err);
  }
}

/**
 * Unsubscribe from push notifications (e.g. in settings page)
 */
export async function unsubscribePushNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await apiClient('/push/unsubscribe', { method: 'DELETE' }).catch(() => {});
    }
    pushInitialised = false;
    console.info('[Push] Unsubscribed from push notifications');
  } catch (err) {
    console.warn('[Push] Unsubscribe failed:', err);
  }
}
