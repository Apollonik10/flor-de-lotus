/* =========================
   ESTADO GLOBAL
========================= */
let menuData = {};
let cart = [];
let currentItem = null;
let modalQty = 1;

/* =========================
   CARREGAR MENU
========================= */
async function loadMenu() {
    try {
        const res = await fetch('menu.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        menuData = await res.json();
        renderMenu();
    } catch (e) {
        console.error('Erro ao carregar menu.json:', e);
    }
}

/* =========================
   CARRINHO — PERSISTÊNCIA
========================= */
function loadCart() {
    try {
        const stored = localStorage.getItem('florDeLotusCart');
        if (stored) cart = JSON.parse(stored);
    } catch (e) {
        cart = [];
    }
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('florDeLotusCart', JSON.stringify(cart));
}

/* =========================
   RENDER MENU
========================= */
function renderMenu() {
    for (const [category, items] of Object.entries(menuData)) {
        const grid = document.getElementById(`${category}-grid`);
        if (!grid) continue;

        grid.innerHTML = items.map(item => `
            <article class="menu-item" data-id="${item.id}" data-tags="${item.tags?.join(' ') || ''}">
                <div class="item-image" onclick="openItemModal(${item.id})">
                    <!-- CORREÇÃO #1: campo era item.img, mas o JSON usa item.imagem -->
                    <img
                        src="${item.imagem || ''}"
                        alt="${item.nome}"
                        loading="lazy"
                        onerror="this.style.display='none'; this.parentElement.innerHTML='🍣';"
                    >
                </div>
                <div class="item-info" onclick="openItemModal(${item.id})">
                    <h3>${item.nome}</h3>
                    <p class="descricao">${item.descricao}</p>
                    <p class="preco">R$ ${item.preco.toFixed(2)}</p>
                </div>
                <button class="btn-add" onclick="openItemModal(${item.id})">
                    <i class="fas fa-plus-circle"></i> Adicionar
                </button>
                <i class="${getFavoriteClass(item.id)} favorite-icon"
                   data-id="${item.id}"
                   onclick="toggleFavorite(${item.id}, event)"
                   aria-label="Favoritar ${item.nome}"></i>
            </article>
        `).join('');
    }
}

/* =========================
   MODAL DE ITEM
========================= */
function openItemModal(itemId) {
    currentItem = Object.values(menuData).flat().find(i => i.id === itemId);
    if (!currentItem) return;

    document.getElementById('modalNome').textContent = currentItem.nome;
    document.getElementById('modalDesc').textContent = currentItem.descricao;
    document.getElementById('modalPreco').textContent = `R$ ${currentItem.preco.toFixed(2)}`;

    // CORREÇÃO #1: campo correto é imagem, não photo
    const modalPhoto = document.getElementById('modalPhoto');
    modalPhoto.src = currentItem.imagem || '';
    modalPhoto.alt = currentItem.nome;
    modalPhoto.onerror = () => { modalPhoto.style.display = 'none'; };
    modalPhoto.onload  = () => { modalPhoto.style.display = 'block'; };

    // CORREÇÃO #9: select de sabor dinâmico a partir do JSON
    // Some completamente para itens sem sabores (ex: combinados)
    const flavorSelect = document.getElementById('flavorSelect');
    const flavorLabel  = document.querySelector('label[for="flavorSelect"]');

    if (currentItem.flavors && currentItem.flavors.length > 0) {
        flavorSelect.innerHTML = currentItem.flavors
            .map(f => `<option value="${f.toLowerCase()}">${f}</option>`)
            .join('');
        flavorSelect.style.display = 'block';
        if (flavorLabel) flavorLabel.style.display = 'block';
    } else {
        flavorSelect.style.display = 'none';
        if (flavorLabel) flavorLabel.style.display = 'none';
    }

    modalQty = 1;
    document.getElementById('modalQty').textContent = modalQty;
    document.getElementById('itemModal').classList.add('show');
}

function closeItemModal() {
    document.getElementById('itemModal')?.classList.remove('show');
}

function changeModalQty(change) {
    modalQty = Math.max(1, modalQty + change);
    document.getElementById('modalQty').textContent = modalQty;
}

function addFromModal() {
    if (!currentItem) return;

    const flavorSelect = document.getElementById('flavorSelect');
    const flavor = (flavorSelect && flavorSelect.style.display !== 'none')
        ? flavorSelect.value
        : null;

    const existing = cart.find(i => i.id === currentItem.id && i.flavor === flavor);

    if (existing) {
        existing.quantity += modalQty;
    } else {
        cart.push({ ...currentItem, flavor, quantity: modalQty });
    }

    saveCart();
    updateCartUI();
    closeItemModal();
}

/* =========================
   ATUALIZAR UI DO CARRINHO
========================= */
function updateCartUI() {
    const count = cart.reduce((acc, i) => acc + i.quantity, 0);
    const total = cart.reduce((acc, i) => acc + (i.preco * i.quantity), 0);

    const cartCount  = document.getElementById('cartCount');
    const cartTotal  = document.getElementById('cartTotal');
    const modalTotal = document.getElementById('modalTotal');

    if (cartCount)  cartCount.textContent  = count;
    if (cartTotal)  cartTotal.textContent  = total.toFixed(2);
    if (modalTotal) modalTotal.textContent = total.toFixed(2);

    const cartList = document.getElementById('cartItemsList');
    if (!cartList) return;

    if (cart.length === 0) {
        cartList.innerHTML = '<p style="text-align:center; color:#999;">Carrinho vazio</p>';
        return;
    }

    cartList.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${item.nome}${item.flavor ? ` (${item.flavor})` : ''}
                </div>
                <div class="cart-item-price">
                    R$ ${(item.preco * item.quantity).toFixed(2)}
                </div>
            </div>
            <div class="cart-item-actions">
                <button onclick="changeQuantity(${index}, -1)" aria-label="Diminuir quantidade">–</button>
                <span>${item.quantity}</span>
                <button onclick="changeQuantity(${index}, 1)" aria-label="Aumentar quantidade">+</button>
                <button onclick="removeFromCart(${index})" style="margin-left:8px;" aria-label="Remover item">🗑</button>
            </div>
        </div>
    `).join('');
}

function changeQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity < 1) cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function toggleCartModal() {
    document.getElementById('cartModal')?.classList.toggle('show');
}

/* =========================
   FINALIZAR PEDIDO
========================= */
function finalizarPedido() {
    if (cart.length === 0) {
        alert('Carrinho vazio!');
        return;
    }

    const total = cart.reduce((acc, i) => acc + (i.preco * i.quantity), 0);
    const data  = document.getElementById('agendamentoData')?.value;
    const dataFormatada = data
        ? new Date(data).toLocaleString('pt-BR')
        : 'A combinar';

    let msg = `🍣 *Pedido Flor de Lótus*\n\n`;

    cart.forEach(item => {
        msg += `${item.quantity}x ${item.nome}`;
        if (item.flavor) msg += ` (${item.flavor})`;
        msg += ` — R$ ${(item.preco * item.quantity).toFixed(2)}\n`;
    });

    msg += `\n*Total: R$ ${total.toFixed(2)}*`;
    msg += `\n*Data/Hora: ${dataFormatada}*`;
    msg += `\n\nEndereço de entrega: `;
    msg += `\nObservações: `;

    // CORREÇÃO #3: número correto da Flor de Lótus
    const numero = '5583999700469';
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');

    // Salvar no histórico antes de limpar
    const history = JSON.parse(localStorage.getItem('florOrderHistory') || '[]');
    history.push({
        date: new Date().toISOString(),
        items: cart.map(i => ({
            id:       i.id,
            nome:     i.nome,
            quantity: i.quantity,
            flavor:   i.flavor,
            preco:    i.preco
        })),
        total
    });
    localStorage.setItem('florOrderHistory', JSON.stringify(history));

    cart = [];
    saveCart();
    updateCartUI();
    toggleCartModal();
}

/* =========================
   FAVORITOS — COM PERSISTÊNCIA
   CORREÇÃO #8: favoritos agora salvos no localStorage
========================= */
function loadFavorites() {
    return JSON.parse(localStorage.getItem('florFavorites') || '[]');
}

function saveFavorites(favorites) {
    localStorage.setItem('florFavorites', JSON.stringify(favorites));
}

function getFavoriteClass(id) {
    return loadFavorites().includes(id) ? 'fas fa-heart' : 'far fa-heart';
}

function toggleFavorite(id, event) {
    event.stopPropagation();

    const favorites = loadFavorites();
    const index = favorites.indexOf(id);

    if (index === -1) {
        favorites.push(id);
        event.target.classList.replace('far', 'fas');
    } else {
        favorites.splice(index, 1);
        event.target.classList.replace('fas', 'far');
    }

    saveFavorites(favorites);
}

/* =========================
   FILTROS DE CATEGORIAS
   CORREÇÃO #4: botões agora funcionam de verdade
========================= */
function initFilters() {
    const buttons  = document.querySelectorAll('.filter-btn');
    const sections = document.querySelectorAll('main section[id]');
    const dividers = document.querySelectorAll('.lotus-divider');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.section;

            sections.forEach(section => {
                section.style.display =
                    (target === 'all' || section.id === target) ? 'block' : 'none';
            });

            dividers.forEach(div => {
                div.style.display = target === 'all' ? 'block' : 'none';
            });
        });
    });
}

/* =========================
   HISTÓRICO DE PEDIDOS
========================= */
function toggleHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal?.classList.toggle('show');
    if (modal?.classList.contains('show')) renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('florOrderHistory') || '[]');
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align:center; color:#999;">Nenhum pedido anterior.</p>';
        return;
    }

    historyList.innerHTML = [...history].reverse().map(order => `
        <div class="history-order">
            <p class="history-date">
                <i class="fas fa-calendar-alt"></i>
                ${new Date(order.date).toLocaleString('pt-BR')}
                — <strong>R$ ${order.total.toFixed(2)}</strong>
            </p>
            <ul>
                ${order.items.map(i => `
                    <li>${i.quantity}x ${i.nome}${i.flavor ? ` (${i.flavor})` : ''}</li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

/* =========================
   DARK MODE
========================= */
const themeToggle = document.getElementById('themeToggle');

function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (themeToggle)
        themeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

if (themeToggle) themeToggle.addEventListener('click', toggleDarkMode);

/* =========================
   MÚSICA AMBIENTE
   CORREÇÃO #15: estado da música persiste entre visitas
========================= */
function initMusic() {
    const musicToggle = document.getElementById('musicToggle');
    const audio = document.getElementById('ambientMusic');
    if (!musicToggle || !audio) return;

    const playing = localStorage.getItem('florMusic') === 'on';
    if (playing) {
        audio.play().catch(() => {});
        musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
    }

    musicToggle.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch(e => console.warn('Autoplay bloqueado pelo navegador:', e));
            musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
            localStorage.setItem('florMusic', 'on');
        } else {
            audio.pause();
            musicToggle.innerHTML = '<i class="fas fa-music"></i>';
            localStorage.setItem('florMusic', 'off');
        }
    });
}

/* =========================
   SERVICE WORKER
   CORREÇÃO #2: SW nunca era registrado — PWA não funcionava
========================= */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('✅ Service Worker registrado:', reg.scope))
            .catch(err => console.error('❌ Falha no Service Worker:', err));
    }
}

/* =========================
   INICIALIZAÇÃO
========================= */
window.addEventListener('load', () => {
    loadMenu();
    loadCart();
    loadTheme();
    initFilters();
    initMusic();
    registerServiceWorker();

    // Define o mínimo do agendamento como o momento atual
    const agendamento = document.getElementById('agendamentoData');
    if (agendamento) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        agendamento.min = now.toISOString().slice(0, 16);
    }
});
