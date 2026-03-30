'use strict';

/* ═══════════════════════════════════════════════════
   state.js — Estado global + DOM refs + Persistência
   Quando vier Firebase: só loadPersistedData e
   persistData precisam mudar — nada mais.
═══════════════════════════════════════════════════ */

export const state = {
  menu:         [],         // dados do menu.json (futuro: Firestore)
  cart:         [],         // { key, id, nome, preco, imagem, sabor, qty }
  favorites:    new Set(),  // ids favoritados
  search:       '',
  activeFilter: 'todos',    // 'todos' | 'favoritos' | id da categoria
  modalItem:    null,
  modalQty:     1,
  modalSabor:   null,
};

/* ── Referências DOM (lazy — só buscam quando chamadas) ── */
export const dom = {
  filterBar:      () => document.getElementById('filterBar'),
  mainContent:    () => document.getElementById('mainContent'),
  searchInput:    () => document.getElementById('searchInput'),
  cartCount:      () => document.getElementById('cartCount'),
  favCount:       () => document.getElementById('favCount'),
  fabCart:        () => document.getElementById('fabCart'),
  fabCartCount:   () => document.getElementById('fabCartCount'),
  modalOverlay:   () => document.getElementById('modalOverlay'),
  itemModal:      () => document.getElementById('itemModal'),
  cartDrawer:     () => document.getElementById('cartDrawer'),
  cartItems:      () => document.getElementById('cartItems'),
  cartEmpty:      () => document.getElementById('cartEmpty'),
  cartSummary:    () => document.getElementById('cartSummary'),
  cartTotalValue: () => document.getElementById('cartTotalValue'),
  toast:          () => document.getElementById('toast'),
  emptyState:     () => document.getElementById('emptyState'),
};

/* ── Persistência localStorage ──
   Fase Firebase: trocar por Firestore read/write aqui
─────────────────────────────────────────────────── */
export function loadPersistedData() {
  try {
    const favs = JSON.parse(localStorage.getItem('fl_favorites') || '[]');
    favs.forEach(id => state.favorites.add(id));

    const cart = JSON.parse(localStorage.getItem('fl_cart') || '[]');
    state.cart = cart;
  } catch (_) { /* silencia erros de parse */ }
}

export function persistData() {
  localStorage.setItem('fl_favorites', JSON.stringify([...state.favorites]));
  localStorage.setItem('fl_cart',      JSON.stringify(state.cart));
}
