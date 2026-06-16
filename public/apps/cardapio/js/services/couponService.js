'use strict';

/* ═══════════════════════════════════════════════════
   couponService.js — Serviço de Cupons de Desconto
   Fase 6 — Validação e aplicação de cupons
═══════════════════════════════════════════════════ */

import { getSupabase, getDeviceId } from '../db.js';

/**
 * Valida e aplica um cupom de desconto.
 * @param {string} code - Código do cupom
 * @param {number} orderValue - Valor total do pedido
 * @returns {Promise<{valid: boolean, discount?: number, newTotal?: number, error?: string}>}
 */
export async function validateCoupon(code, orderValue) {
  if (!code || !orderValue) {
    return { valid: false, error: 'Código e valor obrigatórios' };
  }

  try {
    const { data, error } = await getSupabase()
      .rpc('apply_coupon', {
        p_code: code.trim().toUpperCase(),
        p_device_id: getDeviceId(),
        p_order_value: orderValue
      });

    if (error) {
      console.warn('[coupon] validate error:', error.message);
      return { valid: false, error: 'Erro ao validar cupom' };
    }

    return data;
  } catch (e) {
    console.warn('[coupon] validate offline:', e.message);
    return { valid: false, error: 'Sem conexão' };
  }
}

/**
 * Registra o uso de um cupom após o pedido ser criado.
 * @param {string} couponId - ID do cupom
 * @param {string} orderId - ID do pedido
 */
export async function useCoupon(couponId, orderId) {
  if (!couponId || !orderId) return;

  try {
    const { error } = await getSupabase()
      .rpc('use_coupon', {
        p_coupon_id: couponId,
        p_device_id: getDeviceId(),
        p_order_id: orderId
      });

    if (error) console.warn('[coupon] use error:', error.message);
  } catch (e) {
    console.warn('[coupon] use offline:', e.message);
  }
}

/**
 * Busca cupons ativos disponíveis.
 * @returns {Promise<Array>}
 */
export async function fetchActiveCoupons() {
  try {
    const { data, error } = await getSupabase()
      .from('coupons')
      .select('id, code, discount_percent, discount_amount, min_order_value, valid_until')
      .eq('active', true)
      .or('valid_until.is.null,valid_until.gt.now()');

    if (error) {
      console.warn('[coupon] fetch error:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[coupon] fetch offline:', e.message);
    return [];
  }
}