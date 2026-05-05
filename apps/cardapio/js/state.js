'use strict';

/* ═══════════════════════════════════════════════════
   state.js — Estado global + DOM refs + Persistência
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
};

export function loadPersistedData() {
  try {
    /* Favoritos */
    const favs = JSON.parse(localStorage.getItem('fl_favorites') || '[]');
    favs.forEach(id => state.favorites.add(id));

    /* Carrinho */
    state.cart = JSON.parse(localStorage.getItem('fl_cart') || '[]');

    /* Dados do usuário — expõe globalmente para cart.js */
    const user = JSON.parse(localStorage.getItem('fl_user') || 'null');
    if (user) window.FL_USER = user;
  } catch (_) { /* silencia parse errors */ }
}

export function persistData() {
  try {
    localStorage.setItem('fl_favorites', JSON.stringify([...state.favorites]));
    localStorage.setItem('fl_cart',      JSON.stringify(state.cart));
  } catch (err) {
    console.warn('⚠️ Erro ao persistir dados (possível storage cheio):', err);
    /* Silencia erro para não quebrar UX */
  }
}
