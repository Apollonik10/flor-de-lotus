'use strict';

/* ═══════════════════════════════════════════════════
   api.js — Fonte de dados do cardápio
   ╔══════════════════════════════════════════════╗
   ║  FASE FIREBASE: substituir fetchMenu() por   ║
   ║  getDocs(collection(db, 'categorias'))        ║
   ║  Nenhum outro arquivo precisa mudar.          ║
   ╚══════════════════════════════════════════════╝
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';

export async function fetchMenu() {
  try {
    const res = await fetch('menu.json');
    if (!res.ok) throw new Error('Falha ao carregar cardápio');
    const data = await res.json();
    state.menu = data.categorias || [];
  } catch (err) {
    const container = dom.mainContent();
    if (container) {
      container.innerHTML = `
        <div style="padding:3rem 1rem;text-align:center;color:rgba(245,245,245,.5)">
          <i class="fas fa-exclamation-circle"
             style="font-size:2rem;margin-bottom:.8rem;display:block"></i>
          <p>Não foi possível carregar o cardápio.<br>Verifique sua conexão.</p>
        </div>`;
    }
  }
}
