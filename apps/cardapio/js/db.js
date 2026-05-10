'use strict';

/* ═══════════════════════════════════════════════════
   db.js — Cliente Supabase singleton
   Fase 1: sync híbrido localStorage + Supabase
   Custo: zero (free tier)
   v1.1 — saveOrder com dados do cliente
═══════════════════════════════════════════════════ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://aflglnnruovheztrqneg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbGdsbm5ydW92aGV6dHJxbmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDAwNjUsImV4cCI6MjA5Mzg3NjA2NX0.2LOqKN-SX52PbhBtLZA4cHpmjnj3hnOb9qz2N1ROYdU';

// ── Singleton ────────────────────────────────────
let _client = null;

export function getSupabase() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _client;
}

// ── Device ID persistente ────────────────────────
export function getDeviceId() {
  let id = localStorage.getItem('fl_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 18) + Date.now();
    localStorage.setItem('fl_device_id', id);
  }
  return id;
}

// ── Sync de perfil (localStorage → Supabase) ────
export async function syncProfile() {
  const user = _getUserLocal();
  if (!user) return;

  const db       = getSupabase();
  const deviceId = getDeviceId();

  try {
    const { error } = await db
      .from('profiles')
      .upsert({
        device_id:  deviceId,
        name:       user.name      || null,
        phone:      user.phone     || null,
        address:    user.address   || null,
        allergies:  user.allergies || [],
        notes:      user.notes     || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'device_id' });

    if (error) console.warn('[db] syncProfile:', error.message);
    else       console.log('[db] perfil sincronizado ✓');
  } catch (e) {
    console.warn('[db] syncProfile offline:', e.message);
  }
}

// ── Salvar pedido no Supabase ────────────────────
// Inclui dados do cliente para o dashboard admin ver
// sem precisar fazer join com profiles.
export async function saveOrder(cart, total) {
  const db       = getSupabase();
  const deviceId = getDeviceId();
  const user     = _getUserLocal();

  try {
    const { data, error } = await db
      .from('orders')
      .insert({
        device_id:      deviceId,
        client_name:    user?.name    || null,
        client_phone:   user?.phone   || null,
        client_address: user?.address || null,
        items:          cart,
        total:          total,
        whatsapp_sent:  true,
        status:         'pendente',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[db] saveOrder:', error.message);
      return null;
    }
    console.log('[db] pedido salvo ✓', data.id);
    return data.id;
  } catch (e) {
    console.warn('[db] saveOrder offline:', e.message);
    return null;
  }
}

// ── Sync de fidelidade ───────────────────────────
export async function syncLoyalty(orders, giftCards) {
  const db       = getSupabase();
  const deviceId = getDeviceId();

  try {
    const { error } = await db
      .from('loyalty')
      .upsert({
        device_id:    deviceId,
        total_orders: orders.length,
        gift_cards:   giftCards,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'device_id' });

    if (error) console.warn('[db] syncLoyalty:', error.message);
  } catch (e) {
    console.warn('[db] syncLoyalty offline:', e.message);
  }
}

// ── Helper interno ───────────────────────────────
function _getUserLocal() {
  try { return JSON.parse(localStorage.getItem('fl_user') || 'null'); }
  catch { return null; }
}