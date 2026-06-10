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
 * @param {unknown} err
 * @param {Response | null} response
 */
function mapTranscribeError(err, response) {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  if (raw === 'Load failed' || /failed to fetch|networkerror/i.test(raw)) {
    return new Error(
      'Не удалось связаться с сервером расшифровки. Проверьте интернет и обновите страницу. Если не помогло — задеплойте Firebase Functions.',
    )
  }
  if (response?.status === 404) {
    return new Error(
      'Расшифровка голоса на сервере не настроена. Задеплойте functions (portalPersonaChat или coachAssistantTranscribe).',
    )
  }
  if (raw) return err instanceof Error ? err : new Error(raw)
  return new Error('Не удалось распознать голосовое сообщение')
}

/**
 * @param {string} url
 * @param {string} idToken
 * @param {string} audioBase64
 * @param {string} mimeType
 * @param {'dedicated' | 'portal'} mode
 */
async function postTranscribeRequest(url, idToken, audioBase64, mimeType, mode) {
  const body =
    mode === 'portal'
      ? {
          context: 'coach_voice_transcribe',
          audioBase64,
          mimeType,
        }
      : { audioBase64, mimeType }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw mapTranscribeError(err, null)
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    const detail = data?.detail || data?.error || response.statusText
    throw mapTranscribeError(new Error(String(detail)), response)
  }
  const text = String(data?.text ?? '').trim()
  if (!text) throw new Error('Пустая расшифровка — повторите громче и чётче')
  return text
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
  const dedicatedUrl = `https://${region}-${projectId}.cloudfunctions.net/coachAssistantTranscribe`
  const portalUrl = `https://${region}-${projectId}.cloudfunctions.net/portalPersonaChat`
  const idToken = await user.getIdToken()
  const audioBase64 = await blobToBase64(blob)
  const mimeType = blob.type || 'audio/webm'

  const attempts = [
    { url: portalUrl, mode: /** @type {const} */ ('portal') },
    { url: dedicatedUrl, mode: /** @type {const} */ ('dedicated') },
  ]

  let lastError = new Error('Не удалось распознать голос')
  for (const { url, mode } of attempts) {
    try {
      return await postTranscribeRequest(url, idToken, audioBase64, mimeType, mode)
    } catch (err) {
      console.warn(`[coachVoiceTranscribe] ${mode} failed`, err)
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError
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
    'Браузер не распознал речь. Используйте Chrome или включите Gemini (Firebase) для облачной расшифровки.',
  )
}
