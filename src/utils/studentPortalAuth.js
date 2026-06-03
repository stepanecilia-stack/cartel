import { STUDENT_PORTAL_CONSENT_VERSION } from '../constants/studentPortalConsent.js'

const PIN_LEN = 4

export function normalizePortalShortIdInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 6)
  if (digits.length < 6) return null
  const n = Number(digits)
  if (!Number.isFinite(n) || n < 100000 || n > 999999) return null
  return String(n)
}

export function normalizePortalPinInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, PIN_LEN)
  if (digits.length < PIN_LEN) return null
  return digits
}

export function generatePortalPin() {
  return String(1000 + Math.floor(Math.random() * 9000))
}

/** Стабильный хеш PIN (не храним PIN в открытом виде в auth-документе). */
export async function hashPortalPin(pin, shortId) {
  const payload = `cartel-portal-v1:${shortId}:${pin}`
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 0
  for (let i = 0; i < payload.length; i += 1) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0
  }
  return `fallback-${shortId}-${h >>> 0}`
}

export async function verifyPortalPin(pin, shortId, pinHash) {
  if (!pinHash || typeof pinHash !== 'string') return false
  const computed = await hashPortalPin(pin, shortId)
  return computed === pinHash
}

export const PORTAL_SESSION_STORAGE_KEY = 'cartel_student_portal_v1'

export function readPortalSession() {
  try {
    const raw = sessionStorage.getItem(PORTAL_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.studentId || !parsed?.shortId) return null
    return parsed
  } catch {
    return null
  }
}

export function writePortalSession({ studentId, shortId }) {
  sessionStorage.setItem(
    PORTAL_SESSION_STORAGE_KEY,
    JSON.stringify({
      studentId,
      shortId,
      consentVersion: STUDENT_PORTAL_CONSENT_VERSION,
      at: Date.now(),
    }),
  )
}

export function clearPortalSession() {
  sessionStorage.removeItem(PORTAL_SESSION_STORAGE_KEY)
}

/** Анонимный Firebase Auth после входа ученика (не тренер). */
export function isStudentPortalFirebaseUser(user) {
  return Boolean(user?.isAnonymous)
}

export function studentPortalHomePath() {
  return readPortalSession() ? '/learn' : '/student-login'
}
