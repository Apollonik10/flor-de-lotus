'use strict';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const basePath = window.location.pathname.startsWith('/flor-de-lotus') ? '/flor-de-lotus' : '';
      navigator.serviceWorker.register(basePath + '/service-worker.js', {
        scope: basePath + '/'
      })
        .then(() => console.log('SW registrado'))
        .catch(err => console.log('Erro SW:', err));
    });
  }
}