'use strict';

/* ═══════════════════════════════════════════════════
   pushService.js — Serviço de Push Notifications
   Fase 6 — Inscrição e gerenciamento de notificações
═══════════════════════════════════════════════════ */

import { getSupabase, getDeviceId } from '../db.js';

const VAPID_PUBLIC_KEY = 'BNoVrJhKzAsGoCJGfEqGerJrDpMjYDpTJFKJpVCKJpVCKJpVCKJpVCK';

/**
 * Verifica se o navegador suporta Push Notifications.
 * @returns {boolean}
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Verifica se o usuário já deu permissão.
 * @returns {boolean}
 */
export function isPushGranted() {
  return Notification.permission === 'granted';
}

/**
 * Solicita permissão para notificações push.
 * @returns {Promise<string>} - 'granted', 'denied', ou 'default'
 */
export async function requestPushPermission() {
  if (!isPushSupported()) {
    console.warn('[push] Não suportado neste navegador');
    return 'denied';
  }

  if (isPushGranted()) return 'granted';

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn('[push] Erro ao solicitar permissão:', e.message);
    return 'denied';
  }
}

/**
 * Converte a chave VAPID para Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra o Service Worker e inscreve no push.
 * @returns {Promise<boolean>}
 */
export async function subscribeToPush() {
  if (!isPushSupported() || !isPushGranted()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Verificar se já existe inscrição
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[push] Já inscrito');
      await saveSubscription(existingSubscription);
      return true;
    }

    // Criar nova inscrição
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('[push] Inscrito com sucesso');
    await saveSubscription(subscription);
    return true;
  } catch (e) {
    console.warn('[push] Erro ao inscrever:', e.message);
    return false;
  }
}

/**
 * Salva a inscrição no Supabase.
 */
async function saveSubscription(subscription) {
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  const p256dh = btoa(String.fromCharCode.apply(null,
    new Uint8Array(subscription.getKey('p256dh'))));
  const auth = btoa(String.fromCharCode.apply(null,
    new Uint8Array(subscription.getKey('auth'))));

  try {
    const { error } = await getSupabase()
      .from('push_subscriptions')
      .upsert({
        device_id: getDeviceId(),
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' });

    if (error) console.warn('[push] save error:', error.message);
    else console.log('[push] Salvo no Supabase ✓');
  } catch (e) {
    console.warn('[push] save offline:', e.message);
  }
}

/**
 * Remove a inscrição do push.
 * @returns {Promise<boolean>}
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('[push] Desinscrito');
    }

    // Remover do Supabase
    const { error } = await getSupabase()
      .from('push_subscriptions')
      .delete()
      .eq('device_id', getDeviceId());

    if (error) console.warn('[push] delete error:', error.message);

    return true;
  } catch (e) {
    console.warn('[push] unsubscribe error:', e.message);
    return false;
  }
}

/**
 * Inicializa o serviço de push (chamar no boot do app).
 * Se já tiver permissão, tenta inscrever automaticamente.
 */
export async function initPush() {
  if (!isPushSupported()) return;

  if (isPushGranted()) {
    await subscribeToPush();
  }
}