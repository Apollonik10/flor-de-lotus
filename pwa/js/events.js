'use strict';

/* ═══════════════════════════════════════════════════
   events.js — Bind de eventos globais e busca
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';
import { renderFilterBar, renderContent } from './render.js';
import { openCartDrawer, closeCartDrawer, sendOrderWhatsApp } from './cart.js';
import { closeModal } from './modal.js';
import { openProfileDrawer, closeProfileDrawer } from './profile.js';

export function bindGlobalEvents() {
  bindSearch();

  /* Overlay fecha modal, drawer de carrinho ou de perfil */
  dom.modalOverlay()?.addEventListener('click', () => {
    if (dom.cartDrawer()?.classList.contains('open'))         closeCartDrawer();
    else if (document.getElementById('profileDrawer')
               ?.classList.contains('open'))                  closeProfileDrawer();
    else                                                      closeModal();
  });

  /* Escape — fecha tudo */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closeCartDrawer();
    closeProfileDrawer();
  });

  /* Perfil */
  document.getElementById('btnProfile')
    ?.addEventListener('click', () => {
      const drawer = document.getElementById('profileDrawer');
      if (drawer?.classList.contains('open')) closeProfileDrawer();
      else openProfileDrawer();
    });

  /* Carrinho (topo) */
  document.getElementById('btnCart')
    ?.addEventListener('click', () => {
      if (dom.cartDrawer()?.classList.contains('open')) closeCartDrawer();
      else openCartDrawer();
    });

  /* Fechar carrinho (botão interno ao drawer) */
  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);

  /* Favoritos — alterna filtro */
  document.getElementById('btnFav')
    ?.addEventListener('click', () => {
      state.activeFilter =
        state.activeFilter === 'favoritos' ? 'todos' : 'favoritos';
      renderFilterBar();
      renderContent();
      document.getElementById('btnFav')
        ?.classList.toggle('active', state.activeFilter === 'favoritos');
    });

  /* FAB flutuante */
  dom.fabCart()?.addEventListener('click', openCartDrawer);

  /* Enviar pedido via WhatsApp */
  document.getElementById('btnOrderWa')
    ?.addEventListener('click', sendOrderWhatsApp);
}

/* ── Busca com debounce ── */
function bindSearch() {
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