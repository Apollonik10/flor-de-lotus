'use strict';

/* ═══════════════════════════════════════════════════
   FLOR DE LÓTUS — app.js v2
   Módulos: Menu · Filtros · Busca · Favoritos
            Carrinho · Modal de detalhe · WhatsApp
═══════════════════════════════════════════════════ */

/* ── Estado global ── */
const state = {
  menu:       [],           // dados do menu.json
  cart:       [],           // { id, nome, preco, imagem, sabor, qty }
  favorites:  new Set(),    // ids favoritados
  search:     '',
  activeFilter: 'todos',    // 'todos' | id da categoria
  modalItem:  null,         // item aberto no modal
  modalQty:   1,
  modalSabor: null,
};

/* ── Referências DOM ── */
const dom = {
  filterBar:      () => document.getElementById('filterBar'),
  mainContent:    () => document.getElementById('mainContent'),
  searchInput:    () => document.getElementById('searchInput'),
  cartCount:      () => document.getElementById('cartCount'),
  favCount:       () => document.getElementById('favCount'),
  fabCart:        () => document.getElementById('fabCart'),
  fabCartCount:   () => document.getElementById('fabCartCount'),
  modalOverlay:   () => document.getElementById('modalOverlay'),
  itemModal:      () => document.getElementById('itemModal'),
  cartDrawer:     () => document.getElementById('cartDrawer'),
  cartItems:      () => document.getElementById('cartItems'),
  cartEmpty:      () => document.getElementById('cartEmpty'),
  cartSummary:    () => document.getElementById('cartSummary'),
  cartTotalValue: () => document.getElementById('cartTotalValue'),
  toast:          () => document.getElementById('toast'),
  emptyState:     () => document.getElementById('emptyState'),
};

/* ══════════════════════════════════════════
   INICIALIZAÇÃO
══════════════════════════════════════════ */
async function init() {
  loadPersistedData();
  await fetchMenu();
  renderFilterBar();
  renderContent();
  bindGlobalEvents();
  registerSW();
}

/* ── Carrega favoritos e carrinho do localStorage ── */
function loadPersistedData() {
  try {
    const favs = JSON.parse(localStorage.getItem('fl_favorites') || '[]');
    favs.forEach(id => state.favorites.add(id));

    const cart = JSON.parse(localStorage.getItem('fl_cart') || '[]');
    state.cart = cart;
  } catch (_) { /* silencia erros de parse */ }
}

function persistData() {
  localStorage.setItem('fl_favorites', JSON.stringify([...state.favorites]));
  localStorage.setItem('fl_cart', JSON.stringify(state.cart));
}

/* ── Fetch menu.json ── */
async function fetchMenu() {
  try {
    const res = await fetch('./menu.json');
    if (!res.ok) throw new Error('Falha ao carregar cardápio');
    const data = await res.json();
    state.menu = data.categorias || [];
  } catch (err) {
    dom.mainContent().innerHTML = `
      <div style="padding:3rem 1rem;text-align:center;color:rgba(245,245,245,.5)">
        <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:.8rem;display:block"></i>
        <p>Não foi possível carregar o cardápio.<br>Verifique sua conexão.</p>
      </div>`;
    console.error(err);
  }
}

/* ══════════════════════════════════════════
   RENDER — FILTRO
══════════════════════════════════════════ */
function renderFilterBar() {
  const bar = dom.filterBar();
  if (!bar) return;

  const pills = [
    { id:'todos', nome:'Todos', icone:'fa-spa' },
    { id:'favoritos', nome:'Favoritos', icone:'fa-heart' },
    ...state.menu.map(c => ({ id:c.id, nome:c.nome, icone:c.icone }))
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
      // Scroll suave ao topo do conteúdo
      dom.mainContent().scrollIntoView({ behavior:'smooth', block:'start' });
    })
  );
}

/* ══════════════════════════════════════════
   RENDER — CONTEÚDO PRINCIPAL
══════════════════════════════════════════ */
function renderContent() {
  const container = dom.mainContent();
  if (!container || !state.menu.length) return;

  const q = state.search.toLowerCase().trim();

  // Filtra categorias pelo estado ativo
  let categorias = state.menu;

  if (state.activeFilter === 'favoritos') {
    // Mostra só itens favoritados, agrupados por categoria
    categorias = state.menu
      .map(cat => ({
        ...cat,
        itens: cat.itens.filter(it => state.favorites.has(it.id))
      }))
      .filter(cat => cat.itens.length > 0);
  } else if (state.activeFilter !== 'todos') {
    categorias = state.menu.filter(c => c.id === state.activeFilter);
  }

  // Aplica busca por texto
  if (q) {
    categorias = categorias
      .map(cat => ({
        ...cat,
        itens: cat.itens.filter(it =>
          it.nome.toLowerCase().includes(q) ||
          it.descricao.toLowerCase().includes(q)
        )
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

  // Bind nos cards
  container.querySelectorAll('.item-card').forEach(card => {
    const id = card.dataset.id;
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

function renderCategory(cat) {
  return `
    <section class="category-section" id="cat-${cat.id}" aria-labelledby="title-${cat.id}">
      <header class="category-header">
        <div>
          <h2 id="title-${cat.id}" class="category-title">
            ${formatTitle(cat.nome)}
          </h2>
          ${cat.descricao ? `<p class="category-desc">${cat.descricao}</p>` : ''}
        </div>
        <span class="category-count">${cat.itens.length} ite${cat.itens.length > 1 ? 'ns' : 'm'}</span>
      </header>
      <ul class="items-grid" role="list">
        ${cat.itens.map(it => renderCard(it, cat.nome)).join('')}
      </ul>
    </section>
  `;
}

function formatTitle(nome) {
  // Itálico na última palavra
  const words = nome.trim().split(' ');
  if (words.length === 1) return `<em>${nome}</em>`;
  const last = words.pop();
  return `${words.join(' ')} <em>${last}</em>`;
}

function renderCard(item, catNome) {
  const isFav = state.favorites.has(item.id);
  const preco = formatPrice(item.preco);

  return `
    <li class="item-card" role="listitem"
        data-id="${item.id}"
        data-destaque="${item.destaque}"
        aria-label="${item.nome} — R$ ${preco}">

      <div class="item-card-img">
        <img src="${item.imagem}" alt="${item.nome}" loading="lazy"
             onerror="this.src='images/placeholder.jpg'">
      </div>

      <div class="item-card-body">
        <h3 class="item-card-name">${item.nome}</h3>
        ${item.porcao ? `<span class="item-card-porcao"><i class="fas fa-utensils" aria-hidden="true"></i> ${item.porcao}</span>` : ''}
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
          <button class="btn-add" aria-label="Adicionar ${item.nome} ao carrinho">
            <i class="fas fa-plus" aria-hidden="true"></i>
            Pedir
          </button>
        </div>
      </div>
    </li>
  `;
}

/* ══════════════════════════════════════════
   MODAL DE DETALHE
══════════════════════════════════════════ */
function openModal(item) {
  state.modalItem  = item;
  state.modalQty   = 1;
  state.modalSabor = item.sabores?.length ? item.sabores[0] : null;

  const modal   = dom.itemModal();
  const overlay = dom.modalOverlay();
  if (!modal || !overlay) return;

  modal.innerHTML = buildModalHTML(item);
  modal.style.position = 'fixed';

  // Bind interno do modal
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

function buildModalHTML(item) {
  const preco = formatPrice(item.preco);
  const cat   = state.menu.find(c => c.itens.some(i => i.id === item.id));
  const catNome = cat?.nome || '';

  const saboresHtml = item.sabores?.length ? `
    <div class="sabor-section">
      <span class="sabor-label">Escolha o sabor</span>
      <div class="sabor-options">
        ${item.sabores.map((s, i) => `
          <button class="sabor-btn ${i===0 ? 'selected' : ''}" data-sabor="${s}">${s}</button>
        `).join('')}
      </div>
    </div>
  ` : '';

  const porcaoHtml = item.porcao ? `<p class="modal-porcao"><i class="fas fa-utensils" aria-hidden="true"></i> ${item.porcao}</p>` : '';

  return `
    <div class="modal-handle" role="presentation"></div>
    <button class="btn-modal-close" aria-label="Fechar">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>

    <div class="modal-img">
      <img src="${item.imagem}" alt="${item.nome}" loading="lazy"
           onerror="this.src='images/placeholder.jpg'">
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
        <span class="modal-total-price" id="modalTotalPrice"><sup>R$</sup>${preco}</span>
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

function closeModal() {
  dom.itemModal()?.classList.remove('open');
  dom.modalOverlay()?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   FAVORITOS
══════════════════════════════════════════ */
function toggleFavorite(id, btnEl) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    btnEl?.classList.remove('is-fav');
    btnEl?.setAttribute('aria-pressed', 'false');
    if (btnEl) btnEl.querySelector('i').className = 'far fa-heart';
    showToast('Removido dos favoritos');
  } else {
    state.favorites.add(id);
    btnEl?.classList.add('is-fav');
    btnEl?.setAttribute('aria-pressed', 'true');
    if (btnEl) btnEl.querySelector('i').className = 'fas fa-heart';
    showToast('Adicionado aos favoritos ♥');
  }
  persistData();
  updateFavBadge();

  // Re-renderiza se estiver no filtro favoritos
  if (state.activeFilter === 'favoritos') renderContent();
}

function updateFavBadge() {
  const badge = dom.favCount();
  if (!badge) return;
  const count = state.favorites.size;
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
  document.getElementById('btnFav')?.classList.toggle('active', count > 0);
}

/* ══════════════════════════════════════════
   CARRINHO
══════════════════════════════════════════ */
function addToCart(item, qty = 1, sabor = null) {
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
      qty
    });
  }

  persistData();
  updateCartUI();
  showToast(`${item.nome} adicionado 🍣`);
}

function removeFromCart(key) {
  state.cart = state.cart.filter(c => c.key !== key);
  persistData();
  updateCartUI();
  renderCartDrawer();
}

function changeCartQty(key, delta) {
  const item = state.cart.find(c => c.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(key);
  else { persistData(); updateCartUI(); renderCartDrawer(); }
}

function updateCartUI() {
  const total = state.cart.reduce((s, c) => s + c.qty, 0);

  // Badge no ícone de carrinho
  const badge = dom.cartCount();
  if (badge) { badge.textContent = total; badge.classList.toggle('visible', total > 0); }

  // FAB flutuante
  const fab = dom.fabCart();
  if (fab) {
    fab.classList.toggle('visible', total > 0);
    const cnt = dom.fabCartCount();
    if (cnt) cnt.textContent = `${total} ${total === 1 ? 'item' : 'itens'}`;
  }
}

function openCartDrawer() {
  renderCartDrawer();
  dom.cartDrawer()?.classList.add('open');
  dom.modalOverlay()?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  dom.cartDrawer()?.classList.remove('open');
  dom.modalOverlay()?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
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
  dom.cartTotalValue().textContent = `R$ ${formatPrice(total)}`;

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
        <button class="qty-btn" onclick="changeCartQty('${c.key}', 1)"  aria-label="Aumentar">+</button>
        <span class="qty-value">${c.qty}</span>
        <button class="qty-btn" onclick="changeCartQty('${c.key}', -1)" aria-label="Diminuir">−</button>
      </div>
    </div>
  `).join('');
}

/* ── Enviar pedido pelo WhatsApp ── */
function sendOrderWhatsApp() {
  if (!state.cart.length) return;

  const total = state.cart.reduce((s, c) => s + c.preco * c.qty, 0);

  const lines = state.cart.map(c => {
    const sabor = c.sabor ? ` (${c.sabor})` : '';
    return `• ${c.qty}x ${c.nome}${sabor} — R$ ${formatPrice(c.preco * c.qty)}`;
  });

  const msg = [
    '🌸 *Flor de Lótus — Novo Pedido*',
    '',
    ...lines,
    '',
    `*Total: R$ ${formatPrice(total)}*`,
    '',
    '📍 Informe seu endereço de entrega, por favor!'
  ].join('\n');

  const url = `https://wa.me/5583999700469?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ══════════════════════════════════════════
   BUSCA
══════════════════════════════════════════ */
function bindSearch() {
  const input = dom.searchInput();
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = input.value;
      // Ao buscar, vai para "todos"
      if (state.search && state.activeFilter !== 'todos') {
        state.activeFilter = 'todos';
        renderFilterBar();
      }
      renderContent();
    }, 280);
  });
}

/* ══════════════════════════════════════════
   EVENTOS GLOBAIS
══════════════════════════════════════════ */
function bindGlobalEvents() {
  bindSearch();

  // Overlay fecha modal ou drawer
  dom.modalOverlay()?.addEventListener('click', () => {
    if (dom.cartDrawer()?.classList.contains('open')) closeCartDrawer();
    else closeModal();
  });

  // Fechar com Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeCartDrawer();
    }
  });

  // Botão carrinho no topo
  document.getElementById('btnCart')
    ?.addEventListener('click', () => {
      if (dom.cartDrawer()?.classList.contains('open')) closeCartDrawer();
      else openCartDrawer();
    });

  // Botão favoritos no topo → filtra por favoritos
  document.getElementById('btnFav')
    ?.addEventListener('click', () => {
      state.activeFilter = state.activeFilter === 'favoritos' ? 'todos' : 'favoritos';
      renderFilterBar();
      renderContent();
      document.getElementById('btnFav')?.classList.toggle('active', state.activeFilter === 'favoritos');
    });

  // FAB carrinho
  dom.fabCart()?.addEventListener('click', openCartDrawer);

  // Botão WhatsApp no drawer
  document.getElementById('btnOrderWa')
    ?.addEventListener('click', sendOrderWhatsApp);
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
  const t = dom.toast();
  if (!t) return;
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function formatPrice(value) {
  return value.toFixed(2).replace('.', ',');
}

function findItem(id) {
  for (const cat of state.menu) {
    const item = cat.itens.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

/* ── Expõe funções que o HTML chama via onclick ── */
window.changeCartQty = changeCartQty;

/* ══════════════════════════════════════════
   SERVICE WORKER
══════════════════════════════════════════ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch(err => console.warn('SW não registrado:', err));
  }
}
 
/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', init);