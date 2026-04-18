'use strict';

/* ═══════════════════════════════════════════════════
   profile.js — Drawer de perfil (abre pela esquerda)
   · Exibe e edita dados do usuário (localStorage)
   · Mostra progresso do cartão fidelidade
   · Exibe gift cards disponíveis
═══════════════════════════════════════════════════ */

import { getLoyaltyStatus, getGiftCards } from './loyalty.js';

const STORAGE_KEY = 'fl_user';

function getUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

function saveUser(data) {
  const saved = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  window.FL_USER = saved;
}

/* ── Abrir / fechar ── */
export function openProfileDrawer() {
  renderProfileDrawer();
  document.getElementById('profileDrawer')?.classList.add('open');
  document.getElementById('modalOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeProfileDrawer() {
  document.getElementById('profileDrawer')?.classList.remove('open');
  /* Fecha overlay só se o carrinho também estiver fechado */
  const cartOpen = document.getElementById('cartDrawer')?.classList.contains('open');
  if (!cartOpen) {
    document.getElementById('modalOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ── Renderiza o conteúdo do drawer ── */
export function renderProfileDrawer() {
  const drawer = document.getElementById('profileDrawer');
  if (!drawer) return;

  const user   = getUser();
  const loyalty = getLoyaltyStatus();
  const availableGifts = loyalty.gifts.filter(g => !g.usado);

  drawer.innerHTML = `
    <header class="cart-header">
      <h2 class="cart-title">Meu <em>Perfil</em></h2>
      <button class="btn-icon" id="btnCloseProfile" aria-label="Fechar perfil">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    </header>

    <div class="profile-body" id="profileBody">

      ${user ? _renderUserInfo(user) : _renderNoUser()}

      ${_renderLoyalty(loyalty, availableGifts)}

    </div>
  `;

  /* Bind do botão fechar dentro do drawer */
  document.getElementById('btnCloseProfile')
    ?.addEventListener('click', closeProfileDrawer);
}

/* ─────────────────────────────
   Templates internos
───────────────────────────── */
function _renderUserInfo(user) {
  const al = user.allergies?.length ? user.allergies.join(', ') : '—';
  return `
    <section class="profile-section">
      <p class="profile-section-title">
        <i class="fas fa-user-circle" aria-hidden="true"></i> Seus Dados
      </p>

      ${_field('name',    'Nome',              user.name    || '—', user.name    || '')}
      ${_field('phone',   'WhatsApp',          user.phone   || '—', user.phone   || '')}
      ${_field('address', 'Endereço',          user.address || '—', user.address || '')}
      ${_field('notes',   'Observações',       user.notes   || '—', user.notes   || '')}

      <div class="profile-field" id="field-allergies">
        <span class="profile-label">Alergias</span>
        <div class="profile-value-row">
          <span class="profile-value allergy-val">${al}</span>
          <button class="btn-edit" data-action="edit-allergies" aria-label="Editar alergias">
            <i class="fas fa-pen" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </section>
  `;
}

function _field(key, label, display, raw) {
  const safeRaw = raw.replace(/'/g, '&#39;');
  return `
    <div class="profile-field" id="field-${key}">
      <span class="profile-label">${label}</span>
      <div class="profile-value-row">
        <span class="profile-value">${display}</span>
        <button class="btn-edit" data-action="edit-field" data-field="${key}" data-value="${safeRaw}"
          aria-label="Editar ${label}">
          <i class="fas fa-pen" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
}

function _renderNoUser() {
  return `
    <section class="profile-section profile-no-user">
      <i class="fas fa-user-circle" aria-hidden="true"></i>
      <p>Nenhum dado cadastrado ainda.</p>
      <a href="/pwa/register.html" class="btn-go-register">
        <i class="fas fa-arrow-right" aria-hidden="true"></i> Cadastrar agora
      </a>
    </section>
  `;
}

function _renderLoyalty({ progress, needed, pct, available, totalPedidos }, availableGifts) {
  return `
    <section class="profile-section loyalty-section">
      <p class="profile-section-title">
        <i class="fas fa-award" aria-hidden="true"></i> Cartão Fidelidade
      </p>

      <div class="loyalty-wrap">
        <div class="loyalty-counts">
          <span class="loyalty-num">${progress}</span>
          <span class="loyalty-sep">/</span>
          <span class="loyalty-total">${needed}</span>
          <span class="loyalty-label-text">pedidos</span>
        </div>
        <div class="loyalty-bar-track" role="progressbar"
             aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="${needed}"
             aria-label="Progresso do cartão fidelidade">
          <div class="loyalty-bar-fill" style="width:${pct}%"></div>
        </div>
        <p class="loyalty-desc">
          A cada <strong>${needed} pedidos ≥ R$50</strong> você ganha um
          <strong>gift card de R$50</strong> para usar no próximo pedido!
          ${totalPedidos > 0 ? `<br><small>${totalPedidos} pedido${totalPedidos > 1 ? 's' : ''} no total</small>` : ''}
        </p>
      </div>

      ${available > 0 ? `
        <div class="gift-list">
          <p class="profile-section-title" style="margin-top:1.2rem">
            <i class="fas fa-gift" aria-hidden="true"></i> Gift Cards Disponíveis
          </p>
          ${availableGifts.map(g => `
            <div class="gift-card-item">
              <div class="gift-card-info">
                <p class="gift-card-code">${g.code}</p>
                <p class="gift-card-valor">Vale R$ ${g.valor},00</p>
              </div>
              <button class="btn-copy-gift" data-code="${g.code}" aria-label="Copiar código ${g.code}">
                <i class="fas fa-copy" aria-hidden="true"></i> Copiar
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </section>
  `;
}

/* ─────────────────────────────
   Event delegation no profileBody
   (evita onclick inline)
───────────────────────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === 'edit-field') {
    _startEditField(btn.dataset.field, btn.dataset.value);
  }
  if (action === 'save-field') {
    _saveField(btn.dataset.field);
  }
  if (action === 'cancel-edit') {
    renderProfileDrawer();
  }
  if (action === 'edit-allergies') {
    _startEditAllergies();
  }
  if (action === 'save-allergies') {
    _saveAllergies();
  }
  if (action === 'copy-gift') {
    _copyCode(btn.dataset.code);
  }
});

/* Botões copy-gift (fora de data-action para manter a lógica de delegação simples) */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-copy-gift');
  if (!btn) return;
  _copyCode(btn.dataset.code);
});

/* ─────────────────────────────
   Edição inline
───────────────────────────── */
const LABELS = { name: 'Nome', phone: 'WhatsApp', address: 'Endereço', notes: 'Observações' };

function _startEditField(field, currentVal) {
  const fieldEl = document.getElementById(`field-${field}`);
  if (!fieldEl) return;
  fieldEl.querySelector('.profile-value-row').innerHTML = `
    <input type="text" class="profile-edit-input"
      id="edit-input-${field}"
      value="${currentVal.replace(/"/g, '&quot;')}"
      placeholder="${LABELS[field] || field}"
      autocomplete="off"
    >
    <div class="edit-actions">
      <button class="btn-save-edit" data-action="save-field" data-field="${field}"
        aria-label="Salvar">
        <i class="fas fa-check" aria-hidden="true"></i>
      </button>
      <button class="btn-cancel-edit" data-action="cancel-edit"
        aria-label="Cancelar">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    </div>
  `;
  document.getElementById(`edit-input-${field}`)?.focus();
}

function _saveField(field) {
  const input = document.getElementById(`edit-input-${field}`);
  if (!input) return;
  const user = getUser() || {};
  user[field] = input.value.trim();
  saveUser(user);
  renderProfileDrawer();
}

const ALLERGY_OPTIONS = [
  { val: 'Frutos do Mar', icon: 'fa-shrimp' },
  { val: 'Glúten',        icon: 'fa-wheat-awn' },
  { val: 'Lactose',       icon: 'fa-droplet' },
  { val: 'Amendoim',      icon: 'fa-circle-dot' },
  { val: 'Soja',          icon: 'fa-leaf' },
  { val: 'Gergelim',      icon: 'fa-seedling' },
];

function _startEditAllergies() {
  const fieldEl = document.getElementById('field-allergies');
  if (!fieldEl) return;
  const user    = getUser() || {};
  const current = user.allergies || [];

  fieldEl.querySelector('.profile-value-row').innerHTML = `
    <div class="allergy-edit-grid">
      ${ALLERGY_OPTIONS.map(o => `
        <label class="allergy-edit-item ${current.includes(o.val) ? 'checked' : ''}">
          <input type="checkbox" name="edit-allergy" value="${o.val}"
            ${current.includes(o.val) ? 'checked' : ''}>
          <i class="fas ${o.icon}" aria-hidden="true"></i> ${o.val}
        </label>
      `).join('')}
    </div>
    <div class="edit-actions">
      <button class="btn-save-edit" data-action="save-allergies">
        <i class="fas fa-check" aria-hidden="true"></i> Salvar
      </button>
      <button class="btn-cancel-edit" data-action="cancel-edit">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

function _saveAllergies() {
  const checked = [...document.querySelectorAll('input[name="edit-allergy"]:checked')]
    .map(el => el.value);
  const user = getUser() || {};
  user.allergies = checked;
  saveUser(user);
  renderProfileDrawer();
}

function _copyCode(code) {
  navigator.clipboard?.writeText(code).then(() => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = `Código ${code} copiado! 🎁`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  });
}