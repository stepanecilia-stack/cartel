import { isFirebaseConfigured } from '../services/firebaseService.js'

/**
 * Gemini через Cloud Functions включён?
 * - VITE_PORTAL_PERSONA_AI=0 → принудительно выкл.
 * - иначе при настроенном Firebase → вкл. (локально и на production).
 */
export function isPortalPersonaAiRemoteEnabled() {
  const flag = String(import.meta.env.VITE_PORTAL_PERSONA_AI ?? '').trim()
  if (flag === '0') return false
  return isFirebaseConfigured
}

/** @typedef {'ai' | 'script' | 'script-fallback'} PortalPersonaReplySource */

/**
 * @param {PortalPersonaReplySource} source
 */
export function portalPersonaReplySourceLabel(source) {
  if (source === 'ai') return 'Живой ответ (Gemini)'
  if (source === 'script-fallback') return 'Запасной ответ — Gemini недоступен или ответ отклонён'
  return 'Скриптовый режим — AI выключен'
}
