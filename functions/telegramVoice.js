import { displayName, getCoachStudents } from './telegramCoachData.js'
import { downloadTelegramFile, telegramApi } from './telegramApi.js'
import { isSpeechKitConfigured, transcribeOggOpus } from './yandexSpeechKit.js'

/**
 * Имена учеников тренера (для будущих STT-hints; v1 REST без custom dictionary).
 * @param {object[]} students
 */
export function buildStudentNameHints(students) {
  const names = new Set()
  for (const student of students ?? []) {
    const name = displayName(student).trim()
    if (name && name !== '—' && name !== 'Без имени') names.add(name)
    const first = String(student.firstName ?? '').trim()
    const last = String(student.lastName ?? '').trim()
    if (first) names.add(first)
    if (last) names.add(last)
  }
  return [...names].slice(0, 60)
}

/**
 * @param {string} token
 * @param {{ file_id?: string }} voice
 * @param {string} speechKitApiKey
 * @returns {Promise<string | null>}
 */
export async function transcribeTelegramVoiceMessage(token, voice, speechKitApiKey) {
  if (!voice?.file_id) return null
  if (!isSpeechKitConfigured(speechKitApiKey)) {
    throw new Error('SpeechKit not configured')
  }
  const audio = await downloadTelegramFile(token, voice.file_id)
  return transcribeOggOpus(audio, { apiKey: speechKitApiKey })
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {{ file_id?: string }} voice
 * @param {string} speechKitApiKey
 * @param {(transcript: string) => Promise<void>} onTranscript
 */
export async function handleTelegramVoiceMessage(token, chatId, coachId, voice, speechKitApiKey, onTranscript) {
  if (!voice?.file_id) return

  if (!isSpeechKitConfigured(speechKitApiKey)) {
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text:
        'Голосовые сообщения пока не настроены (YANDEX_SPEECHKIT_API_KEY). Напишите текстом или используйте кнопки меню.',
    })
    return
  }

  await telegramApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {})

  try {
    await getCoachStudents(coachId)
    const transcript = await transcribeTelegramVoiceMessage(token, voice, speechKitApiKey)
    if (!transcript) {
      await telegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: 'Не удалось распознать речь. Попробуйте короче или напишите текстом.',
      })
      return
    }
    await onTranscript(transcript)
  } catch (err) {
    console.error('handleTelegramVoiceMessage', err)
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Ошибка распознавания голоса. Напишите текстом.',
    })
  }
}
