// Namazy Service Worker — Offline Support
const CACHE_NAME = 'namazy-v1';

// Files to cache for offline use
const FILES_TO_CACHE = [
  './Namazy.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Syncopate:wght@400;700&family=Outfit:wght@300;400;500;600;700&display=swap'
];

// Install: cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests except fonts
  const url = new URL(event.request.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isSameOrigin = url.origin === location.origin;
  if (!isSameOrigin && !isFont) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache valid responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return the main HTML as fallback
        if (event.request.destination === 'document') {
          return caches.match('./Namazy.html');
        }
      });
    })
  );
});

// Push notifications (for future use)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Namazy', {
      body: data.body || 'Time for prayer.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
      vibrate: [200, 100, 200],
      tag: 'namazy-prayer'
    })
  );
});
