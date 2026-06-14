import { randomBytes } from 'node:crypto'
import { displayName, getCoachStudents, getTelegramSession, updateTelegramSession } from './telegramCoachData.js'
import { downloadTelegramFile, escapeTelegramHtml, telegramApi } from './telegramApi.js'
import { isSpeechKitConfigured, transcribeOggOpus } from './yandexSpeechKit.js'

const PENDING_VOICE_TTL_MS = 10 * 60 * 1000

/**
 * Имена учеников тренера — для подсказки в UI (SpeechKit v1 REST без custom dictionary).
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
 * @param {string} fileId
 */
export async function downloadTelegramVoiceOgg(token, fileId) {
  return downloadTelegramFile(token, fileId)
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {{ file_id?: string, duration?: number }} voice
 * @param {string} speechKitApiKey
 */
export async function offerVoiceTranscriptConfirmation(token, chatId, coachId, voice, speechKitApiKey) {
  if (!voice?.file_id) return

  if (!isSpeechKitConfigured(speechKitApiKey)) {
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text:
        'Голосовые сообщения пока не настроены на сервере (YANDEX_SPEECHKIT_API_KEY). Напишите текстом или используйте кнопки меню.',
    })
    return
  }

  await telegramApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {})

  let transcript = ''
  try {
    const audio = await downloadTelegramVoiceOgg(token, voice.file_id)
    const students = await getCoachStudents(coachId)
    const hints = buildStudentNameHints(students)
    transcript = await transcribeOggOpus(audio, { apiKey: speechKitApiKey })
    if (!transcript) {
      await telegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: 'Не удалось распознать речь. Попробуйте короче или напишите текстом.',
      })
      return
    }

    const pendingId = randomBytes(4).toString('hex')
    await updateTelegramSession(coachId, {
      pendingVoice: {
        id: pendingId,
        transcript,
        hintCount: hints.length,
        createdAt: Date.now(),
      },
    })

    const hintNote =
      hints.length > 0
        ? '\n\nЕсли имя или цифра неверные — «Отмена» и напишите текстом.'
        : ''

    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: `<b>Распознано:</b>\n${escapeTelegramHtml(transcript)}${hintNote}`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Обработать', callback_data: `voice:use:${pendingId}` },
            { text: 'Отмена', callback_data: 'voice:cancel' },
          ],
        ],
      },
    })
  } catch (err) {
    console.error('offerVoiceTranscriptConfirmation', err)
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Ошибка распознавания голоса. Напишите текстом.',
    })
  }
}

/**
 * @param {string} coachId
 * @param {string} pendingId
 */
export async function consumePendingVoiceTranscript(coachId, pendingId) {
  const session = await getTelegramSession(coachId)
  const pending = session?.pendingVoice
  if (!pending || typeof pending !== 'object') return null
  if (String(pending.id) !== String(pendingId)) return null
  const createdAt = Number(pending.createdAt) || 0
  if (createdAt && Date.now() - createdAt > PENDING_VOICE_TTL_MS) {
    await updateTelegramSession(coachId, { pendingVoice: null })
    return null
  }
  const transcript = String(pending.transcript ?? '').trim()
  if (!transcript) return null
  await updateTelegramSession(coachId, { pendingVoice: null })
  return transcript
}

/** @param {string} coachId */
export async function clearPendingVoiceTranscript(coachId) {
  await updateTelegramSession(coachId, { pendingVoice: null })
}
