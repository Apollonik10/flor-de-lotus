'use strict';
// app.js — sem redirect forçado; o cardápio é acessível sempre.
/* ═══════════════════════════════════════════════════
   app.js — Bootstrap da aplicação
════════════════════════════════════════════════════ */

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

// Instalação PWA — Controla globalmente a exibição do botão de instalar na top-bar
(function () {
  const btnInstall = document.getElementById('btnInstall');
  function updateBtnInstall() {
    if (!btnInstall) return;
    btnInstall.style.display = window.isInstallable && window.isInstallable() ? 'inline-flex' : 'none';
    btnInstall.setAttribute('aria-disabled', !(window.isInstallable && window.isInstallable()));    
  }
  // Associa click corretamente
  btnInstall?.addEventListener('click', () => window.triggerInstall?.());

  // Atualiza exibição em eventos customizados disparados por install.js
  document.addEventListener('pwa:installable', updateBtnInstall);
  document.addEventListener('pwa:installed', updateBtnInstall);

  // Inicializa ao abrir, cobre casos se o evento disparou antes
  setTimeout(updateBtnInstall, 500);
})();
