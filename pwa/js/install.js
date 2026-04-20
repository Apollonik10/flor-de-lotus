'use strict';

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'flex';
  // Notifica o drawer se já estiver aberto
  document.dispatchEvent(new Event('pwa:installable'));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.dispatchEvent(new Event('pwa:installed'));
});

window.triggerInstall = function () {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choice) => {
    deferredPrompt = null;
  });
};

window.isInstallable = () => !!deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnInstall')?.addEventListener('click', window.triggerInstall);
});