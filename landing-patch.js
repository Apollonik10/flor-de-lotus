'use strict';
/* ══════════════════════════════════════════════════
   FLOR DE LÓTUS — landing-patch.js
   Adicione antes de </body> em index-v2.html:
   <script src="/landing-patch.js"></script>

   Funções:
   1. Retornantes → redireciona para /pwa/
   2. CTAs → define fl_visited no clique
   3. Registra o Service Worker na raiz
══════════════════════════════════════════════════ */
(function () {

  const VISITED_KEY = 'fl_visited';
  const REG_KEY     = 'fl_user';
  const PWA_URL     = '/pwa/cardapio.html';  /* ← ajuste se necessário */

  /* ────────────────────────────────────────────
     1. REDIRECT — retornantes vão direto ao PWA
     Na PRIMEIRA visita: mostra landing normalmente.
     Nas PRÓXIMAS: redireciona automático.
  ──────────────────────────────────────────── */
  if (localStorage.getItem(VISITED_KEY) === '1') {
    /* Pequena pausa para não bloquear LCP da landing */
    window.location.replace(PWA_URL);
    return; /* Para o resto do script */
  }

  /* ────────────────────────────────────────────
     2. MARCA VISITA no clique de qualquer CTA
     que leva ao cardápio
  ──────────────────────────────────────────── */
  const markVisited = () => localStorage.setItem(VISITED_KEY, '1');

  document
    .querySelectorAll('a[href*="cardapio"], a[href*="pwa"]')
    .forEach(el => el.addEventListener('click', markVisited, { once: true }));

  /* ────────────────────────────────────────────
     3. REGISTRO DO SERVICE WORKER — raiz
     scope: '/' controla landing + pwa
  ──────────────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then(reg => {
          console.log('[SW] ✅ Registrado. Escopo:', reg.scope);

          /* Atualiza SW silenciosamente em background */
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            newSW?.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] 🔄 Nova versão disponível');
              }
            });
          });
        })
        .catch(err => console.warn('[SW] ⚠ Falha no registro:', err.message));
    });
  }

  /* ────────────────────────────────────────────
     4. PREENCHE DADOS DO USUÁRIO CADASTRADO
     Se a pessoa se registrou em /pwa/register.html,
     usamos o nome dela no tooltip do WA
  ──────────────────────────────────────────── */
  const userData = (() => {
    try { return JSON.parse(localStorage.getItem(REG_KEY) || 'null'); }
    catch { return null; }
  })();

  if (userData?.name) {
    /* Personaliza o tooltip do botão flutuante */
    const tooltip = document.querySelector('.wa-tooltip');
    if (tooltip) tooltip.textContent = `Pedir agora, ${userData.name.split(' ')[0]}!`;
  }

})();