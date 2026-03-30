'use strict';

/* ═══════════════════════════════════════════════════
   sw.js — Registro do Service Worker
   IMPORTANTE: o SW está na RAIZ (/service-worker.js)
   e deve ser registrado com caminho absoluto.
═══════════════════════════════════════════════════ */

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then(reg => {
      /* Atualiza silenciosamente em background */
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] 🔄 Nova versão disponível');
          }
        });
      });
    })
    .catch(err => console.warn('[SW] Falha no registro:', err.message));
}