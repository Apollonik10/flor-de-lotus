'use strict';
/* ═══════════════════════════════════════════════════
   install.js — PWA Install prompt (única fonte)
   v2 — Módulo único, sem duplicação
═══════════════════════════════════════════════════ */

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] beforeinstallprompt capturado ✅');
  
  // Dispara evento para quem quiser ouvir
  document.dispatchEvent(new Event('pwa:installable'));

  // Atualiza botão diretamente
  _updateBtn(true);
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App instalado ✅');
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

function _updateBtn(show) {
  const btn = document.getElementById('btnInstall');
  if (!btn) return;
  btn.style.display = show ? 'inline-flex' : 'none';
  btn.setAttribute('aria-disabled', String(!show));
}

// Bind ao DOMContentLoaded para garantir que o botão existe
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnInstall')
      ?.addEventListener('click', window.triggerInstall);
  });
} else {
  document.getElementById('btnInstall')
    ?.addEventListener('click', window.triggerInstall);
}