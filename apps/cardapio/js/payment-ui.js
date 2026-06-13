'use strict';

/* ═══════════════════════════════════════════════════
   payment-ui.js — Gerenciamento da UI de Pagamento
   Extraído de cart.js para seguir SRP (SOLID)
═══════════════════════════════════════════════════ */

import { dom } from './state.js';

// Estado local da seleção de pagamento
window._FL_PAYMENT = null;

/**
 * Renderiza o seletor de pagamento dentro do container do carrinho.
 * @param {HTMLElement} summaryEl - Elemento pai onde o seletor será inserido.
 */
export function renderPaymentSelector(summaryEl) {
  if (!summaryEl) return;

  /* Evita duplicar */
  if (summaryEl.querySelector('.payment-selector')) return;

  const ps = document.createElement('div');
  ps.className = 'payment-selector';
  ps.innerHTML = `
    <p class="payment-label">💳 Forma de pagamento</p>
    <div class="payment-options">
      <button class="pay-btn" data-pay="cartao" onclick="window._selectPayment('cartao',this)">
        <i class="fas fa-credit-card"></i> Cartão
      </button>
      <button class="pay-btn" data-pay="pix" onclick="window._selectPayment('pix',this)">
        <i class="fas fa-qrcode"></i> Pix
      </button>
      <button class="pay-btn" data-pay="dinheiro" onclick="window._selectPayment('dinheiro',this)">
        <i class="fas fa-money-bill-wave"></i> Dinheiro
      </button>
    </div>
    <div class="troco-wrap" id="trocoWrap" style="display:none">
      <label class="troco-label" for="trocoInput">Precisa de troco para quanto?</label>
      <input id="trocoInput" class="troco-input" type="number" min="0" step="0.01"
             placeholder="Ex: 50,00" inputmode="decimal" />
    </div>
  `;

  /* Insere antes do botão WhatsApp */
  const waBtn = summaryEl.querySelector('.btn-order-wa') || summaryEl.querySelector('#btnOrderWa');
  summaryEl.insertBefore(ps, waBtn);

  /* Restaura seleção anterior se existia */
  const saved = window._FL_PAYMENT;
  if (saved) window._selectPayment(saved, summaryEl.querySelector(`[data-pay="${saved}"]`));
}

/**
 * Retorna o método de pagamento selecionado e o valor do troco se houver.
 */
export function getPaymentInfo() {
  const method = window._FL_PAYMENT;
  const troco  = document.getElementById('trocoInput')?.value;
  return { method, troco };
}

/**
 * Reseta a seleção de pagamento.
 */
export function resetPayment() {
  window._FL_PAYMENT = null;
}

/* ── Seleciona forma de pagamento (global para manter compatibilidade com onclick do HTML) ── */
window._selectPayment = function(method, btn) {
  window._FL_PAYMENT = method;
  
  /* Destaca botão ativo */
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  /* Mostra/oculta campo de troco */
  const wrap = document.getElementById('trocoWrap');
  if (wrap) wrap.style.display = method === 'dinheiro' ? 'block' : 'none';

  /* Se for Pix, mostrar área de preparação do Pix (Mock) */
  _handlePixSelection(method === 'pix');
};

function _handlePixSelection(isPix) {
  let pixArea = document.getElementById('pixPrepArea');
  if (!isPix) {
    if (pixArea) pixArea.style.display = 'none';
    return;
  }

  if (!pixArea) {
    pixArea = document.createElement('div');
    pixArea.id = 'pixPrepArea';
    pixArea.className = 'pix-prep-area';
    const summaryEl = dom.cartSummary();
    const ps = summaryEl.querySelector('.payment-selector');
    summaryEl.insertBefore(pixArea, ps.nextSibling);
  }

  pixArea.style.display = 'block';
  pixArea.innerHTML = `
    <div class="pix-prep-info">
      <i class="fas fa-info-circle"></i>
      <span>O QR Code será gerado após você clicar em "Enviar Pedido".</span>
    </div>
  `;
}
