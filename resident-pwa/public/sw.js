const CACHE_NAME = 'nexgate-v1.0.0';

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
  let payload = {
    title: '🚨 Visitor at Gate',
    body: 'A visitor is waiting at the gate for approval.',
    icon: '/brand/society-logo.png',
    badge: '/icons/favicon-32.png',
    tag: `gate-alert-${Date.now()}`,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/brand/society-logo.png',
    badge: payload.badge || '/icons/favicon-32.png',
    image: payload.image,
    tag: payload.tag || `gate-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 400],
    data: payload.data || { url: '/' },
    actions: payload.actions || [
      { action: 'approve', title: '✅ Allow Entry' },
      { action: 'reject', title: '❌ Deny Entry' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// =============================================================
// NOTIFICATION CLICK: Handle Actions & Deep Linking to PWA
// =============================================================
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  const requestId = data.requestId;

  notification.close();

  // 1. Direct "Allow Entry" Action from Lock Screen / Notification
  if (action === 'approve' && requestId) {
    event.waitUntil(
      fetch(`/api/visitor-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token || ''}`,
        },
        body: JSON.stringify({}),
      })
        .then(() => {
          return self.registration.showNotification('Entry Allowed ✅', {
            body: `Visitor entry approved for request ${requestId}.`,
            icon: '/brand/society-logo.png',
            badge: '/icons/favicon-32.png',
            tag: `approved-${requestId}`,
          });
        })
        .catch((err) => {
          console.warn('[SW Notification] Quick approve error:', err);
        })
    );
    return;
  }

  // 2. Direct "Deny Entry" Action from Lock Screen / Notification
  if (action === 'reject' && requestId) {
    event.waitUntil(
      fetch(`/api/visitor-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token || ''}`,
        },
        body: JSON.stringify({ reason: 'Entry denied by resident' }),
      })
        .then(() => {
          return self.registration.showNotification('Entry Denied ❌', {
            body: `Visitor entry denied for request ${requestId}.`,
            icon: '/brand/society-logo.png',
            badge: '/icons/favicon-32.png',
            tag: `rejected-${requestId}`,
          });
        })
        .catch((err) => {
          console.warn('[SW Notification] Quick reject error:', err);
        })
    );
    return;
  }

  // 3. Notification Body Click: Focus existing client or open PWA root
  const targetUrl = data.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

