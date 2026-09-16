const CACHE_NAME = 'nexgate-v1.0.2';

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/brand/society-logo.png',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/favicon-64.png',
];

// Install event: Precache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Strategic caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS requests
  if (!url.protocol.startsWith('http')) return;

  // Never cache POST, PUT, DELETE, or dynamic mutative requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Dynamic Security & Visitor APIs: Strictly Network-Only (NEVER stale cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            error: 'OFFLINE_GATE_STATE',
            message: 'Real-time gate and security verification unavailable while offline.',
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 2. Navigation requests (HTML pages for SPA routing)
  // Network-first strategy with offline cache fallback to index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts, Icons)
  // Stale-While-Revalidate strategy
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. All other static GET requests: Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Listen for skipWaiting messages from client UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// =============================================================
// PUSH EVENT: Receive Background Push Notifications from Server
// =============================================================
self.addEventListener('push', (event) => {
  const origin = self.location.origin;

  let payload = {
    title: '🚨 Visitor at Gate',
    body: 'A visitor is waiting at the gate. Tap to open Home.',
    icon: origin + '/icons/icon-192.png',
    badge: origin + '/icons/favicon-32.png',
    data: { url: '/home' },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const iconUrl = payload.icon
    ? (payload.icon.startsWith('http') ? payload.icon : origin + payload.icon)
    : origin + '/icons/icon-192.png';
  const badgeUrl = payload.badge
    ? (payload.badge.startsWith('http') ? payload.badge : origin + payload.badge)
    : origin + '/icons/favicon-32.png';
  const imageUrl = payload.image
    ? (payload.image.startsWith('http') ? payload.image : origin + payload.image)
    : undefined;

  const notificationTag = payload.tag || (payload.data?.requestId ? `visitor-${payload.data.requestId}` : 'visitor-alert');

  const notificationOptions = {
    body: payload.body,
    icon: iconUrl,
    badge: badgeUrl,
    image: imageUrl,
    tag: notificationTag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    vibrate: [500, 200, 500, 200, 500],
    data: {
      url: '/home',
      requestId: payload.data?.requestId || payload.requestId,
      visitorName: payload.data?.visitorName || payload.visitorName,
      flatNumber: payload.data?.flatNumber || payload.flatNumber,
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// =============================================================
// NOTIFICATION CLICK: Open Home Page Always
// =============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const origin = self.location.origin;
  const fullTargetUrl = new URL('/home', origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(origin) && 'focus' in client) {
            client.navigate(fullTargetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(fullTargetUrl);
        }
      })
  );
});

