'use strict';

/* ═══════════════════════════════════════════════════
   install.js — PWA Install prompt (única fonte)
═══════════════════════════════════════════════════ */

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.dispatchEvent(new Event('pwa:installable'));

  const btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.dispatchEvent(new Event('pwa:installed'));

  const btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'none';
});

window.triggerInstall = async () => {
  if (!deferredPrompt) return;

  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log('Escolha do usuário:', choice);
    deferredPrompt = null;
  } catch (err) {
    console.error('❌ Erro ao instalar:', err);
  }
};

window.isInstallable = () => !!deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('btnInstall')
    ?.addEventListener('click', window.triggerInstall);
});