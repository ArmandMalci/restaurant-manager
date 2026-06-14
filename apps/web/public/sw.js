// ─── Cache names ────────────────────────────────────────────────────────────
const SHELL_CACHE = 'rm-shell-v1'; // HTML, root — network-first
const ASSET_CACHE = 'rm-assets-v1'; // /assets/* hashed bundles — cache-first

// ─── Install: pre-cache the app shell ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.add('/')));
  self.skipWaiting();
});

// ─── Activate: purge stale caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const current = [SHELL_CACHE, ASSET_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !current.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch: caching strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests; skip API calls entirely
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // Hashed Vite assets (/assets/…) → cache-first (they never change URL)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
        }),
      ),
    );
    return;
  }

  // App shell (HTML, static files) → network-first, cache fallback for offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});

// ─── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title ?? 'Restaurant Manager';
  const body = data.body ?? '';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
