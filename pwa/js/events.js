'use strict';

import { state, dom }                                          from './state.js';
import { renderFilterBar, renderContent }                     from './render.js';
import { openCartDrawer, closeCartDrawer, sendOrderWhatsApp } from './cart.js';
import { closeModal }                                         from './modal.js';
import { openProfileDrawer }                                  from './profile.js'; // ← novo import

export function bindGlobalEvents() {
  bindSearch();

  // Overlay fecha modal ou drawer aberto
  dom.modalOverlay()?.addEventListener('click', () => {
    if (dom.cartDrawer()?.classList.contains('open'))    closeCartDrawer();
    else if (document.getElementById('profileDrawer')
              ?.classList.contains('open'))              window.closeProfileDrawer?.();
    else                                                 closeModal();
  });

  // Escape fecha tudo
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closeCartDrawer();
    window.closeProfileDrawer?.();
  });

  // Botão carrinho no topo
  document.getElementById('btnCart')
    ?.addEventListener('click', () => {
      dom.cartDrawer()?.classList.contains('open')
        ? closeCartDrawer()
        : openCartDrawer();
    });

  // ← FIX: fechar carrinho pelo X interno do drawer
  document.getElementById('btnCloseCart')
    ?.addEventListener('click', closeCartDrawer);

  // ← FIX: abrir perfil
  document.getElementById('btnProfile')
    ?.addEventListener('click', openProfileDrawer);

  // Favoritos → alterna filtro
  document.getElementById('btnFav')
    ?.addEventListener('click', () => {
      state.activeFilter =
        state.activeFilter === 'favoritos' ? 'todos' : 'favoritos';
      renderFilterBar();
      renderContent();
      document.getElementById('btnFav')
        ?.classList.toggle('active', state.activeFilter === 'favoritos');
    });

  // FAB flutuante
  dom.fabCart()?.addEventListener('click', openCartDrawer);

  // Enviar pedido WA
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
      if (state.search && state.activeFilter !== 'todos') {
        state.activeFilter = 'todos';
        renderFilterBar();
      }
      renderContent();
    }, 280);
  });
}