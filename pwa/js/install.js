'use strict';

/* ═══════════════════════════════════════════════════
   install.js — PWA Install prompt (única fonte)
   Expõe: window.triggerInstall(), window.isInstallable()
   Dispara eventos: pwa:installable, pwa:installed
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

window.triggerInstall = async function () {
<<<<<<< HEAD
  if (!deferredPrompt) {
    alert('Instalação não disponível ainda');
    return;
  }

  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    console.log('Escolha do usuário:', choice);

    deferredPrompt = null;
  } catch (err) {
    console.error('❌ Erro ao instalar:', err);
  }
};

window.isInstallable = () => {
  console.log('isInstallable:', !!deferredPrompt);
  return !!deferredPrompt;
};
=======
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
};

window.isInstallable = () => !!deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnInstall')?.addEventListener('click', window.triggerInstall);
});
>>>>>>> 0526b40 (backup local antes de atualizar)
