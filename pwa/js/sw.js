'use strict';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Raiz absoluta — não './service-worker.js'
      navigator.serviceWorker.register('/flor-de-lotus/pwa/service-worker.js', { 
  scope: '/flor-de-lotus/' 
})
        .then(() => console.log('SW registrado'))
        .catch(err => console.log('Erro SW:', err));
    });
  }
}