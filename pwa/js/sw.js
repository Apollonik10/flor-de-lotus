'use strict';

/* ═══════════════════════════════════════════════════
   sw.js — Registro do Service Worker
   Raiz absoluta para cobrir todo o app
═══════════════════════════════════════════════════ */

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('/pwa/service-worker.js', { scope: '/' })
    .then(reg => {
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', function () {
          if (this.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] Nova versão disponível');
          }
        });
      });
    })
    .catch(err => console.warn('[SW] Falha no registro:', err.message));
}
