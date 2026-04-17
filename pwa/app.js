'use strict';
// app.js (COLOCA NO TOPO, antes de qualquer init)

const path = window.location.pathname;
const usuarioRegistrado = localStorage.getItem('usuarioRegistrado');

// se já registrou → nunca mais vê landing/register
if (usuarioRegistrado === 'true') {
  if (path.includes('index.html') || path.includes('register.html')) {
    window.location.href = './cardapio.html';
  }
}

// se NÃO registrou → não pode acessar cardápio direto
if (!usuarioRegistrado) {
  if (path.includes('cardapio.html')) {
    window.location.href = './index.html';
  }
}
/* ═══════════════════════════════════════════════════
   app.js — Bootstrap da aplicação
═══════════════════════════════════════════════════ */

import { loadPersistedData }                        from './js/state.js';
import { fetchMenu }                                from './js/api.js';
import { renderFilterBar, renderContent }           from './js/render.js';
import { bindGlobalEvents }                         from './js/events.js';
import { registerSW }                               from './js/sw.js';
import { changeCartQty, closeCartDrawer }           from './js/cart.js';
import { renderLoyaltyBadge }                       from './js/loyalty.js';
import { openProfileDrawer, closeProfileDrawer,
         renderProfileDrawer }                      from './js/profile.js';
import { updateFavBadge }                           from './js/favorites.js';

async function init() {
  loadPersistedData();
  await fetchMenu();
  renderFilterBar();
  renderContent();
  bindGlobalEvents();
  registerSW();
  renderLoyaltyBadge();
  updateFavBadge();

  /* Fechar carrinho pelo X do drawer */
  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);
}

/* Expõe para onclick gerados dinamicamente */
window.changeCartQty       = changeCartQty;
window.openProfileDrawer   = openProfileDrawer;
window.closeProfileDrawer  = closeProfileDrawer;
window.renderProfileDrawer = renderProfileDrawer;

document.addEventListener('DOMContentLoaded', init);