'use strict';

/* ═══════════════════════════════════════════════════════
   FLOR DE LÓTUS — service-worker.js (RAIZ)
   Coloque na RAIZ do projeto: /service-worker.js
   Escopo: controla TODA a aplicação (landing + PWA)

   Estratégias:
   · HTML/JSON  → Stale-While-Revalidate  (rápido + fresco)
   · CSS/JS     → Cache First             (assets estáticos)
   · Fontes/CDN → Cache First             (muito estáveis)
   · Imagens    → Cache First + fallback  (placeholder off)
═══════════════════════════════════════════════════════ */

const VER          = 'v3';
const CACHE_STATIC = `fl-static-${VER}`;
const CACHE_DYN    = `fl-dynamic-${VER}`;

/* Arquivos pré-cacheados no install */
const PRECACHE = [
  /* Landing */
  '/',
  '/index.html',
  '/page-lotus/index-v2.html',
  '/landing-patch.css',
  '/landing-patch.js',

  /* PWA */
  '/pwa/cardapio.html',
  '/pwa/styles.css',
  '/pwa/pwa-patch.css',
  '/pwa/app.js',
  '/pwa/menu.json',
  '/pwa/register.html',

  /* Raiz */
  '/manifest.json',
];

/* ── Install: pré-cacheia assets essenciais ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        return Promise.allSettled(
          PRECACHE.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Não cacheou ${url}:`, err.message)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: limpa caches antigos ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYN)
          .map(k => {
            console.log('[SW] 🗑 Deletando cache antigo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: roteador de estratégias ── */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url    = new URL(req.url);
  const origin = location.origin;

  /* 1. Fontes Google / CDN externo → Cache First */
  const isExtFont = url.hostname.includes('fonts.googleapis.com')
    || url.hostname.includes('fonts.gstatic.com')
    || url.hostname.includes('cdnjs.cloudflare.com');

  if (isExtFont) {
    e.respondWith(cacheFirst(req, CACHE_DYN));
    return;
  }

  /* 2. Ignora outros cross-origin */
  if (url.origin !== origin) return;

  /* 3. HTML e JSON → Stale-While-Revalidate */
  const isHTML = req.destination === 'document' || url.pathname.endsWith('.html');
  const isJSON = url.pathname.endsWith('.json');

  if (isHTML || isJSON) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  /* 4. Imagens → Cache First + fallback placeholder */
  if (req.destination === 'image') {
    e.respondWith(
      cacheFirst(req, CACHE_DYN).catch(() =>
        caches.match('/pwa/images/placeholder.jpg')
      )
    );
    return;
  }

  /* 5. CSS, JS, outros assets → Cache First */
  e.respondWith(cacheFirst(req, CACHE_DYN));
});

/* ═══════════════════════════════════════════
   HELPERS DE ESTRATÉGIA
═══════════════════════════════════════════ */

/** Cache First: retorna cache; se não existir, busca na rede e cacheia */
async function cacheFirst(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}

/** Stale-While-Revalidate: retorna cache imediatamente, atualiza em background */
async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(fresh => {
      if (fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    })
    .catch(() => cached); /* offline fallback */

  return cached || fetchPromise;
}