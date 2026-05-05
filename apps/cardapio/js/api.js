'use strict';
/* ═══════════════════════════════════════════════════
   api.js — Fonte de dados do cardápio
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';

// URL absoluta — funciona em qualquer contexto do GitHub Pages
const MENU_URL = '../../data/menu.json';

export async function fetchMenu() {
  try {
    const res = await fetch(MENU_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.menu = data.categorias || [];
    console.log('[api] menu carregado:', state.menu.length, 'categorias');
  } catch (err) {
    console.error('[api] fetchMenu falhou:', err);
    const container = dom.mainContent();
    if (container) {
      container.innerHTML = `
        <div style="padding:3rem 1rem;text-align:center;color:rgba(245,245,245,.6)">
          <i class="fas fa-exclamation-circle" style="font-size:2rem;display:block;margin-bottom:.8rem"></i>
          <p>Erro ao carregar cardápio<br>
          <small style="opacity:.6">${err.message} — ${MENU_URL}</small></p>
        </div>`;
    }
  }
}