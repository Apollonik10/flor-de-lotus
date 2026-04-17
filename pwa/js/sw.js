'use strict';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/flor-de-lotus/service-worker.js', { scope: '/flor-de-lotus/' })  // ← absoluto, era './service-worker.js'
        .then(() => console.log('[SW] Registrado'))
        .catch(err => console.warn('[SW] Erro:', err));
    });
  }
}