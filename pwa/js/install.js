'use strict';

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById('btnInstall');
  if (btn) {
    btn.style.display = 'flex'; // flex para alinhar o ícone
  }
});

document.getElementById('btnInstall')?.addEventListener('click', () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choice) => {
    const btn = document.getElementById('btnInstall');
    if (choice.outcome === 'accepted' && btn) {
      btn.style.display = 'none'; // esconde após instalar
    }
    deferredPrompt = null;
  });
});

// Esconde o botão se já estiver instalado como PWA
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('btnInstall');
  if (btn) btn.style.display = 'none';
});