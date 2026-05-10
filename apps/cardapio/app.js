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

import { updateFavBadge }      from './js/favorites.js';
import { syncProfile }         from './js/db.js';
import { closeOrderTracking }  from './js/order-tracking.js';

async function init() {
  loadPersistedData();

  await fetchMenu();

  renderFilterBar();
  renderContent();

  bindGlobalEvents();

  registerSW();

  renderLoyaltyBadge();
  updateFavBadge();

  // Sync em background (não trava a UI)
  syncProfile().catch(() => {});

  /* Fechar carrinho pelo X do drawer */
  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);

  /* Escape fecha tela de acompanhamento também */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeOrderTracking();
  });
}

/* Expõe para onclick gerados dinamicamente */
window.changeCartQty       = changeCartQty;
window.openProfileDrawer   = openProfileDrawer;
window.closeProfileDrawer  = closeProfileDrawer;
window.renderProfileDrawer = renderProfileDrawer;

document.addEventListener('DOMContentLoaded', init);