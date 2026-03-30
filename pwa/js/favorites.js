'use strict';

/* ═══════════════════════════════════════════════════
   favorites.js — Lógica de favoritos
═══════════════════════════════════════════════════ */

import { state, dom, persistData } from './state.js';
import { showToast } from './toast.js';
import { renderContent } from './render.js';

export function toggleFavorite(id, btnEl) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    btnEl?.classList.remove('is-fav');
    btnEl?.setAttribute('aria-pressed', 'false');
    if (btnEl) btnEl.querySelector('i').className = 'far fa-heart';
    showToast('Removido dos favoritos');
  } else {
    state.favorites.add(id);
    btnEl?.classList.add('is-fav');
    btnEl?.setAttribute('aria-pressed', 'true');
    if (btnEl) btnEl.querySelector('i').className = 'fas fa-heart';
    showToast('Adicionado aos favoritos ♥');
  }

  persistData();
  updateFavBadge();

  // Re-renderiza se estiver no filtro favoritos
  if (state.activeFilter === 'favoritos') renderContent();
}

export function updateFavBadge() {
  const badge = dom.favCount();
  if (!badge) return;
  const count = state.favorites.size;
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
  document.getElementById('btnFav')?.classList.toggle('active', count > 0);
}
