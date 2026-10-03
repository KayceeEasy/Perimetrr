importScripts('./version.js');
const CACHE_NAME = 'perimetrr-v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0.0');
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './common.js',
  './manifest.json',
  './version.js',
  './image/perimetrr-mark.svg'
];

self.addEventListener('install', (event) => {
  const versionedShell = APP_SHELL.map(url => url + (url.includes('?') ? '&' : '?') + 'v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : Date.now()));
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(versionedShell))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('perimetrr-v') && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Bypass service worker completely for administrative interfaces
  if (/\/(command-center|watch-tower|onboard|hybrid|enterprise)\//.test(url.pathname)) return;

  // Network-First for HTML navigation so users never get trapped in stale app shells
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(async () => (await caches.match('./index.html', { ignoreSearch: true })) || new Response('You are offline. Reconnect and reload Perimetrr.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
    );
    return;
  }

  // Never cache arbitrary endpoints, exports, credentials or user data.
  if (!/\/(style\.css|polish\.css|script\.js|common\.js|manifest\.json|version\.js)$/.test(url.pathname) && !url.pathname.includes('/image/')) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
      
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return fetchPromise;
    })
  );
});

// Web Push Notifications for Transfers & Attendance Alerts
self.addEventListener('push', (event) => {
  let data = { title: 'The Perimeter Notification', body: 'New workspace update available.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'The Perimeter Alert';
  const options = {
    body: data.body || '',
    icon: './image/perimetrr-mark.svg',
    badge: './image/perimetrr-mark.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './command-center/',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requested = new URL((event.notification.data && event.notification.data.url) || './command-center/', self.registration.scope);
  const targetUrl = requested.origin === self.location.origin ? requested.href : new URL('./command-center/', self.registration.scope).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

