'use strict';

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('🔥 beforeinstallprompt DISPAROU');

  e.preventDefault();
  deferredPrompt = e;

  document.dispatchEvent(new Event('pwa:installable'));
});

window.addEventListener('appinstalled', () => {
  console.log('✅ APP INSTALADO');

  deferredPrompt = null;
  document.dispatchEvent(new Event('pwa:installed'));
});

window.triggerInstall = async function () {
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
