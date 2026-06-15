'use strict';
/* ═══════════════════════════════════════════════════
   api.js — Fonte de dados do cardápio
═══════════════════════════════════════════════════ */

import { state, dom } from './state.js';
import { getSupabase } from './db.js';

// URL de reserva — se o banco falhar
const MENU_URL = '/assets/menu.json';

/**
 * Helper para fetch com timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Busca o cardápio do Supabase. 
 * Se o banco estiver vazio ou falhar, usa o menu.json como fallback.
 */
export async function fetchMenu() {
  console.log('[api] Iniciando fetchMenu...');
  // 1. Tenta o fallback JSON primeiro — garante estabilidade imediata
  try {
    const jsonMenu = await fetchMenuFallback();
    if (jsonMenu && jsonMenu.length > 0) {
      console.log('[api] fetchMenu resolvido via JSON');
      return jsonMenu;
    }
  } catch (e) {
    console.warn('[api] Falha crítica no fetchMenuFallback:', e);
  }

  // 2. Se o JSON falhar, tenta o Supabase (Reserva)
  try {
    console.log('[api] Tentando Supabase como reserva...');
    const supabase = getSupabase();
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_active', true)
    ]);

    if (catRes.error || prodRes.error || !catRes.data?.length) {
      console.warn('[api] Supabase vazio ou erro');
      return state.menu; // Retorna o que tiver (pode ser o emergência do fallback)
    }

    state.menu = organizeMenu(catRes.data, prodRes.data);
    console.log('[api] menu carregado do Supabase ✓');
    return state.menu;
  } catch (err) {
    console.error('[api] Erro ao buscar menu no Supabase:', err);
    return state.menu;
  }
}

/**
 * Organiza produtos dentro de suas categorias (formato esperado pelo app)
 */
function organizeMenu(categories, products) {
  return categories.map(cat => ({
    id: cat.id,
    nome: cat.name,
    icone: cat.icon,
    descricao: cat.description,
    itens: products
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
        is_promo: p.is_promo,
        is_active: p.is_active
      }))
  })).filter(cat => cat.itens.length > 0);
}

/**
 * Ativa ouvintes em tempo real para o cardápio e status da loja
 */
export function subscribeToRealtimeUpdates(onUpdate) {
  const supabase = getSupabase();

  // 1. Ouvir mudanças em produtos
  supabase
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      console.log('[api] Mudança detectada nos produtos, atualizando...');
      await fetchMenu();
      if (onUpdate) onUpdate('menu');
    })
    .subscribe();

  // 2. Ouvir mudanças no status da loja
  supabase
    .channel('public:store_config')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_config' }, async (payload) => {
      console.log('[api] Mudança detectada na configuração:', payload.new.key);
      if (onUpdate) onUpdate('config', payload.new);
    })
    .subscribe();
}

async function fetchMenuFallback() {
  console.log('[api] Carregando fallback JSON...');
  try {
    const res = await fetchWithTimeout(MENU_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.menu = data.categorias || [];
    
    if (state.menu.length === 0) {
      console.warn('[api] JSON veio vazio, usando item de emergência');
      state.menu = getEmergencyMenu();
    }
    
    console.log('[api] menu carregado do JSON fallback ✓');
    return state.menu;
  } catch (err) {
    console.error('[api] fallback falhou, usando item de emergência:', err);
    state.menu = getEmergencyMenu();
    return state.menu;
  }
}

function getEmergencyMenu() {
  return [
    {
      id: "emergencia",
      nome: "Cardápio Local",
      icone: "fa-alert",
      descricao: "Carregado via emergência (Segurança)",
      itens: [
        {
          id: "emergency-01",
          nome: "Uramaki Tradicional",
          preco: 10.00,
          descricao: "O clássico arroz por fora. (Carregamento de segurança)",
          imagem: "/assets/images/uramaki.jpg",
          destaque: true
        }
      ]
    }
  ];
}

/**
 * Verifica o status de funcionamento da loja (Ajustado para GMT-3)
 */
export async function checkStoreStatus() {
  try {
    console.log('[api] Verificando status da loja...');
    const supabase = getSupabase();
    
    // Adiciona timeout na query do Supabase usando abort controller se possível, 
    // mas por simplicidade vamos apenas deixar rodar em paralelo no init.
    const { data, error } = await supabase
      .from('store_config')
      .select('*');

    if (error || !data) return { is_open: true };

    const status = data.find(c => c.key === 'status')?.value || {};
    const hours  = data.find(c => c.key === 'hours')?.value || [];

    if (status.manual_closed) return { is_open: false, reason: 'Fechado temporariamente' };

    // Horário Atual Ajustado para GMT-3 (Cajazeiras/PB)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localDate = new Date(utcTime + (3600000 * -3));
    
    const day = localDate.getDay();
    const currentTime = localDate.getHours() * 60 + localDate.getMinutes();

    const todayRule = hours.find(h => h.day === day);
    
    if (!todayRule || todayRule.closed) {
      return { is_open: false, reason: 'Fechado hoje' };
    }

    const [hOpen, mOpen]   = todayRule.open.split(':').map(Number);
    const [hClose, mClose] = todayRule.close.split(':').map(Number);
    
    const openMinutes  = hOpen * 60 + mOpen;
    const closeMinutes = hClose * 60 + mClose;

    let isOpen = false;
    if (closeMinutes < openMinutes) {
      isOpen = currentTime >= openMinutes || currentTime <= closeMinutes;
    } else {
      isOpen = currentTime >= openMinutes && currentTime <= closeMinutes;
    }

    return { 
      is_open: isOpen, 
      reason: isOpen ? '' : `Abrimos às ${todayRule.open}` 
    };

  } catch (e) {
    console.warn('[api] Falha ao verificar status, assumindo aberto:', e);
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
