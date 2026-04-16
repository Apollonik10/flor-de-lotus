'use strict';

const VER          = 'v4';
const CACHE_STATIC = `fl-static-${VER}`;
const CACHE_DYN    = `fl-dynamic-${VER}`;

/* Arquivos pré-cacheados */
const PRECACHE = [
  '/',
  '/index.html',
  '/page-lotus/index.html',

  '/pwa/cardapio.html',
  '/pwa/styles.css',
  '/pwa/app.js',
  '/pwa/menu.json',
  '/pwa/register.html',

  '/pwa/manifest.json',

  /* fallback imagem */
  '/page-lotus/assets/images/uramaki.jpg',
];

/* INSTALL */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATE */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYN)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* FETCH */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* CDN (fonts/icons) */
  const isExt = url.hostname.includes('fonts.googleapis.com')
    || url.hostname.includes('fonts.gstatic.com')
    || url.hostname.includes('cdnjs.cloudflare.com');

  if (isExt) {
    e.respondWith(cacheFirst(req, CACHE_DYN));
    return;
  }

  /* HTML / JSON */
  if (
    req.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json')
  ) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  /* IMAGENS */
  if (req.destination === 'image') {
    e.respondWith(
      cacheFirst(req, CACHE_DYN)
        .then(res => res || caches.match('/page-lotus/assets/images/uramaki.jpg'))
        .catch(() => caches.match('/page-lotus/assets/images/uramaki.jpg'))
    );
    return;
  }

  /* CSS / JS / outros */
  e.respondWith(cacheFirst(req, CACHE_DYN));
});

/* CACHE FIRST (seguro) */
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      cache.put(req, fresh.clone());
      return fresh;
    }
  } catch (err) {}

  return cached || new Response('Offline', { status: 503 });
}

/* STALE WHILE REVALIDATE */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(res => {
      if (res && res.ok) {
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}