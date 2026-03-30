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

  /* Overlay fecha o drawer/modal ativo */
  dom.modalOverlay()?.addEventListener('click', () => {
    if (document.getElementById('profileDrawer')?.classList.contains('open')) {
      closeProfileDrawer();
    } else if (dom.cartDrawer()?.classList.contains('open')) {
      closeCartDrawer();
    } else {
      closeModal();
    }
  });

  /* Escape fecha tudo (teclado físico / acessibilidade) */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closeCartDrawer();
    closeProfileDrawer();
  });

  /* Botão Perfil (esquerda da top-bar) */
  document.getElementById('btnProfile')
    ?.addEventListener('click', () => {
      const drawer = document.getElementById('profileDrawer');
      if (drawer?.classList.contains('open')) closeProfileDrawer();
      else openProfileDrawer();
    });

  /* Botão Carrinho (top-bar) */
  document.getElementById('btnCart')
    ?.addEventListener('click', () => {
      if (dom.cartDrawer()?.classList.contains('open')) closeCartDrawer();
      else openCartDrawer();
    });

  /* Botão fechar carrinho dentro do drawer */
  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);

  /* Botão Favoritos → alterna filtro */
  document.getElementById('btnFav')
    ?.addEventListener('click', () => {
      state.activeFilter =
        state.activeFilter === 'favoritos' ? 'todos' : 'favoritos';
      renderFilterBar();
      renderContent();
      document.getElementById('btnFav')
        ?.classList.toggle('active', state.activeFilter === 'favoritos');
    });

  /* FAB flutuante do carrinho */
  dom.fabCart()?.addEventListener('click', openCartDrawer);

  /* Botão enviar pedido no drawer */
  document.getElementById('btnOrderWa')
    ?.addEventListener('click', sendOrderWhatsApp);
}

/* ── Busca com debounce ── */
function bindSearch() {
  const input = dom.searchInput();
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = input.value;
      /* Ao buscar, reseta filtro para "todos" */
      if (state.search && state.activeFilter !== 'todos') {
        state.activeFilter = 'todos';
        renderFilterBar();
      }
      renderContent();
    }, 280);
  });
}