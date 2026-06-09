'use strict';
/* ═══════════════════════════════════════════════════
   api.js — Fonte de dados do cardápio
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';
import { getSupabase } from './db.js';

// URL de reserva — se o banco falhar
const MENU_URL = '/flor-de-lotus/public/menu.json';

/**
 * Busca o cardápio do Supabase. 
 * Se o banco estiver vazio ou falhar, usa o menu.json como fallback.
 */
export async function fetchMenu() {
  try {
    const supabase = getSupabase();
    
    // 1. Buscar Categorias e Produtos em paralelo
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_active', true)
    ]);

    // Se o banco estiver vazio ou der erro, vai para o fallback
    if (catRes.error || prodRes.error || !catRes.data?.length) {
      console.warn('[api] Banco vazio ou erro, usando fallback JSON');
      return await fetchMenuFallback();
    }

    // 2. Organizar produtos dentro de suas categorias (formato esperado pelo app)
    const menuOrganizado = catRes.data.map(cat => ({
      id: cat.id,
      nome: cat.name,
      icone: cat.icon,
      descricao: cat.description,
      itens: prodRes.data
        .filter(p => p.category_id === cat.id)
        .map(p => ({
          id: p.id,
          nome: p.name,
          preco: p.price,
          descricao: p.description,
          porcao: p.portion,
          imagem: p.image_url,
          sabores: p.flavors || [],
          tags: p.tags || [],
          destaque: p.is_featured,
          is_promo: p.is_promo
        }))
    }));

    state.menu = menuOrganizado;
    console.log('[api] menu carregado do Supabase ✓');

  } catch (err) {
    console.error('[api] fetchMenu falhou, tentando fallback:', err);
    await fetchMenuFallback();
  }
}

async function fetchMenuFallback() {
  try {
    const res = await fetch(MENU_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.menu = data.categorias || [];
    console.log('[api] menu carregado do JSON fallback');
  } catch (err) {
    console.error('[api] fallback falhou:', err);
    renderErrorUI(err.message);
  }
}

/**
 * Verifica o status de funcionamento da loja
 */
export async function checkStoreStatus() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('store_config')
      .select('*');

    if (error || !data) return { is_open: true }; // Se der erro, assume aberto por padrão

    const status = data.find(c => c.key === 'status')?.value || {};
    const hours  = data.find(c => c.key === 'hours')?.value || [];

    // 1. Checagem Manual (Botão de Pânico)
    if (status.manual_closed) return { is_open: false, reason: 'Fechado temporariamente' };

    // 2. Checagem de Horário Automática
    const now = new Date();
    const day = now.getDay(); // 0 = Domingo, 1 = Segunda...
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayRule = hours.find(h => h.day === day);
    
    if (!todayRule || todayRule.closed) {
      return { is_open: false, reason: 'Fechado hoje' };
    }

    const [hOpen, mOpen]   = todayRule.open.split(':').map(Number);
    const [hClose, mClose] = todayRule.close.split(':').map(Number);
    
    const openMinutes  = hOpen * 60 + mOpen;
    const closeMinutes = hClose * 60 + mClose;

    // Lógica para horários que passam da meia-noite (ex: 18h às 02h)
    let isOpen = false;
    if (closeMinutes < openMinutes) {
      isOpen = currentTime >= openMinutes || currentTime <= closeMinutes;
    } else {
      isOpen = currentTime >= openMinutes && currentTime <= closeMinutes;
    }

    return { 
      is_open: isOpen && status.is_open, 
      reason: isOpen ? '' : `Abrimos às ${todayRule.open}` 
    };

  } catch (e) {
    return { is_open: true };
  }
}

function renderErrorUI(msg) {
  const container = dom.mainContent();
  if (container) {
    container.innerHTML = `
      <div style="padding:3rem 1rem;text-align:center;color:rgba(245,245,245,.6)">
        <i class="fas fa-exclamation-circle" style="font-size:2rem;display:block;margin-bottom:.8rem"></i>
        <p>Erro ao carregar cardápio<br>
        <small style="opacity:.6">${msg}</small></p>
      </div>`;
  }
}