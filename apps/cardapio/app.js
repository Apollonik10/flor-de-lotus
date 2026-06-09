'use strict';

/* ═══════════════════════════════════════════════════
   app.js — Bootstrap da aplicação
════════════════════════════════════════════════════ */

import { loadPersistedData }              from './js/state.js';
import { fetchMenu, checkStoreStatus, subscribeToRealtimeUpdates } from './js/api.js';
import { renderFilterBar, renderContent } from './js/render.js';
import { bindGlobalEvents }               from './js/events.js';
import { registerSW }                     from './js/sw.js';
import { changeCartQty, closeCartDrawer, updateCartUI } from './js/cart.js';
import { renderLoyaltyBadge, initLoyalty }             from './js/loyalty.js';
import {
  openProfileDrawer,
  closeProfileDrawer,
  renderProfileDrawer
} from './js/profile.js';

import { updateFavBadge }                    from './js/favorites.js';
import { syncProfile }                       from './js/db.js';
import { checkActiveOrder, reopenTracking, closeOrderTracking, cancelOrder } from './js/order-tracking.js';

async function init() {
  loadPersistedData();

  // Busca menu e status da loja em paralelo
  const [menuRes, store] = await Promise.all([
    fetchMenu(),
    checkStoreStatus()
  ]);

  if (!store.is_open) {
    import('./js/toast.js').then(m => {
      m.showToast(`🌙 No momento estamos fechados. ${store.reason || ''}`, 'warning', 6000);
    });
  }

  renderFilterBar();
  renderContent();
  updateCartUI();
  renderProfileDrawer();

  // Ativa Realtime para atualizações dinâmicas
  subscribeToRealtimeUpdates((type, data) => {
    if (type === 'menu') {
      renderContent();
    } else if (type === 'config') {
      // Se mudar o status de abertura, podemos mostrar toast ou atualizar UI
      checkStoreStatus().then(store => {
        if (!store.is_open) {
          import('./js/toast.js').then(m => m.showToast(`🌙 Loja fechada: ${store.reason || ''}`, 'warning'));
        }
      });
    }
  });

  bindGlobalEvents();

  registerSW();

  renderLoyaltyBadge();
  updateFavBadge();

  // Sincroniza fidelidade (Supabase)
  initLoyalty().catch(() => {});

  // Verifica se há pedido ativo do localStorage (mostra FAB se sim)
  checkActiveOrder();

  // Sync em background
  syncProfile().catch(() => {});

  /* Fechar carrinho */
  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);

  /* FAB "Acompanhar pedido" */
  document.getElementById('fabTrack')
    ?.addEventListener('click', reopenTracking);

  /* Escape fecha tudo */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeOrderTracking();
  });
}

/* Expõe para onclick inline */
window.changeCartQty       = changeCartQty;
window.openProfileDrawer   = openProfileDrawer;
window.closeProfileDrawer  = closeProfileDrawer;
window.renderProfileDrawer = renderProfileDrawer;

document.addEventListener('DOMContentLoaded', init);