'use strict';

/**
 * Log centralizado de erros para diagnóstico rápido no mobile.
 * @param {string} context - Contexto/Módulo onde ocorreu o erro.
 * @param {Error|string} error - O erro capturado.
 */
export function logError(context, error) {
  const message = error?.message || error;
  console.warn(`[${context}]`, message);
  
  // No futuro, podemos enviar para uma tabela 'client_errors' no Supabase
}
