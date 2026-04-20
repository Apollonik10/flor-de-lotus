'use strict';

/* ═══════════════════════════════════════════════════
   loyalty.js — Cartão Fidelidade + Instalação PWA
═══════════════════════════════════════════════════ */

const ORDERS_KEY      = 'fl_orders';
const GIFTS_KEY       = 'fl_gift_cards';
const MIN_VALUE       = 50;
const ORDERS_PER_GIFT = 10;
const GIFT_VALUE      = 50;

/* ── Registra pedido ── */
export function recordOrder(total) {
  if (total < MIN_VALUE) return null;

  const orders = getOrders();
  orders.push({
    id: Date.now(),
    valor: total,
    data: new Date().toISOString(),
  });

  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return checkAndGenerateGift(orders);
}

/* ── Status fidelidade ── */
export function getLoyaltyStatus() {
  const orders = getOrders();
  const gifts  = getGiftCards();

  const progress  = orders.length % ORDERS_PER_GIFT;
  const available = gifts.filter(g => !g.usado).length;

  return {
    totalPedidos: orders.length,
    progress,
    needed: ORDERS_PER_GIFT,
    pct: Math.round((progress / ORDERS_PER_GIFT) * 100),
    available,
    gifts,
  };
}

/* ── Badge ── */
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

/* ── Inserir botão instalar ── */
export function injectInstallButton(container) {
  if (!container) return;

  // evita duplicar
  if (document.getElementById('btnInstallApp')) return;

  const btn = document.createElement('button');
  btn.id = 'btnInstallApp';

  btn.style.cssText = `
    margin-top:16px;
    background:linear-gradient(135deg,#8B0000,#B22222);
    color:#fff;
    border:none;
    padding:14px;
    width:100%;
    border-radius:12px;
    font-size:16px;
    font-weight:bold;
  `;

  btn.textContent = '📲 Instalar App';

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else {
      alert("Toque nos 3 pontinhos do navegador e escolha 'Instalar app'");
    }
  });

  container.appendChild(btn);
}

/* ── PWA install ── */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

/* ── Helpers ── */
export function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getGiftCards() {
  try {
    return JSON.parse(localStorage.getItem(GIFTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function checkAndGenerateGift(orders) {
  if (orders.length % ORDERS_PER_GIFT !== 0) return null;

  const code = 'LOTUS-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const cards = getGiftCards();

  const newCard = {
    code,
    valor: GIFT_VALUE,
    geradoEm: new Date().toISOString(),
    usado: false,
  };

  cards.push(newCard);
  localStorage.setItem(GIFTS_KEY, JSON.stringify(cards));

  return newCard;
}