'use strict';

/* ═══════════════════════════════════════════════════
   utils.js — Funções utilitárias puras
   Sem dependências de UI ou estado mutável.
═══════════════════════════════════════════════════ */

import { state } from './state.js';

/** Formata número para moeda BR: 10.5 → "10,50" */
export function formatPrice(value) {
  return value.toFixed(2).replace('.', ',');
}

/** Busca item pelo id em todas as categorias */
export function findItem(id) {
  for (const cat of state.menu) {
    const item = cat.itens.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

/** Última palavra do título em itálico */
export function formatTitle(nome) {
  const words = nome.trim().split(' ');
  if (words.length === 1) return `<em>${nome}</em>`;
  const last = words.pop();
  return `${words.join(' ')} <em>${last}</em>`;
}
