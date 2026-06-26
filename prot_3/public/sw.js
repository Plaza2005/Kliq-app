const CACHE_NAME = 'kliq-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'Offline' }), { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }
  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached ?? fetch(event.request).then(resp => {
      if (resp.ok && event.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return resp;
    }))
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Kliq', {
      body: data.body ?? 'You have a new notification',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/'));
});
