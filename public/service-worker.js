'use strict';

const VER          = 'v12';
const CACHE_STATIC = `fl-static-${VER}`;
const CACHE_DYN    = `fl-dynamic-${VER}`;

/* Arquivos essenciais — se um falhar, o resto continua */
const PRECACHE = [
  '/apps/cardapio/index.html',
  '/apps/cardapio/styles.css',
  '/apps/cardapio/app.js',
  '/assets/menu.json',
  '/apps/cardapio/manifest.json',
  '/apps/cardapio/icons/icon-192.png',
  '/apps/cardapio/icons/icon-512.png',
];

/* INSTALL — cache individual, nunca falha por causa de 1 arquivo */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(async cache => {
      await Promise.allSettled(
        PRECACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] falha ao cachear:', url, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ACTIVATE — limpa caches antigos */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYN)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* FETCH */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* CDN externo (fontes/ícones) → cache first */
  const isExt = url.hostname.includes('fonts.googleapis.com')
             || url.hostname.includes('fonts.gstatic.com')
             || url.hostname.includes('cdnjs.cloudflare.com');
  if (isExt) {
    e.respondWith(cacheFirst(req, CACHE_DYN));
    return;
  }

  /* HTML / JSON → stale-while-revalidate */
  if (
    req.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json')
  ) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  /* Imagens → cache first com fallback */
  if (req.destination === 'image') {
    e.respondWith(
      cacheFirst(req, CACHE_DYN).catch(() =>
        caches.match('/assets/images/fundo1.png')
      )
    );
    return;
  }

  /* CSS / JS / outros → cache first */
  e.respondWith(cacheFirst(req, CACHE_DYN));
});

/* ── Helpers ── */

async function cacheFirst(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
