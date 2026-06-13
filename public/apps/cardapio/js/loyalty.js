'use strict';

/* ═══════════════════════════════════════════════════
   loyalty.js — Cartão Fidelidade
   · A cada 10 pedidos ≥ R$50 → gift card de R$50
   · Tudo em localStorage (com sync Supabase)
═══════════════════════════════════════════════════ */

import { getDeviceId } from './services/profileService.js';
import { fetchLoyalty, syncLoyalty } from './services/loyaltyService.js';

const ORDERS_KEY      = 'fl_orders';
const GIFTS_KEY       = 'fl_gift_cards';
const MIN_VALUE       = 50;
const ORDERS_PER_GIFT = 10;
const GIFT_VALUE      = 50;

/* ── Inicialização: Sincroniza Supabase → LocalStorage ── */
export async function initLoyalty() {
  const deviceId = getDeviceId();
  const remote = await fetchLoyalty(deviceId);

  if (!remote) {
    // Se não tem nada remoto, mas tem local, sobe pro Supabase
    const localOrders = getOrders();
    const localGifts  = getGiftCards();
    if (localOrders.length > 0 || localGifts.length > 0) {
      await syncLoyalty(localOrders, localGifts);
    }
    return;
  }

  let localOrders = getOrders();
  let localGifts  = getGiftCards();
  let changed     = false;

  // 1. Sincroniza Pedidos (pelo contador)
  if (remote.total_orders > localOrders.length) {
    const diff = remote.total_orders - localOrders.length;
    for (let i = 0; i < diff; i++) {
      localOrders.push({
        id:    'sync-' + Date.now() + '-' + i,
        valor: MIN_VALUE,
        data:  new Date().toISOString(),
        synced: true
      });
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify(localOrders));
    changed = true;
  }

  // 2. Sincroniza Gift Cards (merge pelo código)
  const remoteGifts = remote.gift_cards || [];
  remoteGifts.forEach(rg => {
    const idx = localGifts.findIndex(lg => lg.code === rg.code);
    if (idx === -1) {
      localGifts.push(rg);
      changed = true;
    } else {
      // Se o remoto diz que foi usado, atualiza local
      if (rg.usado && !localGifts[idx].usado) {
        localGifts[idx].usado = true;
        changed = true;
      }
    }
  });

  if (changed) {
    localStorage.setItem(GIFTS_KEY, JSON.stringify(localGifts));
    renderLoyaltyBadge();
  }

  // Se local tem mais que o remoto, sincroniza local -> remoto
  if (localOrders.length > remote.total_orders || localGifts.length > remoteGifts.length) {
    await syncLoyalty(localOrders, localGifts);
  }
}

/* ── Registra pedido e retorna gift card se gerado ── */
export function recordOrder(total) {
  if (total < MIN_VALUE) return null;

  const orders = getOrders();
  const newOrder = {
    id:    Date.now(),
    valor: total,
    data:  new Date().toISOString(),
  };
  orders.push(newOrder);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  const gift = checkAndGenerateGift(orders);

  // Sync imediato
  syncLoyalty(orders, getGiftCards()).catch(() => {});

  return gift;
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