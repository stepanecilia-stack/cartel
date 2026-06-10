import { ensureAuth, firebaseConfig, isFirebaseConfigured } from './firebaseService.js'
import { isPortalPersonaAiRemoteEnabled } from '../utils/portalPersonaAiConfig.js'

/** @type {Promise<string> | null} */
let pendingTranscribe = null
/** @type {string | null} */
let pendingTranscribeKey = null
/** @type {Promise<string> | null} */
let cachedIdTokenPromise = null

/**
 * @param {Blob} blob
 */
function blobCacheKey(blob) {
  return `${blob.size}:${blob.type}`
}

/**
 * @param {Blob} blob
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Не удалось прочитать аудио'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать аудио'))
    reader.readAsDataURL(blob)
  })
}

async function getIdTokenFast() {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const user = ensureAuth().currentUser
  if (!user) throw new Error('Войдите как тренер.')
  if (!cachedIdTokenPromise) {
    cachedIdTokenPromise = user.getIdToken().finally(() => {
      window.setTimeout(() => {
        cachedIdTokenPromise = null
      }, 50_000)
    })
  }
  return cachedIdTokenPromise
}

/** Прогрев токена — вызывать при открытии чата / старте записи. */
export function prewarmTranscribeAuth() {
  if (!isFirebaseConfigured || !isPortalPersonaAiRemoteEnabled()) return
  void getIdTokenFast().catch(() => {})
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
 * @param {string} [browserTranscript]
 */
async function transcribeViaCloud(blob, browserTranscript = '') {
  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1'
  const projectId = firebaseConfig.projectId
  const dedicatedUrl = `https://${region}-${projectId}.cloudfunctions.net/coachAssistantTranscribe`
  const portalUrl = `https://${region}-${projectId}.cloudfunctions.net/portalPersonaChat`

  const [idToken, audioBase64] = await Promise.all([getIdTokenFast(), blobToBase64(blob)])
  const mimeType = blob.type || 'audio/webm'

  const attempts = [
    { url: dedicatedUrl, mode: /** @type {const} */ ('dedicated') },
    { url: portalUrl, mode: /** @type {const} */ ('portal') },
  ]

  let lastError = new Error('Не удалось распознать голос')
  for (const { url, mode } of attempts) {
    try {
      return await postTranscribeRequest(url, idToken, audioBase64, mimeType, mode)
    } catch (err) {
      console.warn(`[coachVoiceTranscribe] ${mode} failed`, err)
      lastError = err instanceof Error ? err : new Error(String(err))
      if (browserTranscript.length >= 2) return browserTranscript
    }
  }
  throw lastError
}

function clearPendingTranscribe() {
  pendingTranscribe = null
  pendingTranscribeKey = null
}

/**
 * Запускает облачную расшифровку заранее (на этапе превью).
 * @param {Blob} blob
 * @param {{ browserTranscript?: string }} [options]
 */
export function startTranscribeEarly(blob, options = {}) {
  if (!blob || blob.size < 64) return
  const local = String(options.browserTranscript ?? '').trim()
  if (local.length >= 2) {
    clearPendingTranscribe()
    return
  }
  if (!isPortalPersonaAiRemoteEnabled()) return

  const key = blobCacheKey(blob)
  if (pendingTranscribeKey === key && pendingTranscribe) return

  pendingTranscribeKey = key
  pendingTranscribe = transcribeViaCloud(blob, local).catch((err) => {
    clearPendingTranscribe()
    throw err
  })
  prewarmTranscribeAuth()
}

/**
 * @param {Blob} blob
 * @param {{ browserTranscript?: string }} [options]
 */
export async function transcribeCoachVoice(blob, options = {}) {
  const local = String(options.browserTranscript ?? '').trim()
  if (local.length >= 2) {
    clearPendingTranscribe()
    return local
  }

  if (!blob || blob.size < 64) {
    throw new Error('Запись слишком короткая. Удерживайте кнопку и говорите чуть дольше.')
  }

  const key = blobCacheKey(blob)
  if (pendingTranscribeKey === key && pendingTranscribe) {
    try {
      return await pendingTranscribe
    } finally {
      clearPendingTranscribe()
    }
  }

  if (isPortalPersonaAiRemoteEnabled()) {
    try {
      return await transcribeViaCloud(blob, local)
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
