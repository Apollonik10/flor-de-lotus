'use strict';

/* ═══════════════════════════════════════════════════
   app.js — Bootstrap da aplicação
════════════════════════════════════════════════════ */

import { loadPersistedData }              from './js/state.js';
import { fetchMenu }                      from './js/api.js';
import { renderFilterBar, renderContent } from './js/render.js';
import { bindGlobalEvents }               from './js/events.js';
import { registerSW }                     from './js/sw.js';
import { changeCartQty, closeCartDrawer } from './js/cart.js';
import { renderLoyaltyBadge }             from './js/loyalty.js';
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

  await fetchMenu();

  renderFilterBar();
  renderContent();

  bindGlobalEvents();

  registerSW();

  renderLoyaltyBadge();
  updateFavBadge();

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