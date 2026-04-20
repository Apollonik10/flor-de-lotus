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
let deferredPrompt = null;

// captura evento PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// fallback: mostra popup mesmo sem evento
window.addEventListener('load', () => {
  const jaMostrou = localStorage.getItem('fl_install_popup');

  if (!jaMostrou) {
    setTimeout(() => {
      showInstallPopup();
      localStorage.setItem('fl_install_popup', 'true');
    }, 3000); // espera 3s pra não ser agressivo
  }
});

function showInstallPopup() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background:rgba(0,0,0,0.6);
    display:flex;
    justify-content:center;
    align-items:flex-start;
    padding-top:15vh;
    z-index:9999;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background:linear-gradient(135deg, #8B0000, #B22222);
    color:#fff;
    padding:20px;
    border-radius:16px;
    width:90%;
    max-width:340px;
    text-align:center;
    box-shadow:0 10px 30px rgba(0,0,0,0.4);
  `;

  popup.innerHTML = `
    <h2 style="margin-bottom:10px;">🍣 Instale nosso App</h2>
    <p style="font-size:14px; margin-bottom:15px;">
      Tenha acesso rápido ao cardápio e pedidos direto no seu celular.
    </p>

    <button id="installBtn" disabled style="
      background:#fff;
      color:#8B0000;
      border:none;
      padding:12px;
      width:100%;
      border-radius:10px;
      font-weight:bold;
      font-size:16px;
      opacity:0.5;
    ">
      Aguarde 10s...
    </button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const btn = popup.querySelector('#installBtn');

  let time = 10;
  const countdown = setInterval(() => {
    time--;
    btn.textContent = `Aguarde ${time}s...`;

    if (time <= 0) {
      clearInterval(countdown);
      btn.disabled = false;
      btn.textContent = deferredPrompt ? 'Instalar agora' : 'Ok, entendi';
      btn.style.opacity = '1';
    }
  }, 1000);

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
    overlay.remove();
  });
}