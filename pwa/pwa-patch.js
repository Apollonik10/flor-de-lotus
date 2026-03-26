'use strict';
/* ══════════════════════════════════════════════════
   FLOR DE LÓTUS — pwa-patch.js
   Adicione em cardapio.html ANTES de app.js:
   <script src="./pwa-patch.js"></script>

   Fixes:
   1. Bug: cartTotalValue sem null-check (crash)
   2. Melhoria: WhatsApp com nome + alergia do usuário
   3. Re-registra SW no escopo correto
══════════════════════════════════════════════════ */
(function () {

  const STORAGE_KEY = 'fl_user';
  const VISITED_KEY = 'fl_visited';

  /* ── 1. Marca visita (já está no PWA) ── */
  localStorage.setItem(VISITED_KEY, '1');

  /* ── 2. Carrega dados do usuário cadastrado ── */
  let userData = null;
  try { userData = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch (_) { userData = null; }

  /* Expõe para app.js usar */
  window.FL_USER = userData;

  /* ── 3. Patch: personaliza mensagem WhatsApp ── */
  /*
    Sobrescrevemos sendOrderWhatsApp após o DOM carregar.
    app.js define window.changeCartQty e usa state global.
    Este patch envolve sendOrderWhatsApp se definida.
  */
  window.addEventListener('fl:ready', () => {
    /* fl:ready é disparado pelo app.js se quiser integrar */
  });

  /* ── 4. Registra SW na raiz ── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then(reg => console.log('[SW] PWA registrado:', reg.scope))
      .catch(err => console.warn('[SW] Falha:', err.message));
  }

  /* ── 5. Saudação personalizada no toast ── */
  document.addEventListener('DOMContentLoaded', () => {
    if (!userData?.name) return;

    const firstName = userData.name.split(' ')[0];

    /* Exibe toast de boas-vindas após 800ms */
    setTimeout(() => {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = `Olá, ${firstName}! 🌸`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    }, 800);

    /* Adiciona alergias ao título do cardápio se houver */
    if (userData.allergies?.length) {
      const banner = document.createElement('div');
      banner.setAttribute('role', 'alert');
      banner.style.cssText = `
        position: fixed; top: calc(60px + 52px + 4px); left: 0; right: 0;
        z-index: 150; padding: 6px 1rem; font-size: .72rem;
        letter-spacing: .08em; text-transform: uppercase; text-align: center;
        background: rgba(199,58,50,.15); color: #f3d7cf;
        border-bottom: 1px solid rgba(199,58,50,.25);
      `;
      banner.textContent = `⚠ Alergias registradas: ${userData.allergies.join(', ')}`;
      document.body.appendChild(banner);

      /* Remove após 5s */
      setTimeout(() => banner.remove(), 5000);
    }
  });

})();

/* ══════════════════════════════════════════════════
   INSTRUÇÕES DE INTEGRAÇÃO
   ════════════════════════════════════════════════
   Em app.js, na função sendOrderWhatsApp(), substitua:

   const msg = [
     '🌸 *Flor de Lótus — Novo Pedido*',
     ...
   ]

   Por este bloco (adiciona nome e alergia):

   const user    = window.FL_USER;
   const nomeCliente = user?.name ? `*Cliente:* ${user.name}` : '';
   const enderecoWA  = user?.address ? `*Endereço:* ${user.address}` : '';
   const alergiaWA   = user?.allergies?.length
     ? `⚠️ *Alergias:* ${user.allergies.join(', ')}`
     : '';
   const notasWA = user?.notes ? `📝 *Obs:* ${user.notes}` : '';

   const msg = [
     '🌸 *Flor de Lótus — Novo Pedido*',
     nomeCliente,
     '',
     ...lines,
     '',
     `*Total: R$ ${formatPrice(total)}*`,
     '',
     enderecoWA,
     alergiaWA,
     notasWA,
     '📍 Confirme o endereço de entrega, por favor!',
   ].filter(Boolean).join('\n');
══════════════════════════════════════════════════ */