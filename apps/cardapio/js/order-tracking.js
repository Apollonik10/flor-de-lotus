'use strict';

/* ═══════════════════════════════════════════════════
   order-tracking.js — Acompanhamento de pedido
   v4.0 — Fixes:
     · Realtime reassinado no boot (checkActiveOrder)
     · Reconexão automática em CLOSED / CHANNEL_ERROR
     · Background subscription (sem modal aberto)
     · Fallback polling a cada 30s
     · orderId null: UI adaptada, polling permanece
═══════════════════════════════════════════════════ */

import { getSupabase } from './db.js';
import { formatPrice }  from './utils.js';

const STORAGE_KEY   = 'fl_active_order';
const POLL_INTERVAL = 5_000;    // 5s fallback (garante atualização rápida)
const MAX_ORDER_AGE = 8 * 3600_000;   // 8h
const DELIVERED_TTL = 2 * 3600_000;   // 2h após entregue

let _realtimeSub  = null;
let _pollTimer    = null;
let _retryTimer   = null;

const STATUS_STEPS = [
  { key: 'pendente',   label: 'Recebido',   icon: 'fa-clock'       },
  { key: 'pago',       label: 'Pago',       icon: 'fa-circle-check' },
  { key: 'preparando', label: 'Preparando', icon: 'fa-fire-burner'  },
  { key: 'pronto',     label: 'Pronto!',    icon: 'fa-bell'         },
  { key: 'entregue',   label: 'Entregue',   icon: 'fa-motorcycle'   },
];

/* ════════════════════════════════════════
   API pública
════════════════════════════════════════ */

/** Chamado imediatamente após envio do pedido */
export function showOrderTracking(orderId, cart, total, paymentData = null) {
  _saveActiveOrder({ 
    orderId, 
    cart, 
    total, 
    status: 'pendente', 
    paymentStatus: paymentData ? 'pendente' : null,
    paymentData 
  });
  _showFab(true);
  _startBackground(orderId);   // inicia realtime/polling sem precisar abrir modal
  _openModal();
}

/**
 * Verifica pedido ativo ao iniciar o app.
 * Se encontrar um orderId válido, reassina o realtime imediatamente.
 */
export function checkActiveOrder() {
  const order = _loadActiveOrder();
  if (!order) return;

  const age = Date.now() - new Date(order.savedAt).getTime();

  if (order.status === 'entregue' && age > DELIVERED_TTL) {
    _clearActiveOrder();
    return;
  }
  if (age > MAX_ORDER_AGE) {
    _clearActiveOrder();
    return;
  }

  _showFab(true);

  // ✅ FIX PRINCIPAL: reassina realtime no boot, não espera o usuário clicar
  if (order.status !== 'entregue') {
    _startBackground(order.orderId);
  }
}

/** Abre o modal com dados do pedido ativo */
export function reopenTracking() {
  _openModal();
}

/** Fecha o modal (mantém localStorage, FAB e realtime ativos) */
export function closeOrderTracking() {
  _closeModal();
  // realtime permanece ativo em background — NÃO cancela aqui
}

/** Cancela o pedido completamente */
export function cancelOrder() {
  _stopBackground();
  _clearActiveOrder();
  _showFab(false);
  _closeModal();
}

/* ════════════════════════════════════════
   Background: realtime + polling fallback
════════════════════════════════════════ */

/**
 * Inicia realtime se orderId existe, ou polling fallback se não existe.
 * Pode ser chamado múltiplas vezes — cancela a sessão anterior primeiro.
 */
function _startBackground(orderId) {
  _stopBackground();   // garante limpeza

  if (orderId) {
    _subscribeRealtime(orderId);
  }

  // Polling como seguro: atualiza estado mesmo sem realtime (ex: RLS bloqueado)
  _pollTimer = setInterval(() => _pollOrderStatus(orderId), POLL_INTERVAL);
}

function _stopBackground() {
  _unsubscribeRealtime();
  clearInterval(_pollTimer);
  clearTimeout(_retryTimer);
  _pollTimer  = null;
  _retryTimer = null;
}

/** Polling manual: busca status atual do Supabase */
async function _pollOrderStatus(orderId) {
  if (!orderId) return;

  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (error || !data) return;

    const current = _loadActiveOrder();
    if (!current || current.status === data.status) return;

    // Status mudou → aplica sem precisar de realtime
    _onStatusChange(orderId, data.status);
  } catch (_) { /* offline — silencia */ }
}

/* ════════════════════════════════════════
   FAB
════════════════════════════════════════ */

function _showFab(visible) {
  const tryShow = () => {
    const fab = document.getElementById('fabTrack');
    if (!fab) {
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

  _closeModal(false);

  const overlay = document.getElementById('modalOverlay');
  const modal   = _buildModal(order);

  document.body.appendChild(modal);
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add('open'));
  });

  modal.querySelector('.btn-tracking-close')
    ?.addEventListener('click', closeOrderTracking);

  modal.querySelector('.btn-tracking-cancel')
    ?.addEventListener('click', () => {
      if (confirm('Limpar acompanhamento deste pedido?')) cancelOrder();
    });

  // Reflete status já salvo localmente
  if (order.status && order.status !== 'pendente') {
    _updateSteps(modal, order.status);
    _updateSubtitle(modal, order.status);
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
}

/* ════════════════════════════════════════
   HTML do modal
════════════════════════════════════════ */

function _buildModal({ orderId, cart, total, status, paymentStatus, paymentData }) {
  const el = document.createElement('article');
  el.id        = 'orderTrackingModal';
  el.className = 'order-tracking-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Acompanhar pedido');

  const shortId = orderId ? String(orderId).slice(-6).toUpperCase() : null;

  const stepsHTML = STATUS_STEPS.map((s, i) => `
    <div class="tracking-step ${status === s.key ? 'active' : ''}" data-status="${s.key}">
      <div class="tracking-step-icon">
        <i class="fas ${s.icon}" aria-hidden="true"></i>
      </div>
      <span class="tracking-step-label">${s.label}</span>
    </div>
    ${i < STATUS_STEPS.length - 1 ? '<div class="tracking-connector"></div>' : ''}
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

  // ── Seção Pix (se aplicável) ──
  let pixHTML = '';
  if (paymentStatus === 'pendente' && paymentData) {
    pixHTML = `
      <div class="pix-payment-section">
        <p style="color:var(--yellow); font-size:0.85rem; margin-bottom:1rem">
          <i class="fas fa-qrcode"></i> Finalize o pagamento via PIX
        </p>
        <div class="pix-qr-container">
          ${paymentData.qr_code_base64 
            ? `<img src="${paymentData.qr_code_base64}" alt="QR Code PIX" style="width:200px; height:200px">`
            : `<div class="pix-qr-mock"><span>QR CODE TESTE</span></div>`
          }
        </div>
        <div class="pix-copy-paste-container">
          <div class="pix-code-text" id="pixCodeText">${paymentData.pix_copy_paste}</div>
          <button class="btn-copy-pix" onclick="window._copyPixCode('${paymentData.pix_copy_paste}')">
            Copiar
          </button>
        </div>
        <p style="font-size:0.7rem; color:var(--text-muted); margin-top:1rem">
          A confirmação é automática e o pedido entrará em produção logo após o pagamento.
        </p>
      </div>
    `;
  } else if (paymentStatus === 'pago') {
    pixHTML = `
      <div class="pix-payment-section" style="border-color:var(--green); background:rgba(76,175,80,0.05)">
        <p style="color:var(--green); font-weight:bold">
          <i class="fas fa-check-circle"></i> Pagamento Confirmado!
        </p>
      </div>
    `;
  }

  const statusMessages = {
    pendente:   '⏳ Aguardando o restaurante confirmar...',
    pago:       '✅ Pagamento PIX confirmado com sucesso!',
    preparando: '🔥 Seu pedido está sendo preparado!',
    pronto:     '🛎️ Pedido pronto! Saindo para entrega.',
    entregue:   '🏍️ Pedido entregue. Bom apetite!',
  };

  const showCancel = status !== 'entregue';
  const hasRealtime = !!orderId;

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

      ${pixHTML}

      <div class="tracking-wa-note">
        <i class="fab fa-whatsapp" aria-hidden="true"></i>
        <span>
          Pedido enviado pelo WhatsApp.
          ${hasRealtime
            ? 'Status atualiza aqui automaticamente.'
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
        <button class="btn-tracking-cancel" aria-label="Limpar acompanhamento">
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
          Limpar acompanhamento
        </button>
      ` : ''}
    </div>
  `;

  return el;
}

/* ════════════════════════════════════════
   Realtime Supabase — com reconexão
════════════════════════════════════════ */

function _subscribeRealtime(orderId) {
  const db          = getSupabase();
  const channelName = `tracking-${orderId}`;

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
        _onStatusChange(orderId, updated.status);
      }
    )
    .subscribe((status, err) => {
      console.log('[tracking] realtime:', status, orderId);

      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        // Reconecta após 5s — não inunda o servidor
        _retryTimer = setTimeout(() => {
          console.log('[tracking] reconectando...');
          _subscribeRealtime(orderId);
        }, 5_000);
      }
    });
}

function _unsubscribeRealtime() {
  if (_realtimeSub) {
    try { _realtimeSub.unsubscribe(); } catch (_) {}
    _realtimeSub = null;
  }
  clearTimeout(_retryTimer);
  _retryTimer = null;
}

/* ════════════════════════════════════════
   Mudança de status (realtime OU polling)
════════════════════════════════════════ */

function _onStatusChange(orderId, newStatus) {
  // Persiste novo status
  const order = _loadActiveOrder();
  if (order) {
    order.status = newStatus;
    _saveActiveOrder(order);
  }

  // Atualiza modal se estiver aberto
  const modal = document.getElementById('orderTrackingModal');
  if (modal) {
    _updateSteps(modal, newStatus);
    _updateSubtitle(modal, newStatus);

    if (newStatus === 'entregue') {
      modal.querySelector('.btn-tracking-cancel')?.remove();
    }
  }

  // Vibração de feedback ao mudar status
  if (navigator.vibrate) navigator.vibrate(120);

  // Entregue → limpa após 2min e para background
  if (newStatus === 'entregue') {
    setTimeout(() => {
      _stopBackground();
      _clearActiveOrder();
      _showFab(false);
    }, DELIVERED_TTL);
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
    pago:       '✅ Pagamento PIX confirmado com sucesso!',
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
  } catch { return null; }
}

function _clearActiveOrder() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Global Helpers ──
window._copyPixCode = function(text) {
  if (!navigator.clipboard) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  } else {
    navigator.clipboard.writeText(text);
  }
  
  import('./toast.js').then(m => m.showToast('Código Pix copiado! 📋'));
};