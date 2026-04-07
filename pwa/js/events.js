'use strict';

/* ═══════════════════════════════════════════════════
   events.js — Bind de eventos globais e busca
   Absorve: toast de boas-vindas + banner alergias
            do antigo pwa-patch.js
═══════════════════════════════════════════════════ */

import { state, dom }                             from './state.js';
import { renderFilterBar, renderContent }         from './render.js';
import { openCartDrawer, closeCartDrawer,
         sendOrderWhatsApp }                      from './cart.js';
import { closeModal }                             from './modal.js';
import { openProfileDrawer, closeProfileDrawer } from './profile.js';

export function bindGlobalEvents() {
  _bindOverlay();
  _bindKeyboard();
  _bindTopBar();
  _bindFab();
  _bindSearch();
  _initUserGreeting();
}

/* ── Overlay fecha o drawer/modal ativo ── */
function _bindOverlay() {
  dom.modalOverlay()?.addEventListener('click', () => {
    if (dom.cartDrawer()?.classList.contains('open'))         closeCartDrawer();
    else if (dom.profileDrawer()?.classList.contains('open')) closeProfileDrawer();
    else                                                       closeModal();
  });
}

/* ── Escape fecha tudo ── */
function _bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closeCartDrawer();
    closeProfileDrawer();
  });
}

/* ── Botões da top-bar ── */
function _bindTopBar() {
  document.getElementById('btnCart')
    ?.addEventListener('click', () => {
      dom.cartDrawer()?.classList.contains('open')
        ? closeCartDrawer()
        : openCartDrawer();
    });

  document.getElementById('btnFav')
    ?.addEventListener('click', () => {
      state.activeFilter =
        state.activeFilter === 'favoritos' ? 'todos' : 'favoritos';
      renderFilterBar();
      renderContent();
      document.getElementById('btnFav')
        ?.classList.toggle('active', state.activeFilter === 'favoritos');
    });

  document.getElementById('btnProfile')
    ?.addEventListener('click', () => {
      dom.profileDrawer()?.classList.contains('open')
        ? closeProfileDrawer()
        : openProfileDrawer();
    });

  document.getElementById('btnOrderWa')
    ?.addEventListener('click', sendOrderWhatsApp);
}

/* ── FAB flutuante ── */
function _bindFab() {
  dom.fabCart()?.addEventListener('click', openCartDrawer);
}

/* ── Busca com debounce 280ms ── */
function _bindSearch() {
  const input = dom.searchInput();
  if (!input) return;

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.search = input.value;
      if (state.search && state.activeFilter !== 'todos') {
        state.activeFilter = 'todos';
        renderFilterBar();
      }
      renderContent();
    }, 280);
  });
}

/* ── Saudação e banner de alergias ── */
function _initUserGreeting() {
  const user = window.FL_USER;
  if (!user?.name) return;

  const firstName = user.name.split(' ')[0];

  setTimeout(() => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = `Olá, ${firstName}! 🌸`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }, 800);

  if (user.allergies?.length) {
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
      'position:fixed',
      'top:calc(var(--nav-h,60px) + var(--filter-h,52px) + 4px)',
      'left:0;right:0;z-index:150',
      'padding:6px 1rem',
      'font-size:.72rem;letter-spacing:.08em;text-transform:uppercase',
      'text-align:center',
      'background:rgba(199,58,50,.15);color:#f3d7cf',
      'border-bottom:1px solid rgba(199,58,50,.25)',
    ].join(';');
    banner.textContent = `⚠ Alergias registradas: ${user.allergies.join(', ')}`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
  }
}