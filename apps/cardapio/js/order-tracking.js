'use strict';

/* ═══════════════════════════════════════════════════
   order-tracking.js — Acompanhamento de pedido
   v2.0 — Persistência em localStorage + FAB reabrir
   
   Fluxo:
   1. sendOrderWhatsApp() chama showOrderTracking()
   2. Estado salvo em localStorage (fl_active_order)
   3. FAB verde aparece na tela principal
   4. Cliente pode fechar e reabrir o modal
   5. Pedido some ao ser marcado "entregue"
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

  // Pedido entregue há mais de 2h → descarta
  const age = Date.now() - new Date(order.savedAt).getTime();
  if (order.status === 'entregue' && age > 2 * 60 * 60 * 1000) {
    _clearActiveOrder();
    return;
  }

  // Pedido muito antigo (6h) sem update → descarta
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

/* ════════════════════════════════════════
   FAB de acompanhamento
════════════════════════════════════════ */

function _showFab(visible) {
  const fab = document.getElementById('fabTrack');
  if (!fab) return;
  fab.classList.toggle('visible', visible);
}

/* ════════════════════════════════════════
   Modal
════════════════════════════════════════ */

function _openModal() {
  const order = _loadActiveOrder();
  if (!order) return;

  // Fecha modal anterior se existir
  _closeModal(false);

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

  // Só remove overlay se nenhum outro drawer estiver aberto
  const cartOpen    = document.getElementById('cartDrawer')?.classList.contains('open');
  const profileOpen = document.getElementById('profileDrawer')?.classList.contains('open');
  if (!cartOpen && !profileOpen) {
    document.getElementById('modalOverlay')?.classList.remove('open');
    if (restoreScroll) document.body.style.overflow = '';
  }

  _unsubscribeRealtime();
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
    pendente:   'Aguardando o restaurante confirmar...',
    preparando: '🔥 Seu pedido está sendo preparado!',
    pronto:     '🛎️ Pedido pronto! Saindo para entrega.',
    entregue:   '🏍️ Pedido entregue. Bom apetite!',
  };

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
        <span>Pedido enviado pelo WhatsApp. O status atualiza aqui quando o restaurante alterar.</span>
      </div>

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

/* ════════════════════════════════════════
   Realtime Supabase
════════════════════════════════════════ */

function _subscribeRealtime(orderId, modal) {
  _unsubscribeRealtime();

  const db = getSupabase();

  _realtimeSub = db
    .channel(`tracking-${orderId}`)
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

        // Atualiza UI
        _updateSteps(modal, newStatus);
        _updateSubtitle(modal, newStatus);

        // Vibração
        if (navigator.vibrate) navigator.vibrate(120);

        // Pedido entregue → limpa após 5min
        if (newStatus === 'entregue') {
          setTimeout(() => {
            _clearActiveOrder();
            _showFab(false);
          }, 5 * 60 * 1000);
        }
      }
    )
    .subscribe();
}

function _unsubscribeRealtime() {
  if (_realtimeSub) {
    _realtimeSub.unsubscribe?.();
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
      savedAt: new Date().toISOString(),
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