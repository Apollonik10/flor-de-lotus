'use strict';

/* ═══════════════════════════════════════════════════
   cart.js — Carrinho, Drawer e pedido WhatsApp
   v2.3 — Order Tracking Screen pós-envio
═══════════════════════════════════════════════════ */

import { state, dom, persistData } from './state.js';
import { formatPrice }             from './utils.js';
import { showToast }               from './toast.js';

import {
  recordOrder,
  renderLoyaltyBadge
} from './loyalty.js';

import { saveOrder } from './services/orderService.js';

import { showOrderTracking } from './order-tracking.js';
import { renderPaymentSelector, getPaymentInfo, resetPayment } from './payment-ui.js';
import { validateCoupon, useCoupon } from './services/couponService.js';

/* ── Estado do cupom ── */
let _appliedCoupon = null;

export function getAppliedCoupon() { return _appliedCoupon; }
export function clearCoupon() { _appliedCoupon = null; }

/* ── Adicionar item ── */
export function addToCart(item, qty = 1, sabor = null) {
  const key = sabor ? `${item.id}__${sabor}` : item.id;
  const existing = state.cart.find(c => c.key === key);

  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      key,
      id:     item.id,
      nome:   item.nome,
      preco:  item.preco,
      imagem: item.imagem,
      sabor:  sabor || null,
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
    if (cnt) cnt.textContent = `${total} ${total === 1 ? 'item' : 'itens'}`;
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

  const total = state.cart.reduce((s, c) => s + c.preco * c.qty, 0);

  const tvEl = dom.cartTotalValue();
  if (tvEl) tvEl.textContent = `R$ ${formatPrice(total)}`;

  listEl.innerHTML = state.cart.map(c => `
    <div class="cart-item" data-key="${c.key}">
      <div class="cart-item-img">
        <img src="${c.imagem}" alt="${c.nome}" loading="lazy">
      </div>

      <div class="cart-item-info">
        <p class="cart-item-name">${c.nome}</p>
        ${c.sabor ? `<p class="cart-item-sabor">${c.sabor}</p>` : ''}
        <p class="cart-item-price">R$ ${formatPrice(c.preco * c.qty)}</p>
      </div>

      <div class="cart-item-qty">
        <button class="qty-btn"
          onclick="window.changeCartQty('${c.key}', 1)"
          aria-label="Aumentar">+</button>
        <span class="qty-value">${c.qty}</span>
        <button class="qty-btn"
          onclick="window.changeCartQty('${c.key}', -1)"
          aria-label="Diminuir">−</button>
      </div>
    </div>
  `).join('');

  /* ── Renderiza seletor de pagamento ── */
  renderPaymentSelector(summaryEl);

  /* ── Renderiza área de cupom ── */
  renderCouponArea(summaryEl, total);
}

/* ── Área de Cupom ── */
function renderCouponArea(summaryEl, total) {
  if (!summaryEl) return;

  // Evita duplicar
  if (summaryEl.querySelector('.coupon-area')) return;

  const couponWrap = document.createElement('div');
  couponWrap.className = 'coupon-area';

  if (_appliedCoupon) {
    couponWrap.innerHTML = `
      <div class="coupon-applied">
        <span class="coupon-badge">🎟️ ${_appliedCoupon.code}</span>
        <span class="coupon-discount">-${_appliedCoupon.discount_type === 'percent' ? _appliedCoupon.discount_value + '%' : 'R$ ' + _appliedCoupon.discount_value}</span>
        <button class="coupon-remove" onclick="window._removeCoupon()" aria-label="Remover cupom">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  } else {
    couponWrap.innerHTML = `
      <div class="coupon-input-wrap">
        <input type="text" id="couponInput" class="coupon-input" placeholder="Código do cupom" maxlength="20" inputmode="text" />
        <button id="btnApplyCoupon" class="coupon-btn" onclick="window._applyCoupon()">Aplicar</button>
      </div>
      <div id="couponMsg" class="coupon-msg" style="display:none"></div>
    `;
  }

  // Insere antes do seletor de pagamento
  const ps = summaryEl.querySelector('.payment-selector');
  summaryEl.insertBefore(couponWrap, ps);
}

/* ── Aplicar cupom ── */
window._applyCoupon = async function() {
  const input = document.getElementById('couponInput');
  const msgEl = document.getElementById('couponMsg');
  if (!input) return;

  const code = input.value.trim();
  if (!code) return;

  const total = state.cart.reduce((s, c) => s + c.preco * c.qty, 0);

  input.disabled = true;
  if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Validando...'; msgEl.className = 'coupon-msg'; }

  const result = await validateCoupon(code, total);

  input.disabled = false;

  if (result.valid) {
    _appliedCoupon = result;
    if (msgEl) { msgEl.textContent = 'Cupom aplicado! ✓'; msgEl.className = 'coupon-msg coupon-msg--success'; }
    showToast(`🎟️ Cupom ${result.code} aplicado!`);
    renderCartDrawer();
  } else {
    if (msgEl) { msgEl.textContent = result.error || 'Cupom inválido'; msgEl.className = 'coupon-msg coupon-msg--error'; }
  }
};

/* ── Remover cupom ── */
window._removeCoupon = function() {
  _appliedCoupon = null;
  renderCartDrawer();
  showToast('Cupom removido');
};

/* ── Enviar pedido WhatsApp ── */
export async function sendOrderWhatsApp() {
  if (!state.cart.length) return;

  const subtotal = state.cart.reduce((s, c) => s + c.preco * c.qty, 0);
  const couponDiscount = _appliedCoupon ? _appliedCoupon.discount : 0;
  const total = subtotal - couponDiscount;

  /* ── Pagamento ── */
  const { method: payMethod, troco: trocoVal } = getPaymentInfo();
  const payLabels  = { cartao: '💳 Cartão', pix: '🟣 Pix', dinheiro: '💵 Dinheiro' };
  const pagamento  = payMethod
    ? `*Pagamento:* ${payLabels[payMethod] || payMethod}${payMethod === 'dinheiro' && trocoVal ? ` (troco para R$ ${trocoVal})` : ''}`
    : '';

  /* ── Cupom ── */
  const cupomLinha = _appliedCoupon
    ? `🎟️ *Cupom ${_appliedCoupon.code}:* -R$ ${formatPrice(couponDiscount)}`
    : '';

  /* ── Linhas do pedido ── */
  const lines = state.cart.map(c => {
    const sabor = c.sabor ? ` (${c.sabor})` : '';
    return `• ${c.qty}x ${c.nome}${sabor} — R$ ${formatPrice(c.preco * c.qty)}`;
  });

  /* ── Dados do usuário ── */
  const user = window.FL_USER;

  const nome     = user?.name     ? `*Cliente:* ${user.name}`     : '';
  const fone     = user?.phone    ? `*WhatsApp:* ${user.phone}`   : '';
  const endereco = user?.address  ? `*Endereço:* ${user.address}` : '';
  const alergia  = user?.allergies?.length
    ? `⚠️ *Alergias:* ${user.allergies.join(', ')}`
    : '';
  const notas    = user?.notes    ? `📝 *Obs:* ${user.notes}`     : '';
  const semEnd   = endereco       ? '' : '📍 Informe seu endereço de entrega, por favor!';

  /* ── Mensagem ── */
  const msg = [
    '🌸 *Flor de Lótus — Novo Pedido*',
    nome, fone,
    '',
    ...lines,
    '',
    cupomLinha,
    `*Total: R$ ${formatPrice(total)}*`,
    '',
    pagamento,
    endereco, alergia, notas, semEnd,
  ]
    .filter(Boolean)
    .join('\n');

  /* ── Salva carrinho local ANTES de limpar ── */
  const cartSnapshot = [...state.cart];

  /* ── 1. Salva no Supabase (aguarda para pegar o ID) ── */
  let orderId = null;
  try {
    orderId = await saveOrder(cartSnapshot, total, payMethod, trocoVal);
    if (!orderId) console.warn('[cart] saveOrder retornou null — verifique RLS no Supabase');
  } catch (err) {
    console.warn('[cart] saveOrder falhou:', err.message);
  }

  /* Reseta pagamento e cupom */
  resetPayment();
  const usedCoupon = _appliedCoupon;
  _appliedCoupon = null;

  /* Registra uso do cupom no Supabase */
  if (usedCoupon && usedCoupon.coupon_id && orderId) {
    useCoupon(usedCoupon.coupon_id, orderId).catch(() => {});
  }

  /* ── 2. Abre WhatsApp ── */
  window.open(
    `https://wa.me/5583999700469?text=${encodeURIComponent(msg)}`,
    '_blank',
    'noopener,noreferrer'
  );

  /* ── 3. Fidelidade ── */
  const gift = recordOrder(total);
  renderLoyaltyBadge();

  /* ── 4. Limpa carrinho ── */
  state.cart = [];
  persistData();
  updateCartUI();
  closeCartDrawer();

  /* ── 5. Dados de Pagamento (Pix Mock) ── */
  let paymentData = null;
  if (payMethod === 'pix') {
    // Simulando retorno da Edge Function (enquanto não integramos com Efí)
    paymentData = {
      pix_copy_paste: '00020126580014BR.GOV.BCB.PIX0136flordelotus-demo-key-12345678905204000053039865405' + total.toFixed(2).replace('.', '') + '5802BR5913FLOR DE LOTUS6009CAJAZEIRAS62070503***6304ABCD',
      qr_code_base64: null, // null ativa o modo visual "MOCK" no tracking
      amount: total
    };
    // Pequeno delay simulado para UX
    await new Promise(r => setTimeout(r, 600));
  }

  /* ── 6. Mostra tela de acompanhamento ── */
  showOrderTracking(orderId, cartSnapshot, total, paymentData);

  /* ── 6. Toast gift card (se ganhou) ── */
  if (gift) {
    setTimeout(() => {
      showToast(`🎁 Gift card ${gift.code} desbloqueado! Veja no seu perfil.`);
    }, 800);
  }
}