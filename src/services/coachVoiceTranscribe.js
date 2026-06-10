import { ensureAuth, firebaseConfig, isFirebaseConfigured } from './firebaseService.js'
import { isPortalPersonaAiRemoteEnabled } from '../utils/portalPersonaAiConfig.js'

/**
 * @param {Blob} blob
 */
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * @param {Blob} blob
 */
async function transcribeViaCloud(blob) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const auth = ensureAuth()
  const user = auth.currentUser
  if (!user) throw new Error('Войдите как тренер.')

  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1'
  const projectId = firebaseConfig.projectId
  const url = `https://${region}-${projectId}.cloudfunctions.net/coachAssistantTranscribe`
  const idToken = await user.getIdToken()
  const audioBase64 = await blobToBase64(blob)
  const mimeType = blob.type || 'audio/webm'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ audioBase64, mimeType }),
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || response.statusText)
  }
  const text = String(data?.text ?? '').trim()
  if (!text) throw new Error('Пустая расшифровка')
  return text
}

/**
 * @param {Blob} blob
 * @param {{ browserTranscript?: string }} [options]
 */
export async function transcribeCoachVoice(blob, options = {}) {
  const local = String(options.browserTranscript ?? '').trim()
  if (local.length >= 2) return local

  if (!blob || blob.size < 800) {
    throw new Error('Запись слишком короткая. Удерживайте кнопку и говорите чуть дольше.')
  }

  if (isPortalPersonaAiRemoteEnabled()) {
    try {
      return await transcribeViaCloud(blob)
    } catch (err) {
      console.warn('[coachVoiceTranscribe] cloud failed', err)
      if (local) return local
      throw err instanceof Error ? err : new Error('Не удалось распознать голос')
    }
  }

  if (local) return local
  throw new Error(
    'Не удалось распознать речь в браузере. Включите Gemini (Firebase) или повторите громче.',
  )
}
