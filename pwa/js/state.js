'use strict';

/* ═══════════════════════════════════════════════════
   state.js — Estado global + DOM refs + Persistência
   Absorve: lógica de fl_user do antigo pwa-patch.js
═══════════════════════════════════════════════════ */

export const state = {
  menu:         [],
  cart:         [],
  favorites:    new Set(),
  search:       '',
  activeFilter: 'todos',
  modalItem:    null,
  modalQty:     1,
  modalSabor:   null,
};

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
  profileDrawer:  () => document.getElementById('profileDrawer'),
};

/* ── Persistência localStorage ── */
export function loadPersistedData() {
  try {
    const favs = JSON.parse(localStorage.getItem('fl_favorites') || '[]');
    favs.forEach(id => state.favorites.add(id));

    const cart = JSON.parse(localStorage.getItem('fl_cart') || '[]');
    state.cart = cart;
  } catch (_) { /* silencia erros de parse */ }

  try {
    window.FL_USER = JSON.parse(localStorage.getItem('fl_user') || 'null');
  } catch (_) {
    window.FL_USER = null;
  }

  localStorage.setItem('fl_visited', '1');
}

export function persistData() {
  localStorage.setItem('fl_favorites', JSON.stringify([...state.favorites]));
  localStorage.setItem('fl_cart',      JSON.stringify(state.cart));
}