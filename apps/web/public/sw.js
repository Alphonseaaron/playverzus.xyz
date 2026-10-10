/**
 * PlayVerzus Service Worker
 * Handles Web Push notifications and background sync.
 * Installed by the frontend; receives push events from the server even
 * when the browser tab is closed.
 */

const CACHE_NAME = 'playverzus-v1';
const OFFLINE_PAGE = '/';

// ─── Install: cache the shell ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_PAGE, '/icon.png', '/favicon.ico'])
    )
  );
  self.skipWaiting();
});

// ─── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Push: receive and show device notification ───────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PlayVerzus', body: event.data.text() };
  }

  const title = payload.title || 'PlayVerzus Arena';
  const options = {
    body: payload.body || 'Check the arena for updates.',
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    tag: payload.tag || 'playverzus',
    data: payload.data || { url: '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: open/focus the app at the right URL ─────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open with our domain, focus it and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(fullUrl);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// ─── Fetch: network-first with offline fallback ───────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only intercept same-origin navigation requests
  if (
    event.request.mode !== 'navigate' ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_PAGE).then((cached) => cached || new Response('Offline'))
    )
  );
});
