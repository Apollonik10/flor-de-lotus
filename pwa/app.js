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
        menuData = await res.json();
        renderMenu();
    } catch (e) {
        console.error('Erro ao carregar menu.json', e);
    }
}

/* =========================
   CARRINHO
========================= */
function loadCart() {
    const stored = localStorage.getItem('florDeLotusCart');
    if (stored) cart = JSON.parse(stored);
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
                    ${item.img || '🍣'}
                </div>
                <div class="item-info" onclick="openItemModal(${item.id})">
                    <h3>${item.nome}</h3>
                    <p class="descricao">${item.descricao}</p>
                    <p class="preco">R$ ${item.preco.toFixed(2)}</p>
                </div>
                <button class="btn-add" onclick="openItemModal(${item.id})">
                    <i class="fas fa-plus-circle"></i> Adicionar
                </button>
                <i class="far fa-heart favorite-icon"
                   data-id="${item.id}"
                   onclick="toggleFavorite(${item.id}, event)"></i>
            </article>
        `).join('');
    }
}

/* =========================
   MODAL ITEM
========================= */
function openItemModal(itemId) {
    currentItem = Object.values(menuData).flat().find(i => i.id === itemId);
    if (!currentItem) return;

    document.getElementById('modalNome').textContent = currentItem.nome;
    document.getElementById('modalDesc').textContent = currentItem.descricao;
    document.getElementById('modalPreco').textContent = `R$ ${currentItem.preco.toFixed(2)}`;
    document.getElementById('modalPhoto').src =
        currentItem.photo || 'https://via.placeholder.com/300x200?text=Foto+do+Prato';

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
    const flavor = flavorSelect ? flavorSelect.value : null;

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
   ATUALIZAR CARRINHO
========================= */
function updateCartUI() {
    const count = cart.reduce((acc, i) => acc + i.quantity, 0);
    const total = cart.reduce((acc, i) => acc + (i.preco * i.quantity), 0);

    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const modalTotal = document.getElementById('modalTotal');

    if (cartCount) cartCount.textContent = count;
    if (cartTotal) cartTotal.textContent = total.toFixed(2);
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
                    ${item.nome} ${item.flavor ? `(${item.flavor})` : ''}
                </div>
                <div class="cart-item-price">
                    R$ ${(item.preco * item.quantity).toFixed(2)}
                </div>
            </div>
            <div class="cart-item-actions">
                <button onclick="changeQuantity(${index}, -1)">–</button>
                <span>${item.quantity}</span>
                <button onclick="changeQuantity(${index}, 1)">+</button>
                <button onclick="removeFromCart(${index})" style="margin-left:8px;">🗑</button>
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
    if (cart.length === 0) return alert('Carrinho vazio!');

    const total = cart.reduce((acc, i) => acc + (i.preco * i.quantity), 0);
    const data = document.getElementById('agendamentoData')?.value || 'Sem data';

    let msg = `🍣 *Pedido Flor de Lótus*\n\n`;

    cart.forEach(item => {
        msg += `${item.quantity}x ${item.nome} ${item.flavor ? `(${item.flavor})` : ''} - R$ ${(item.preco * item.quantity).toFixed(2)}\n`;
    });

    msg += `\n*Total: R$ ${total.toFixed(2)}*\n*Data: ${data}*\n\nEndereço: [INSIRA AQUI]\nObservações: `;

    const numero = '5511999999999'; // ALTERAR
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');

    const history = JSON.parse(localStorage.getItem('florOrderHistory')) || [];
    history.push({
        date: new Date().toISOString(),
        items: cart.map(i => ({
            id: i.id,
            nome: i.nome,
            quantity: i.quantity,
            flavor: i.flavor
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
   FAVORITOS
========================= */
function toggleFavorite(id, event) {
    event.stopPropagation();
    event.target.classList.toggle('fas');
    event.target.classList.toggle('far');
}

/* =========================
   HISTÓRICO
========================= */
function toggleHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal?.classList.toggle('show');
    if (modal?.classList.contains('show')) renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('florOrderHistory')) || [];
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (history.length === 0) {
        historyList.innerHTML = '<p>Nenhum pedido anterior.</p>';
        return;
    }

    historyList.innerHTML = [...history].reverse().map(order => `
        <div>
            <p>${new Date(order.date).toLocaleString()} - R$ ${order.total.toFixed(2)}</p>
            <ul>
                ${order.items.map(i => `<li>${i.quantity}x ${i.nome}</li>`).join('')}
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
    if (saved === 'dark' ||
        (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
        if (themeToggle)
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

if (themeToggle)
    themeToggle.addEventListener('click', toggleDarkMode);

/* =========================
   INICIAR
========================= */
window.addEventListener('load', () => {
    loadMenu();
    loadCart();
    loadTheme();
});