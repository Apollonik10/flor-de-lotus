'use strict';

/* ═══════════════════════════════════════════════════
   cart.js — Carrinho, Drawer e pedido WhatsApp
   v2.2 — Supabase + Fidelidade Sync
═══════════════════════════════════════════════════ */

import { state, dom, persistData } from './state.js';
import { formatPrice }             from './utils.js';
import { showToast }               from './toast.js';

import {
  recordOrder,
  renderLoyaltyBadge,
  getOrders,
  getGiftCards
} from './loyalty.js';

import {
  saveOrder,
  syncLoyalty
} from './db.js';

/* ── Adicionar item ── */
export function addToCart(item, qty = 1, sabor = null) {
  const key = sabor
    ? `${item.id}__${sabor}`
    : item.id;

  const existing = state.cart.find(c => c.key === key);

  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      key,
      id: item.id,
      nome: item.nome,
      preco: item.preco,
      imagem: item.imagem,
      sabor: sabor || null,
      qty,
    });
  }

  persistData();
  updateCartUI();

  showToast(`${item.nome} adicionado 🍣`);
}

/* ── Remover item ── */
export function removeFromCart(key) {
  state.cart = state.cart.filter(c => c.key !== key);

  persistData();
  updateCartUI();
  renderCartDrawer();
}

/* ── Alterar quantidade ── */
export function changeCartQty(key, delta) {
  const item = state.cart.find(c => c.key === key);

  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    removeFromCart(key);
  } else {
    persistData();
    updateCartUI();
    renderCartDrawer();
  }
}

/* ── Atualiza badges e FAB ── */
export function updateCartUI() {
  const total = state.cart.reduce((s, c) => s + c.qty, 0);

  const badge = dom.cartCount();

  if (badge) {
    badge.textContent = total;
    badge.classList.toggle('visible', total > 0);
  }

  const fab = dom.fabCart();

  if (fab) {
    fab.classList.toggle('visible', total > 0);

    const cnt = dom.fabCartCount();

    if (cnt) {
      cnt.textContent =
        `${total} ${total === 1 ? 'item' : 'itens'}`;
    }
  }
}

/* ── Drawer ── */
export function openCartDrawer() {
  renderCartDrawer();

  dom.cartDrawer()?.classList.add('open');
  dom.modalOverlay()?.classList.add('open');

  document.body.style.overflow = 'hidden';
}

export function closeCartDrawer() {
  dom.cartDrawer()?.classList.remove('open');
  dom.modalOverlay()?.classList.remove('open');

  document.body.style.overflow = '';
}

/* ── Render Drawer ── */
export function renderCartDrawer() {
  const listEl    = dom.cartItems();
  const emptyEl   = dom.cartEmpty();
  const summaryEl = dom.cartSummary();

  if (!listEl) return;

  if (!state.cart.length) {
    listEl.innerHTML = '';

    emptyEl?.style.setProperty('display', 'flex');
    summaryEl?.style.setProperty('display', 'none');

    return;
  }

  emptyEl?.style.setProperty('display', 'none');
  summaryEl?.style.setProperty('display', 'block');

  const total = state.cart.reduce(
    (s, c) => s + c.preco * c.qty,
    0
  );

  const tvEl = dom.cartTotalValue();

  if (tvEl) {
    tvEl.textContent = `R$ ${formatPrice(total)}`;
  }

  listEl.innerHTML = state.cart.map(c => `
    <div class="cart-item" data-key="${c.key}">
      <div class="cart-item-img">
        <img
          src="${c.imagem}"
          alt="${c.nome}"
          loading="lazy"
        >
      </div>

      <div class="cart-item-info">
        <p class="cart-item-name">
          ${c.nome}
        </p>

        ${c.sabor
          ? `<p class="cart-item-sabor">${c.sabor}</p>`
          : ''
        }

        <p class="cart-item-price">
          R$ ${formatPrice(c.preco * c.qty)}
        </p>
      </div>

      <div class="cart-item-qty">
        <button
          class="qty-btn"
          onclick="window.changeCartQty('${c.key}', 1)"
          aria-label="Aumentar"
        >
          +
        </button>

        <span class="qty-value">
          ${c.qty}
        </span>

        <button
          class="qty-btn"
          onclick="window.changeCartQty('${c.key}', -1)"
          aria-label="Diminuir"
        >
          −
        </button>
      </div>
    </div>
  `).join('');
}

/* ── Enviar pedido WhatsApp ── */
export function sendOrderWhatsApp() {
  if (!state.cart.length) return;

  const total = state.cart.reduce(
    (s, c) => s + c.preco * c.qty,
    0
  );

  /* ── Linhas do pedido ── */
  const lines = state.cart.map(c => {
    const sabor = c.sabor
      ? ` (${c.sabor})`
      : '';

    return (
      `• ${c.qty}x ${c.nome}${sabor} — ` +
      `R$ ${formatPrice(c.preco * c.qty)}`
    );
  });

  /* ── Dados do usuário ── */
  const user = window.FL_USER;

  const nome = user?.name
    ? `*Cliente:* ${user.name}`
    : '';

  const fone = user?.phone
    ? `*WhatsApp:* ${user.phone}`
    : '';

  const endereco = user?.address
    ? `*Endereço:* ${user.address}`
    : '';

  const alergia = user?.allergies?.length
    ? `⚠️ *Alergias:* ${user.allergies.join(', ')}`
    : '';

  const notas = user?.notes
    ? `📝 *Obs:* ${user.notes}`
    : '';

  const semEnd = endereco
    ? ''
    : '📍 Informe seu endereço de entrega, por favor!';

  /* ── Mensagem ── */
  const msg = [
    '🌸 *Flor de Lótus — Novo Pedido*',
    nome,
    fone,
    '',
    ...lines,
    '',
    `*Total: R$ ${formatPrice(total)}*`,
    '',
    endereco,
    alergia,
    notas,
    semEnd,
  ]
    .filter(Boolean)
    .join('\n');

/* ── Abre WhatsApp ── */
  window.open(
    `https://wa.me/5583999700469?text=${encodeURIComponent(msg)}`,
    '_blank',
    'noopener,noreferrer'
  );

  /* ── Salva pedido no Supabase (não bloqueia) ── */
  saveOrder(state.cart, total).catch(() => {});

  /* ── Fidelidade local ── */
  const gift = recordOrder(total);
  renderLoyaltyBadge();

  /* ── Sync fidelidade no Supabase (não bloqueia) ── */
  syncLoyalty(getOrders(), getGiftCards()).catch(() => {});

/* ── Limpa carrinho ── */
  state.cart = [];
  persistData();
  updateCartUI();
  closeCartDrawer();

  /* ── Toast: gift card ou confirmação simples ── */
  setTimeout(() => {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = gift
      ? `🎁 Gift card ${gift.code} desbloqueado! Veja no seu perfil.`
      : '✅ Pedido enviado pelo WhatsApp!';

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
  }, 1200);
}