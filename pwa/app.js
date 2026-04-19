'use strict';
/* ═══════════════════════════════════════════════════
   app.js — Guard de acesso + Bootstrap
═══════════════════════════════════════════════════ */

// Guard síncrono
const _path  = window.location.pathname;
const _user  = localStorage.getItem('fl_user');
const _visit = localStorage.getItem('fl_visited');

if (!_user && !_visit) {
  const onMenu = _path.includes('./index.html') || /\/pwa\/?$/.test(_path);
  if (onMenu) window.location.replace('./register.html');
}

// Debug visual — mostra qualquer erro JS na tela
window.addEventListener('error', e => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c73a32;color:#fff;padding:.8rem;z-index:9999;font-size:.75rem;white-space:pre-wrap;';
  d.textContent = `JS ERROR: ${e.message} | ${e.filename?.split('/').pop()}:${e.lineno}`;
  document.body?.appendChild(d);
});
window.addEventListener('unhandledrejection', e => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#b03020;color:#fff;padding:.8rem;z-index:9999;font-size:.75rem;white-space:pre-wrap;';
  d.textContent = `PROMISE ERROR: ${e.reason}`;
  document.body?.appendChild(d);
});

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

  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);
}

window.changeCartQty       = changeCartQty;
window.openProfileDrawer   = openProfileDrawer;
window.closeProfileDrawer  = closeProfileDrawer;
window.renderProfileDrawer = renderProfileDrawer;

// FIX: módulos já executam com DOM pronto — chama direto
// DOMContentLoaded pode já ter disparado antes do módulo ser registrado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}