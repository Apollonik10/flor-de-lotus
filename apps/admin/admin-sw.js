'use strict';

const CACHE_NAME = 'fl-admin-v1';
const SUPABASE_URL = 'https://aflglnnruovheztrqneg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbGdsbm5ydW92aGV6dHJxbmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDAwNjUsImV4cCI6MjA5Mzg3NjA2NX0.2LOqKN-SX52PbhBtLZA4cHpmjnj3hnOb9qz2N1ROYdU';

console.log('[AdminSW] Service Worker loaded');

self.addEventListener('install', () => {
  console.log('[AdminSW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[AdminSW] Activating...');
  e.waitUntil(self.clients.claim());
});

// ============ PERIODIC SYNC ============
// Verifica novos pedidos periodicamente mesmo com browser fechado (Android PWA)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'fl-check-orders') {
    console.log('[AdminSW] Periodic sync triggered');
    e.waitUntil(checkNewOrders());
  }
});

async function checkNewOrders() {
  try {
    const lastCheck = await getLastCheck();
    console.log('[AdminSW] Checking orders since:', lastCheck);

    // Busca pedidos novos (status = pendente, criados após lastCheck)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?` +
      `select=id,client_name,client_phone,total,created_at` +
      `&status=eq.pendente` +
      `&created_at=gt.${encodeURIComponent(lastCheck)}` +
      `&order=created_at.desc` +
      `&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.ok) {
      console.warn('[AdminSW] Supabase response not ok:', res.status);
      return;
    }

    const orders = await res.json();
    await saveLastCheck(new Date().toISOString());

    if (Array.isArray(orders) && orders.length > 0) {
      const order = orders[0];
      console.log('[AdminSW] New order found:', order.id);
      
      await self.registration.showNotification('🍣 Flor de Lótus — Novo Pedido!', {
        body: `${order.client_name || 'Cliente'} — R$ ${(order.total || 0).toFixed(2)}`,
        icon: '/flor-de-lotus/apps/cardapio/icons/icon-192.png',
        badge: '/flor-de-lotus/apps/cardapio/icons/icon-72.png',
        tag: `order-${order.id}`,
        renotify: true,
        vibrate: [300, 100, 300, 100, 300],
        data: { 
          url: self.registration.scope,
          orderId: order.id
        }
      });
    }
  } catch (err) {
    console.warn('[AdminSW] checkNewOrders error:', err);
  }
}

// ============ PUSH NOTIFICATIONS (para future VAPID integration) ============
self.addEventListener('push', e => {
  console.log('[AdminSW] Push event received');
  
  const data = e.data?.json() ?? {};
  const title = data.title || '🍣 Flor de Lótus';
  const options = {
    body: data.body || 'Novo pedido recebido',
    icon: '/flor-de-lotus/apps/cardapio/icons/icon-192.png',
    badge: '/flor-de-lotus/apps/cardapio/icons/icon-72.png',
    tag: 'new-order',
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    data: { url: self.registration.scope }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ============ NOTIFICATION CLICK ============
// Quando usuário clica na notificação, abre o admin
self.addEventListener('notificationclick', e => {
  console.log('[AdminSW] Notification clicked');
  e.notification.close();

  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const adminUrl = self.registration.scope;
      
      // Se admin já está aberto, foca nele
      const existing = clientList.find(c => c.url.startsWith(adminUrl));
      if (existing) {
        return existing.focus();
      }

      // Caso contrário, abre novo
      return clients.openWindow(adminUrl);
    })
  );
});

// ============ SIMPLE KEY-VALUE STORAGE (usando Cache API) ============
async function getLastCheck() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match('/__fl-last-check__');
    if (res) {
      const time = await res.text();
      return time;
    }
  } catch (err) {
    console.warn('[AdminSW] getLastCheck error:', err);
  }

  // Default: 1 hora atrás
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

async function saveLastCheck(iso) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put('/__fl-last-check__', new Response(iso));
    console.log('[AdminSW] Saved lastCheck:', iso);
  } catch (err) {
    console.warn('[AdminSW] saveLastCheck error:', err);
  }
}
