'use strict';

let deferredPrompt;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById('btnInstall');
  if (!btn) return;

  btn.style.display = 'inline-flex'; // ← era 'block', quebrava o flex do toolbar

  btn.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      btn.style.display = 'none'; // esconde após instalar
    });
  });
});

// Esconde o botão se o app já está instalado
window.addEventListener('appinstalled', () => {
  document.getElementById('btnInstall')?.style.setProperty('display', 'none');
});