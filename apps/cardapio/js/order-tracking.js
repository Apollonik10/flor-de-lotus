'use strict';

/* ═══════════════════════════════════════════════════
   order-tracking.js — Acompanhamento de pedido
   v3.0 — Fixes:
     · FAB corretamente controlado via DOM
     · Realtime reconecta ao reabrir modal
     · Botão cancelar pedido
     · Tratamento graceful de orderId null
═══════════════════════════════════════════════════ */

import { getSupabase } from './db.js';
import { formatPrice }  from './utils.js';

const STORAGE_KEY = 'fl_active_order';

let _realtimeSub = null;

const STATUS_STEPS = [
  { key: 'pendente',   label: 'Recebido',   icon: 'fa-clock'       },
  { key: 'preparando', label: 'Preparando', icon: 'fa-fire-burner'  },
  { key: 'pronto',     label: 'Pronto!',    icon: 'fa-bell'         },
  { key: 'entregue',   label: 'Entregue',   icon: 'fa-motorcycle'   },
];

/* ════════════════════════════════════════
   API pública
════════════════════════════════════════ */

/** Chamado após envio do pedido */
export function showOrderTracking(orderId, cart, total) {
  _saveActiveOrder({ orderId, cart, total, status: 'pendente' });
  _showFab(true);
  _openModal();
}

/** Verifica ao iniciar o app se há pedido ativo */
export function checkActiveOrder() {
  const order = _loadActiveOrder();
  if (!order) return;

  const age = Date.now() - new Date(order.savedAt).getTime();

  // Pedido entregue há mais de 2h → descarta
  if (order.status === 'entregue' && age > 2 * 60 * 60 * 1000) {
    _clearActiveOrder();
    return;
  }

  // Pedido muito antigo (6h) → descarta
  if (age > 6 * 60 * 60 * 1000) {
    _clearActiveOrder();
    return;
  }

  _showFab(true);
}

/** Abre o modal com dados do pedido ativo */
export function reopenTracking() {
  _openModal();
}

/** Fecha o modal (mantém localStorage e FAB) */
export function closeOrderTracking() {
  _closeModal();
  // NÃO limpa localStorage — cliente pode reabrir
}

/** Cancela o pedido completamente */
export function cancelOrder() {
  _unsubscribeRealtime();
  _clearActiveOrder();
  _showFab(false);
  _closeModal();
}

/* ════════════════════════════════════════
   FAB de acompanhamento
════════════════════════════════════════ */

function _showFab(visible) {
  // Aguarda o DOM estar pronto caso seja chamado muito cedo
  const tryShow = () => {
    const fab = document.getElementById('fabTrack');
    if (!fab) {
      // Tenta novamente após o DOM carregar
      if (visible) setTimeout(tryShow, 300);
      return;
    }
    fab.classList.toggle('visible', visible);
  };
  tryShow();
}

/* ════════════════════════════════════════
   Modal
════════════════════════════════════════ */

function _openModal() {
  const order = _loadActiveOrder();
  if (!order) return;

  // Fecha modal anterior se existir
  _closeModal(false);

  // Cancela subscrição antiga antes de criar nova
  _unsubscribeRealtime();

  const overlay = document.getElementById('modalOverlay');
  const modal   = _buildModal(order);

  document.body.appendChild(modal);
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add('open'));
  });

  // Botão fechar
  modal.querySelector('.btn-tracking-close')
    ?.addEventListener('click', closeOrderTracking);

  // Botão cancelar pedido
  modal.querySelector('.btn-tracking-cancel')
    ?.addEventListener('click', () => {
      if (confirm('Cancelar acompanhamento do pedido?')) {
        cancelOrder();
      }
    });

  // Subscreve realtime se tiver orderId e status não for final
  if (order.orderId && order.status !== 'entregue') {
    _subscribeRealtime(order.orderId, modal);
  }

  // Reflete status atual salvo
  if (order.status && order.status !== 'pendente') {
    _updateSteps(modal, order.status);
  }
}

function _closeModal(restoreScroll = true) {
  const modal = document.getElementById('orderTrackingModal');
  if (!modal) return;

  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 420);

  const cartOpen    = document.getElementById('cartDrawer')?.classList.contains('open');
  const profileOpen = document.getElementById('profileDrawer')?.classList.contains('open');
  if (!cartOpen && !profileOpen) {
    document.getElementById('modalOverlay')?.classList.remove('open');
    if (restoreScroll) document.body.style.overflow = '';
  }

  // NÃO cancela realtime aqui — só cancela no cancelOrder() ou ao reabrir
}

/* ════════════════════════════════════════
   Construção do HTML
════════════════════════════════════════ */

function _buildModal({ orderId, cart, total, status }) {
  const el = document.createElement('article');
  el.id        = 'orderTrackingModal';
  el.className = 'order-tracking-modal';
  el.setAttribute('role',       'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Acompanhar pedido');

  const shortId = orderId
    ? String(orderId).slice(-6).toUpperCase()
    : null;

  const stepsHTML = STATUS_STEPS.map((s, i) => `
    <div class="tracking-step ${status === s.key ? 'active' : ''}" data-status="${s.key}">
      <div class="tracking-step-icon">
        <i class="fas ${s.icon}" aria-hidden="true"></i>
      </div>
      <span class="tracking-step-label">${s.label}</span>
    </div>
    ${i < STATUS_STEPS.length - 1
      ? '<div class="tracking-connector"></div>'
      : ''}
  `).join('');

  const itemLines = cart.map(c => `
    <div class="tracking-item">
      <span class="tracking-item-qty">${c.qty}×</span>
      <span class="tracking-item-name">
        ${c.nome}${c.sabor ? ` <small>(${c.sabor})</small>` : ''}
      </span>
      <span class="tracking-item-price">R$ ${formatPrice(c.preco * c.qty)}</span>
    </div>
  `).join('');

  const statusMessages = {
    pendente:   '⏳ Aguardando o restaurante confirmar...',
    preparando: '🔥 Seu pedido está sendo preparado!',
    pronto:     '🛎️ Pedido pronto! Saindo para entrega.',
    entregue:   '🏍️ Pedido entregue. Bom apetite!',
  };

  // Mostra botão cancelar apenas se pedido não foi entregue
  const showCancel = status !== 'entregue';

  el.innerHTML = `
    <div class="modal-handle" role="presentation"></div>

    <button class="btn-modal-close btn-tracking-close" aria-label="Fechar">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>

    <div class="tracking-body">
      <div class="tracking-header">
        <p class="tracking-eyebrow">
          ${shortId ? `Pedido #${shortId}` : 'Seu pedido'}
        </p>
        <h2 class="tracking-title">Acompanhar <em>pedido</em></h2>
        <p class="tracking-sub" id="trackingSub">
          ${statusMessages[status] || statusMessages.pendente}
        </p>
      </div>

      <div class="tracking-steps" id="trackingSteps"
           role="list" aria-label="Progresso do pedido">
        ${stepsHTML}
      </div>

      <div class="tracking-wa-note">
        <i class="fab fa-whatsapp" aria-hidden="true"></i>
        <span>
          Pedido enviado pelo WhatsApp.
          ${orderId
            ? 'O status atualiza aqui em tempo real.'
            : 'Confirme o status diretamente pelo WhatsApp.'}
        </span>
      </div>

      <div class="tracking-items">
        <p class="tracking-items-title">Resumo do pedido</p>
        ${itemLines}
        <div class="tracking-total">
          <span>Total</span>
          <span>R$ ${formatPrice(total)}</span>
        </div>
      </div>

      ${showCancel ? `
        <button class="btn-tracking-cancel" aria-label="Cancelar acompanhamento">
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
          Limpar acompanhamento
        </button>
      ` : ''}
    </div>
  `;

  return el;
}

/* ════════════════════════════════════════
   Realtime Supabase
════════════════════════════════════════ */

function _subscribeRealtime(orderId, modal) {
  const db = getSupabase();

  // Nome único por orderId para evitar canal duplicado
  const channelName = `tracking-${orderId}-${Date.now()}`;

  _realtimeSub = db
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `id=eq.${orderId}`,
      },
      ({ new: updated }) => {
        const newStatus = updated.status;

        // Salva novo status localmente
        const order = _loadActiveOrder();
        if (order) {
          order.status = newStatus;
          _saveActiveOrder(order);
        }

        // Atualiza UI (modal pode ter sido reaberto, pega o atual)
        const currentModal = document.getElementById('orderTrackingModal');
        if (currentModal) {
          _updateSteps(currentModal, newStatus);
          _updateSubtitle(currentModal, newStatus);

          // Remove botão cancelar se entregue
          if (newStatus === 'entregue') {
            currentModal.querySelector('.btn-tracking-cancel')?.remove();
          }
        }

        // Vibração de feedback
        if (navigator.vibrate) navigator.vibrate(120);

        // Pedido entregue → limpa após 3min
        if (newStatus === 'entregue') {
          setTimeout(() => {
            _clearActiveOrder();
            _showFab(false);
          }, 3 * 60 * 1000);
        }
      }
    )
    .subscribe((status) => {
      console.log('[tracking] realtime status:', status, 'orderId:', orderId);
    });
}

function _unsubscribeRealtime() {
  if (_realtimeSub) {
    try {
      _realtimeSub.unsubscribe();
    } catch (_) {}
    _realtimeSub = null;
  }
}

/* ════════════════════════════════════════
   Atualização visual
════════════════════════════════════════ */

function _updateSteps(modal, currentStatus) {
  const steps     = modal.querySelectorAll('.tracking-step');
  const statusIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  steps.forEach((step, i) => {
    step.classList.remove('active', 'done');
    if (i < statusIdx) step.classList.add('done');
    if (i === statusIdx) step.classList.add('active');
  });
}

function _updateSubtitle(modal, status) {
  const messages = {
    preparando: '🔥 Seu pedido está sendo preparado!',
    pronto:     '🛎️ Pedido pronto! Saindo para entrega.',
    entregue:   '🏍️ Pedido entregue. Bom apetite!',
  };
  const sub = modal.querySelector('#trackingSub');
  if (sub && messages[status]) sub.textContent = messages[status];
}

/* ════════════════════════════════════════
   localStorage helpers
════════════════════════════════════════ */

function _saveActiveOrder(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      savedAt: data.savedAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[tracking] save:', err.message);
  }
}

function _loadActiveOrder() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function _clearActiveOrder() {
  localStorage.removeItem(STORAGE_KEY);
}