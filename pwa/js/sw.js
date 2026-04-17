'use strict';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })  // ← absoluto, era './service-worker.js'
        .then(() => console.log('[SW] Registrado'))
        .catch(err => console.warn('[SW] Erro:', err));
    });
  }
}