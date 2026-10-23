// Offline support: serve from cache immediately, refresh the cache in the background.
// A new deploy shows up on the next app launch. Bump CACHE when adding or renaming files.

const CACHE = 'overload-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/art.js',
  './js/chart.js',
  './js/components.js',
  './js/data.js',
  './js/engine.js',
  './js/picker.js',
  './js/store.js',
  './js/timer.js',
  './js/ui.js',
  './js/views/exercises.js',
  './js/views/history.js',
  './js/views/settings.js',
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
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  const network = fetch(req).then(async (res) => {
    if (res.ok || res.type === 'opaque') {
      const cache = await caches.open(CACHE);
      await cache.put(req, res.clone());
    }
    return res;
  });
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || network));
  e.waitUntil(network.then(() => {}, () => {}));
});
