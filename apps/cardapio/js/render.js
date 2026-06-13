'use strict';

/* ═══════════════════════════════════════════════════
   render.js — Renderização do filtro e dos cards
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';
import { formatPrice, findItem, formatTitle } from './utils.js';
import { openModal } from './modal.js';
import { toggleFavorite } from './favorites.js';
import { addToCart, updateCartUI } from './cart.js';

/* ── Barra de filtros ── */
export function renderFilterBar() {
  const bar = dom.filterBar();
  if (!bar) return;

  const pills = [
    { id: 'todos',     nome: 'Todos',     icone: 'fa-spa'   },
    { id: 'favoritos', nome: 'Favoritos', icone: 'fa-heart' },
    ...state.menu.map(c => ({ id: c.id, nome: c.nome, icone: c.icone })),
  ];

  bar.innerHTML = pills.map(p => `
    <button
      class="filter-pill${state.activeFilter === p.id ? ' active' : ''}"
      data-filter="${p.id}"
      aria-pressed="${state.activeFilter === p.id}"
    >
      <i class="fas ${p.icone}" aria-hidden="true"></i>
      ${p.nome}
    </button>
  `).join('');

  bar.querySelectorAll('.filter-pill').forEach(btn =>
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.filter;
      renderFilterBar();
      renderContent();
      dom.mainContent().scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
  );
}

/* ── Conteúdo principal ── */
export function renderContent() {
  const container = dom.mainContent();
  if (!container || !state.menu.length) return;

  const q = state.search.toLowerCase().trim();
  let categorias = state.menu;

  if (state.activeFilter === 'favoritos') {
    categorias = state.menu
      .map(cat => ({
        ...cat,
        itens: cat.itens.filter(it => state.favorites.has(it.id)),
      }))
      .filter(cat => cat.itens.length > 0);
  } else if (state.activeFilter !== 'todos') {
    categorias = state.menu.filter(c => c.id === state.activeFilter);
  }

  if (q) {
    categorias = categorias
      .map(cat => ({
        ...cat,
        itens: cat.itens.filter(it =>
          it.nome.toLowerCase().includes(q) ||
          it.descricao.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.itens.length > 0);
  }

  const emptyState = dom.emptyState();

  if (!categorias.length) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.add('visible');
    return;
  }
  if (emptyState) emptyState.classList.remove('visible');

  container.innerHTML = categorias.map(cat => renderCategory(cat)).join('');

  /* ── FIX: forçar visibilidade após substituição do DOM ──
     O IntersectionObserver do pwa-patch.js observa elementos na
     carga inicial. Quando renderContent() troca o innerHTML, os
     novos elementos nunca são re-observados e ficam com opacity:0.
     Aqui removemos qualquer estado de ocultação e re-disparamos
     o observer global, se existir. ── */
  requestAnimationFrame(() => {
    container.querySelectorAll(
      '.item-card, .category-section, .items-grid'
    ).forEach(el => {
      el.style.opacity    = '1';
      el.style.visibility = 'visible';
      el.style.transform  = 'translateY(0)';
      el.style.animation  = 'none'; // cancela animação pendente
    });

    // Chama re-observer do pwa-patch.js, se disponível
    if (typeof window.reObserveCards === 'function') {
      window.reObserveCards(container);
    }
  });

  // Bind de eventos nos cards
  container.querySelectorAll('.item-card').forEach(card => {
    const id   = card.dataset.id;
    const item = findItem(id);
    if (!item) return;

    card.addEventListener('click', e => {
      if (e.target.closest('.btn-fav') || e.target.closest('.btn-add')) return;
      openModal(item);
    });

    card.querySelector('.btn-fav')?.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(id, card.querySelector('.btn-fav'));
    });

    card.querySelector('.btn-add')?.addEventListener('click', e => {
      e.stopPropagation();
      addToCart(item);
    });
  });

  updateCartUI();
}

/* ── Helpers de renderização ── */
function renderCategory(cat) {
  return `
    <section class="category-section"
             id="cat-${cat.id}"
             aria-labelledby="title-${cat.id}">
      <header class="category-header">
        <div>
          <h2 id="title-${cat.id}" class="category-title">
            ${formatTitle(cat.nome)}
          </h2>
          ${cat.descricao ? `<p class="category-desc">${cat.descricao}</p>` : ''}
        </div>
        <span class="category-count">
          ${cat.itens.length} ite${cat.itens.length > 1 ? 'ns' : 'm'}
        </span>
      </header>
      <ul class="items-grid" role="list">
        ${cat.itens.map(it => renderCard(it)).join('')}
      </ul>
    </section>
  `;
}

function renderCard(item) {
  const isFav = state.favorites.has(item.id);
  const preco = formatPrice(item.preco);

  return `
    <li class="item-card" role="listitem"
        data-id="${item.id}"
        data-destaque="${item.destaque}"
        aria-label="${item.nome} — R$ ${preco}">

      <div class="item-card-img">
        <img src="${item.imagem}" alt="${item.nome}" loading="lazy"
             onerror="this.src='/public/assets/images/placeholder.jpg'">
      </div>

      <div class="item-card-body">
        <h3 class="item-card-name">${item.nome}</h3>
        ${item.porcao
          ? `<span class="item-card-porcao">
               <i class="fas fa-utensils" aria-hidden="true"></i> ${item.porcao}
             </span>`
          : ''}
        <p class="item-card-desc">${item.descricao}</p>
      </div>

      <div class="item-card-footer">
        <span class="item-price" aria-label="Preço: R$ ${preco}">
          <sup>R$</sup>${preco}
        </span>
        <div class="item-card-actions">
          <button class="btn-fav ${isFav ? 'is-fav' : ''}"
                  aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                  aria-pressed="${isFav}">
            <i class="fa${isFav ? 's' : 'r'} fa-heart" aria-hidden="true"></i>
          </button>
          <button class="btn-add"
                  aria-label="Adicionar ${item.nome} ao carrinho">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Pedir
          </button>
        </div>
      </div>
    </li>
  `;
}