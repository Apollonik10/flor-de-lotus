'use strict';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })
        .then(() => console.log('SW registrado'))
        .catch(err => console.log('Erro SW:', err));
    });
  }
}