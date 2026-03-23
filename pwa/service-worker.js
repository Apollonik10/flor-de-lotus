/* =========================
   FLOR DE LÓTUS — SERVICE WORKER
   v2 — cache corrigido + estratégia offline robusta
========================= */

// CORREÇÃO: versão incrementada para forçar atualização do cache antigo
const CACHE_NAME = 'flor-de-lotus-v2';

const urlsToCache = [
    // CORREÇÃO #3: arquivo real é cardapio.html, não index.html
    './cardapio.html',
    // CORREÇÃO #3: menu.json adicionado — essencial para funcionar offline
    './menu.json',
    './styles.css',
    './app.js',
    './manifest.json',
    './audio/happy.mp3',
    './icons/fundo1.png',
    // Dependências externas
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
    'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;500&display=swap'
];

/* =========================
   INSTALAÇÃO — pré-cache dos arquivos essenciais
========================= */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Instalando cache:', CACHE_NAME);
                // addAll falha silenciosamente para recursos externos indisponíveis
                return cache.addAll(urlsToCache).catch(err => {
                    console.warn('[SW] Alguns recursos não foram cacheados:', err);
                });
            })
            // Ativa imediatamente sem esperar a aba ser fechada
            .then(() => self.skipWaiting())
    );
});

/* =========================
   ATIVAÇÃO — limpa caches antigos
========================= */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keyList =>
                Promise.all(
                    keyList.map(key => {
                        if (key !== CACHE_NAME) {
                            console.log('[SW] Removendo cache antigo:', key);
                            return caches.delete(key);
                        }
                    })
                )
            )
            // Assume controle de todas as abas abertas imediatamente
            .then(() => self.clients.claim())
    );
});

/* =========================
   FETCH — estratégia Cache First com fallback para rede
   - Recursos locais: serve do cache, atualiza em background
   - Recursos externos (CDN, Google Fonts): rede primeiro, cache como backup
   - menu.json: sempre tenta rede primeiro para pegar atualizações de preço/itens
========================= */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isExternal = url.origin !== self.location.origin;
    const isMenu = url.pathname.endsWith('menu.json');

    // menu.json — Network First: preço e cardápio devem estar sempre atualizados
    if (isMenu) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Recursos externos — Cache First (economiza dados móveis)
    if (isExternal) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request)
                    .then(response => {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                        return response;
                    })
                )
        );
        return;
    }

    // Recursos locais — Cache First com atualização em background (Stale While Revalidate)
    event.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(event.request).then(cached => {
                const networkFetch = fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => null);

                // Retorna o cache imediatamente se disponível, senão espera a rede
                return cached || networkFetch;
            })
        )
    );
});

/* =========================
   PUSH — notificações (base para uso futuro)
========================= */
self.addEventListener('push', event => {
    if (!event.data) return;

    const options = {
        body:    event.data.text(),
        icon:    './icons/icon-192.png',
        badge:   './icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: './cardapio.html' }
    };

    event.waitUntil(
        self.registration.showNotification('🍣 Flor de Lótus', options)
    );
});

/* =========================
   NOTIFICATION CLICK — abre o app ao clicar na notificação
========================= */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || './cardapio.html')
    );
});
