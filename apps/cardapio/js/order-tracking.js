'use strict';

/* ═══════════════════════════════════════════════════
   order-tracking.js — Tela de acompanhamento pós-pedido
   Mostra status em tempo real via Supabase Realtime.
   Abre como bottom sheet após o pedido ser enviado.
═══════════════════════════════════════════════════ */

import { getSupabase } from './db.js';
import { formatPrice }  from './utils.js';

let _realtimeSub = null;

const STATUS_STEPS = [
  { key: 'pendente',   label: 'Recebido',   icon: 'fa-clock'      },
  { key: 'preparando', label: 'Preparando', icon: 'fa-fire-burner' },
  { key: 'pronto',     label: 'Pronto!',    icon: 'fa-bell'        },
  { key: 'entregue',   label: 'Entregue',   icon: 'fa-motorcycle'  },
];

/* ── Abre a tela de acompanhamento ── */
export function showOrderTracking(orderId, cart, total) {
  _cleanup();

  const overlay = document.getElementById('modalOverlay');
  const modal   = _buildModal(orderId, cart, total);

  document.body.appendChild(modal);
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Animação de entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add('open'));
  });

  // Fecha pelo botão X
  modal.querySelector('.btn-tracking-close')
    ?.addEventListener('click', closeOrderTracking);

  // Realtime: só se tiver orderId (insert pode ter falhado)
  if (orderId) {
    _subscribeToOrder(orderId, modal);
  }
}

export function closeOrderTracking() {
  const modal = document.getElementById('orderTrackingModal');
  if (!modal) return;

  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 420);

  document.getElementById('modalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';

  _cleanup();
}

/* ── Constrói o HTML do modal ── */
function _buildModal(orderId, cart, total) {
  const el = document.createElement('article');
  el.id        = 'orderTrackingModal';
  el.className = 'order-tracking-modal';
  el.setAttribute('role',       'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Acompanhar pedido');

  const shortId = orderId
    ? String(orderId).slice(-6).toUpperCase()
    : null;

  const itemLines = cart.map(c => `
    <div class="tracking-item">
      <span class="tracking-item-qty">${c.qty}×</span>
      <span class="tracking-item-name">
        ${c.nome}${c.sabor ? ` <small>(${c.sabor})</small>` : ''}
      </span>
      <span class="tracking-item-price">R$ ${formatPrice(c.preco * c.qty)}</span>
    </div>
  `).join('');

  const stepsHTML = STATUS_STEPS.map((s, i) => `
    <div class="tracking-step ${i === 0 ? 'active' : ''}" data-status="${s.key}">
      <div class="tracking-step-icon">
        <i class="fas ${s.icon}" aria-hidden="true"></i>
      </div>
      <span class="tracking-step-label">${s.label}</span>
    </div>
    ${i < STATUS_STEPS.length - 1
      ? '<div class="tracking-connector"></div>'
      : ''}
  `).join('');

  el.innerHTML = `
    <div class="modal-handle" role="presentation"></div>

    <button class="btn-modal-close btn-tracking-close" aria-label="Fechar">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>

    <div class="tracking-body">

      <div class="tracking-header">
        ${shortId
          ? `<p class="tracking-eyebrow">Pedido #${shortId}</p>`
          : `<p class="tracking-eyebrow">Pedido enviado</p>`}
        <h2 class="tracking-title">Pedido <em>enviado!</em></h2>
        <p class="tracking-sub">
          ${orderId
            ? 'Acompanhe o status aqui em tempo real ↓'
            : 'Seu pedido foi enviado pelo WhatsApp.'}
        </p>
      </div>

      <!-- Progresso de status -->
      <div class="tracking-steps" id="trackingSteps"
           role="list" aria-label="Progresso do pedido">
        ${stepsHTML}
      </div>

      <!-- Nota WhatsApp -->
      <div class="tracking-wa-note">
        <i class="fab fa-whatsapp" aria-hidden="true"></i>
        <span>
          Mensagem enviada para o restaurante pelo WhatsApp.
          Atualizaremos o status aqui quando o preparo começar.
        </span>
      </div>

      <!-- Resumo do pedido -->
      <div class="tracking-items">
        <p class="tracking-items-title">Resumo do pedido</p>
        ${itemLines}
        <div class="tracking-total">
          <span>Total</span>
          <span>R$ ${formatPrice(total)}</span>
        </div>
      </div>

    </div>
  `;

  return el;
}

/* ── Realtime: escuta mudanças nesse pedido específico ── */
function _subscribeToOrder(orderId, modal) {
  const db = getSupabase();

  _realtimeSub = db
    .channel(`tracking-order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `id=eq.${orderId}`,
      },
      payload => {
        _updateSteps(modal, payload.new.status);
      }
    )
    .subscribe(status => {
      console.log('[tracking] realtime:', status);
    });
}

/* ── Atualiza os steps visuais ── */
function _updateSteps(modal, currentStatus) {
  const steps     = modal.querySelectorAll('.tracking-step');
  const statusIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  steps.forEach((step, i) => {
    step.classList.remove('active', 'done');
    if (i < statusIdx) step.classList.add('done');
    if (i === statusIdx) step.classList.add('active');
  });

  // Feedback tátil
  if (navigator.vibrate) navigator.vibrate(120);

  // Atualiza subtítulo
  const sub = modal.querySelector('.tracking-sub');
  if (sub) {
    const messages = {
      preparando: '🔥 Seu pedido está sendo preparado!',
      pronto:     '🛎️ Pedido pronto! Aguardando entrega.',
      entregue:   '🏍️ Pedido a caminho. Obrigado!',
    };
    sub.textContent = messages[currentStatus] || sub.textContent;
  }
}

function _cleanup() {
  if (_realtimeSub) {
    _realtimeSub.unsubscribe?.();
    _realtimeSub = null;
  }
}