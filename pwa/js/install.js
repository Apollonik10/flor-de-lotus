'use strict';

/* ═══════════════════════════════════════════════════
   install.js — PWA Install prompt
   v2 — Módulo único (importado só pelo app.js)
        Sem duplicação de listeners
═══════════════════════════════════════════════════ */

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] ✅ beforeinstallprompt capturado');

  document.dispatchEvent(new Event('pwa:installable'));
  _updateBtn(true);
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] ✅ App instalado com sucesso');
  deferredPrompt = null;
  document.dispatchEvent(new Event('pwa:installed'));
  _updateBtn(false);
});

window.triggerInstall = async () => {
  if (!deferredPrompt) {
    console.warn('[PWA] triggerInstall chamado mas deferredPrompt é null');
    return;
  }
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log('[PWA] Escolha do usuário:', choice.outcome);
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
    }
  } catch (err) {
    console.error('[PWA] Erro ao instalar:', err);
  }
};

window.isInstallable = () => !!deferredPrompt;

/* Atualiza visibilidade do botão de install no topo */
function _updateBtn(show) {
  const btn = document.getElementById('btnInstall');
  if (!btn) return;
  btn.style.display = show ? 'inline-flex' : 'none';
  btn.setAttribute('aria-disabled', String(!show));
}

/* Bind do clique — garante que o DOM existe */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bindBtn);
} else {
  _bindBtn();
}

function _bindBtn() {
  document.getElementById('btnInstall')
    ?.addEventListener('click', window.triggerInstall);
}