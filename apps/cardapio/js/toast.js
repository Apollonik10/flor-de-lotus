'use strict';

/* ═══════════════════════════════════════════════════
   toast.js — Notificações temporárias
═══════════════════════════════════════════════════ */

import { dom } from './state.js';

let toastTimer;

export function showToast(msg) {
  const t = dom.toast();
  if (!t) return;
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
