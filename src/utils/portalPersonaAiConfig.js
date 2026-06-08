import { isFirebaseConfigured } from '../services/firebaseService.js'

/**
 * Gemini через Cloud Functions включён?
 * - VITE_PORTAL_PERSONA_AI=1 → явно вкл.
 * - VITE_PORTAL_PERSONA_AI=0 → явно выкл.
 * - иначе на production-сборке с Firebase → вкл. (чтобы не забыть флаг на Vercel).
 */
export function isPortalPersonaAiRemoteEnabled() {
  const flag = String(import.meta.env.VITE_PORTAL_PERSONA_AI ?? '').trim()
  if (flag === '0') return false
  if (flag === '1') return isFirebaseConfigured
  return Boolean(import.meta.env.PROD && isFirebaseConfigured)
}

/** @typedef {'ai' | 'script' | 'script-fallback'} PortalPersonaReplySource */

/**
 * @param {PortalPersonaReplySource} source
 */
export function portalPersonaReplySourceLabel(source) {
  if (source === 'ai') return 'Живой ответ (Gemini)'
  if (source === 'script-fallback') return 'Запасной режим — Gemini недоступен'
  return 'Скриптовый режим — AI не включён в сборке'
}
