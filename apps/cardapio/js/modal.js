'use strict';

/* ═══════════════════════════════════════════════════
   modal.js — Modal de detalhe do item (bottom sheet)
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';
import { formatPrice } from './utils.js';
import { addToCart } from './cart.js';

export function openModal(item) {
  state.modalItem  = item;
  state.modalQty   = 1;
  state.modalSabor = item.sabores?.length ? item.sabores[0] : null;

  const modal   = dom.itemModal();
  const overlay = dom.modalOverlay();
  if (!modal || !overlay) return;

  modal.innerHTML = buildModalHTML(item);
  modal.style.position = 'fixed';

  modal.querySelector('.btn-modal-close')
    ?.addEventListener('click', closeModal);

  modal.querySelector('.btn-modal-add')
    ?.addEventListener('click', () => {
      addToCart(item, state.modalQty, state.modalSabor);
      closeModal();
    });

  modal.querySelectorAll('.sabor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.sabor-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.modalSabor = btn.dataset.sabor;
    });
  });

  modal.querySelector('[data-qty="minus"]')?.addEventListener('click', () => {
    if (state.modalQty > 1) {
      state.modalQty--;
      updateModalQty(modal, item);
    }
  });

  modal.querySelector('[data-qty="plus"]')?.addEventListener('click', () => {
    state.modalQty++;
    updateModalQty(modal, item);
  });

  overlay.classList.add('open');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  dom.itemModal()?.classList.remove('open');
  dom.modalOverlay()?.classList.remove('open');
  document.body.style.overflow = '';
}

function buildModalHTML(item) {
  const preco   = formatPrice(item.preco);
  const cat     = state.menu.find(c => c.itens.some(i => i.id === item.id));
  const catNome = cat?.nome || '';

  const saboresHtml = item.sabores?.length ? `
    <div class="sabor-section">
      <span class="sabor-label">Escolha o sabor</span>
      <div class="sabor-options">
        ${item.sabores.map((s, i) => `
          <button class="sabor-btn ${i === 0 ? 'selected' : ''}"
                  data-sabor="${s}">${s}</button>
        `).join('')}
      </div>
    </div>` : '';

  const porcaoHtml = item.porcao
    ? `<p class="modal-porcao">
         <i class="fas fa-utensils" aria-hidden="true"></i> ${item.porcao}
       </p>`
    : '';

  return `
    <div class="modal-handle" role="presentation"></div>
    <button class="btn-modal-close" aria-label="Fechar">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>

    <div class="modal-img">
      <img src="${item.imagem}" alt="${item.nome}" loading="lazy"
           onerror="this.src='/public/assets/images/placeholder.jpg'">
    </div>

    <div class="modal-body">
      <p class="modal-category-tag">${catNome}</p>
      <h2 class="modal-title">${item.nome}</h2>
      ${porcaoHtml}
      <p class="modal-desc">${item.descricao}</p>
      ${saboresHtml}

      <div class="qty-row">
        <span class="qty-label">Quantidade</span>
        <div class="qty-control">
          <button class="qty-btn" data-qty="minus" aria-label="Diminuir">−</button>
          <span class="qty-value" id="modalQtyVal">1</span>
          <button class="qty-btn" data-qty="plus"  aria-label="Aumentar">+</button>
        </div>
      </div>

      <div class="modal-price-row">
        <span class="modal-total-price" id="modalTotalPrice">
          <sup>R$</sup>${preco}
        </span>
        <button class="btn-modal-add">
          <i class="fas fa-bag-shopping" aria-hidden="true"></i>
          Adicionar ao pedido
        </button>
      </div>
    </div>
  `;
}

function updateModalQty(modal, item) {
  modal.querySelector('#modalQtyVal').textContent = state.modalQty;
  modal.querySelector('#modalTotalPrice').innerHTML =
    `<sup>R$</sup>${formatPrice(item.preco * state.modalQty)}`;
}
