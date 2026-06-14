/**
 * Яндекс SpeechKit — синхронное распознавание коротких голосовых (OGG Opus из Telegram).
 * @see https://cloud.yandex.ru/docs/speechkit/stt/api/request-api
 */

const STT_URL = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize'

/**
 * @param {Buffer | Uint8Array} audioBuffer
 * @param {{ apiKey: string, lang?: string }} options
 * @returns {Promise<string>}
 */
export async function transcribeOggOpus(audioBuffer, options) {
  const apiKey = String(options?.apiKey ?? '').trim()
  if (!apiKey) {
    throw new Error('SpeechKit: API key not configured')
  }
  if (!audioBuffer?.length) {
    throw new Error('SpeechKit: empty audio')
  }

  const params = new URLSearchParams({
    lang: options.lang ?? 'ru-RU',
    format: 'oggopus',
    topic: 'general',
  })

  const res = await fetch(`${STT_URL}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBuffer,
  })

  const raw = await res.text()
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    data = { error: raw }
  }

  if (!res.ok) {
    const msg =
      data?.error_message ||
      data?.error?.message ||
      data?.error ||
      raw ||
      res.statusText
    throw new Error(`SpeechKit ${res.status}: ${msg}`)
  }

  return String(data?.result ?? '').trim()
}

/** @param {string | undefined | null} apiKey */
export function isSpeechKitConfigured(apiKey) {
  return Boolean(String(apiKey ?? '').trim())
}
