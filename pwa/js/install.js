'use strict';

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'none';
  deferredPrompt = null;
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnInstall')?.addEventListener('click', () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        document.getElementById('btnInstall').style.display = 'none';
      }
      deferredPrompt = null;
    });
  });
});