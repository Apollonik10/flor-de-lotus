'use strict';

const CACHE_NAME   = 'flor-lotus-v2';
const STATIC_CACHE = 'flor-lotus-static-v2';

// Arquivos essenciais para funcionar offline
const STATIC_ASSETS = [
  './cardapio.html',
  './styles.css',
  './app.js',
  './menu.json',
  './manifest.json'
];

/* ── Install: pré-cacheia os estáticos ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: remove caches antigos ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Cache First para estáticos, Network First para resto ── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignora requisições externas (CDNs, fonts)
  if (url.origin !== location.origin) return;

  // Cache First para assets estáticos
  if (
    request.destination === 'image' ||
    request.url.endsWith('.css')     ||
    request.url.endsWith('.js')      ||
    request.url.endsWith('.json')    ||
    request.url.endsWith('.html')
  ) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network First para tudo mais
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});