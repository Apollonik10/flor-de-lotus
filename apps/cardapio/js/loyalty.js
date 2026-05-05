'use strict';

/* ═══════════════════════════════════════════════════
   loyalty.js — Cartão Fidelidade
   · A cada 10 pedidos ≥ R$50 → gift card de R$50
   · Tudo em localStorage (sem backend)
═══════════════════════════════════════════════════ */

const ORDERS_KEY      = 'fl_orders';
const GIFTS_KEY       = 'fl_gift_cards';
const MIN_VALUE       = 50;
const ORDERS_PER_GIFT = 10;
const GIFT_VALUE      = 50;

/* ── Registra pedido e retorna gift card se gerado ── */
export function recordOrder(total) {
  if (total < MIN_VALUE) return null;

  const orders = getOrders();
  orders.push({
    id:    Date.now(),
    valor: total,
    data:  new Date().toISOString(),
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  return checkAndGenerateGift(orders);
}

/* ── Status atual da fidelidade ── */
export function getLoyaltyStatus() {
  const orders    = getOrders();
  const gifts     = getGiftCards();
  const progress  = orders.length % ORDERS_PER_GIFT;
  const available = gifts.filter(g => !g.usado).length;
  return {
    totalPedidos: orders.length,
    progress,
    needed:  ORDERS_PER_GIFT,
    pct:     Math.round((progress / ORDERS_PER_GIFT) * 100),
    available,
    gifts,
  };
}

/* ── Atualiza badge no botão de perfil ── */
export function renderLoyaltyBadge() {
  const badge = document.getElementById('loyaltyBadge');
  if (!badge) return;
  const { available, progress } = getLoyaltyStatus();
  if (available > 0) {
    badge.textContent = available;
    badge.classList.add('visible', 'gift-ready');
  } else if (progress > 0) {
    badge.textContent = progress;
    badge.classList.add('visible');
    badge.classList.remove('gift-ready');
  } else {
    badge.classList.remove('visible', 'gift-ready');
  }
}

/* ── Helpers internos ── */
export function getOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
  catch { return []; }
}

export function getGiftCards() {
  try { return JSON.parse(localStorage.getItem(GIFTS_KEY) || '[]'); }
  catch { return []; }
}

function checkAndGenerateGift(orders) {
  if (orders.length % ORDERS_PER_GIFT !== 0) return null;
  const code    = 'LOTUS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const cards   = getGiftCards();
  const newCard = {
    code,
    valor:     GIFT_VALUE,
    geradoEm:  new Date().toISOString(),
    usado:     false,
  };
  cards.push(newCard);
  localStorage.setItem(GIFTS_KEY, JSON.stringify(cards));
  return newCard;
}