// Offline support. App files are fetched fresh when online (falling back to the cache when
// offline or slow), so a new deploy is picked up on the next load. Fonts are cache-first.
// Bump CACHE when adding or renaming files.

const CACHE = 'overload-v6';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/analytics.js',
  './js/app.js',
  './js/art.js',
  './js/chart.js',
  './js/components.js',
  './js/data.js',
  './js/engine.js',
  './js/picker.js',
  './js/share.js',
  './js/store.js',
  './js/timer.js',
  './js/ui.js',
  './js/views/exercises.js',
  './js/views/history.js',
  './js/views/settings.js',
  './js/views/shared.js',
  './js/views/today.js',
  './js/views/workout.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter((k) => k !== CACHE);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    // An update replaced an older version: reload open tabs so they run the new code.
    if (old.length) {
      for (const win of await self.clients.matchAll({ type: 'window' })) win.navigate(win.url).catch(() => {});
    }
  })());
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (fonts) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await Promise.race([fetch(new Request(req, { cache: 'no-cache' })), timeout(4000)]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});
