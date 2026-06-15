'use strict';

/* ═══════════════════════════════════════════════════
   app.js — Bootstrap da aplicação
════════════════════════════════════════════════════ */

import { state, loadPersistedData } from './js/state.js';
import { fetchMenu, checkStoreStatus, subscribeToRealtimeUpdates } from './js/services/menuService.js';
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
import { syncProfile }                       from './js/services/profileService.js';
import { checkActiveOrder, reopenTracking, closeOrderTracking, cancelOrder } from './js/order-tracking.js';

async function init() {
  console.log('[init] Bootstrap iniciado');
  loadPersistedData();
  window.FL_STATE = state; // Depuração global

  // 1. Inicia busca do menu imediatamente
  const menuPromise = fetchMenu();
  const storePromise = checkStoreStatus();

  // 2. Aguarda o menu e renderiza assim que possível
  try {
    const menuRes = await menuPromise;
    console.log('[init] Menu resolvido, itens:', state.menu.length);
    
    renderFilterBar();
    renderContent();
    updateCartUI();
    renderProfileDrawer();
    console.log('[init] Renderização inicial concluída');
  } catch (err) {
    console.error('[init] Falha ao renderizar menu inicial:', err);
  }

  // 3. Aguarda status da loja em background
  storePromise.then(store => {
    console.log('[init] Status da loja recebido:', store.is_open);
    if (!store.is_open) {
      import('./js/toast.js').then(m => {
        m.showToast(`🌙 No momento estamos fechados. ${store.reason || ''}`, 'warning', 6000);
      });
    }
  }).catch(e => console.warn('[init] Erro ao verificar status da loja:', e));

  // 4. Forçar um re-render após 1.5s para garantir visibilidade
  setTimeout(() => {
    if (state.menu.length > 0 && !document.querySelector('.item-card')) {
      console.log('[init] Forçando re-render de segurança...');
      renderContent();
    }
  }, 1500);

  // 5. Ativa Realtime e outros serviços
  subscribeToRealtimeUpdates((type, data) => {
    if (type === 'menu') {
      renderContent();
    } else if (type === 'config') {
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

  // Verifica se há pedido ativo do localStorage
  checkActiveOrder();

  // Sync em background
  syncProfile().catch(() => {});

  /* Eventos específicos */
  document.getElementById('btnCloseCart')?.addEventListener('click', closeCartDrawer);
  document.getElementById('fabTrack')?.addEventListener('click', reopenTracking);

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
