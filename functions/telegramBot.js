import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import {
  appendTelegramChatMessage,
  consumeLinkToken,
  displayName,
  getCoachIdByTelegramUser,
  getCoachProfile,
  getCoachStudents,
  getTelegramSession,
  STUDENTS_PAGE_SIZE,
  updateTelegramSession,
} from './telegramCoachData.js'
import {
  buildReadOnlyReply,
  formatPendingNorms,
  formatStudentSummary,
  getNormsCached,
  resolveActiveStudent,
} from './telegramCoachAssistant.js'
import { layoutButtonsInTwoColumns, sendTelegramMessage, telegramApi } from './telegramApi.js'
import { menuExtra, parseMenuAction, setupBotMenu } from './telegramMenu.js'
import { getGroupTrainingSession } from './groupTrainingSessionData.js'
import {
  buildGroupTrainingStats,
  buildMuscleGroupPickerKeyboard,
  buildMuscleGroupPickerMessage,
  buildMuscleGroupResultKeyboard,
  getMuscleGroup,
  recommendGroupExercise,
} from './telegramGroupExercises.js'
import {
  buildTrainingProgressKeyboard,
  endTrainingFromTelegram,
  refreshTrainingRosterMessage,
  sendGroupTechniqueSummary,
  sendTrainingRoster,
  toggleTrainingStudent,
} from './telegramGroupTraining.js'

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN')

const HELP_TEXT = [
  '<b>Cartel — помощник тренера</b>',
  'Режим: <b>только чтение</b> карточек. Запись в базу из Telegram отключена.',
  '',
  'Кнопки меню:',
  '🏋️ Тренировка — состав группы и техника (синхрон с приложением)',
  '👤 Ученики — выбрать одного для сводки',
  '📋 Сводка / 📊 Нормативы — по выбранному ученику',
  '',
  'Ползунки прогресса на тренировке — в приложении Cartel.',
  'После старта тренировки — 📋 Упражнения: выбор группы мышц (ноги, кор, спина…), подбор через поиск Google.',
].join('\n')

/**
 * @param {object[]} students
 * @param {number} page
 */
const STUDENT_BTN_LABEL_MAX = 26

function buildStudentKeyboard(students, page = 0) {
  const start = page * STUDENTS_PAGE_SIZE
  const slice = students.slice(start, start + STUDENTS_PAGE_SIZE)
  const studentButtons = slice.map((s) => ({
    text: displayName(s).slice(0, STUDENT_BTN_LABEL_MAX),
    callback_data: `stu:${s.id}`,
  }))
  const rows = layoutButtonsInTwoColumns(studentButtons)
  const nav = []
  if (page > 0) nav.push({ text: '← Назад', callback_data: `page:${page - 1}` })
  if (start + STUDENTS_PAGE_SIZE < students.length) {
    nav.push({ text: 'Далее →', callback_data: `page:${page + 1}` })
  }
  if (nav.length) rows.push(nav)
  return { inline_keyboard: rows }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {object[]} students
 * @param {number} [page]
 */
async function sendStudentPicker(token, chatId, students, page = 0) {
  if (!students.length) {
    await sendTelegramMessage(token, chatId, 'В списке пока нет учеников.', menuExtra())
    return
  }
  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: `Кого обсуждаем? (стр. ${page + 1})`,
    reply_markup: buildStudentKeyboard(students, page),
  })
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} text
 */
async function sendCoachMessage(token, chatId, text) {
  await sendTelegramMessage(token, chatId, text, menuExtra())
}

/**
 * @param {string} token
 * @param {Record<string, unknown>} update
 */
async function processTelegramUpdate(token, update) {
  if (update.callback_query) {
    await handleCallback(token, update.callback_query)
    return
  }

  const message = update.message ?? update.edited_message
  if (!message?.chat?.id) return

  const chatId = message.chat.id
  const telegramUserId = String(message.from?.id ?? '')
  const text = String(message.text ?? '').trim()

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/)
    const linkToken = parts[1]?.trim()
    if (linkToken) {
      const result = await consumeLinkToken(linkToken, telegramUserId, chatId)
      if (!result.ok) {
        await sendTelegramMessage(token, chatId, result.error ?? 'Ошибка привязки.')
        return
      }
      try {
        await setupBotMenu(token)
      } catch (menuErr) {
        console.warn('setupBotMenu on link', menuErr)
      }
      const profile = await getCoachProfile(result.coachId)
      const coachName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
      await sendCoachMessage(
        token,
        chatId,
        `Аккаунт Cartel привязан${coachName ? `: ${coachName}` : ''}.\n\n${HELP_TEXT}`,
      )
      return
    }

    const coachId = await getCoachIdByTelegramUser(telegramUserId)
    if (coachId) {
      await sendCoachMessage(token, chatId, `Снова на связи.\n\n${HELP_TEXT}`)
      return
    }
    await sendTelegramMessage(
      token,
      chatId,
      'Откройте приложение Cartel → Помощник → «Подключить Telegram» и нажмите Start по ссылке.',
    )
    return
  }

  const coachId = await getCoachIdByTelegramUser(telegramUserId)
  if (!coachId) {
    await sendTelegramMessage(
      token,
      chatId,
      'Сначала привяжите аккаунт через приложение Cartel (кнопка «Подключить Telegram»).',
    )
    return
  }

  const menuAction = parseMenuAction(text)

  if (menuAction === 'help') {
    await sendCoachMessage(token, chatId, HELP_TEXT)
    return
  }

  if (menuAction === 'training') {
    const result = await sendTrainingRoster(token, chatId, coachId, 0)
    if (result.empty) {
      await sendCoachMessage(token, chatId, 'В списке пока нет учеников.')
    }
    return
  }

  if (menuAction === 'student') {
    const students = await getCoachStudents(coachId)
    await sendStudentPicker(token, chatId, students, 0)
    return
  }

  const session = await getTelegramSession(coachId)
  const student = await resolveActiveStudent(coachId, session.activeStudentId)
  const allNorms = await getNormsCached()

  if (menuAction === 'summary') {
    if (!student) {
      await sendCoachMessage(token, chatId, 'Сначала выберите ученика — кнопка «👤 Ученики».')
      return
    }
    const reply = formatStudentSummary(student, allNorms)
    await appendTelegramChatMessage(coachId, 'user', text)
    await appendTelegramChatMessage(coachId, 'assistant', reply.replace(/<[^>]+>/g, ''))
    await sendCoachMessage(token, chatId, reply)
    return
  }

  if (menuAction === 'norms') {
    if (!student) {
      await sendCoachMessage(token, chatId, 'Сначала выберите ученика — кнопка «👤 Ученики».')
      return
    }
    const reply = formatPendingNorms(student, allNorms)
    await appendTelegramChatMessage(coachId, 'user', text)
    await appendTelegramChatMessage(coachId, 'assistant', reply.replace(/<[^>]+>/g, ''))
    await sendCoachMessage(token, chatId, reply)
    return
  }

  if (!text) return

  await appendTelegramChatMessage(coachId, 'user', text)
  const reply = buildReadOnlyReply(text, student, allNorms)
  await appendTelegramChatMessage(coachId, 'assistant', reply.replace(/<[^>]+>/g, ''))
  await sendCoachMessage(token, chatId, reply)
}

/**
 * @param {string} token
 * @param {Record<string, unknown>} query
 */
async function handleCallback(token, query) {
  const data = String(query.data ?? '')
  const chatId = query.message?.chat?.id
  const telegramUserId = String(query.from?.id ?? '')
  if (!chatId) return

  const coachId = await getCoachIdByTelegramUser(telegramUserId)
  if (!coachId) {
    await telegramApi(token, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Привяжите аккаунт в приложении Cartel.',
      show_alert: true,
    })
    return
  }

  if (data.startsWith('gt:')) {
    await handleTrainingCallback(token, query, coachId, data)
    return
  }

  if (data.startsWith('page:')) {
    const page = Number(data.slice(5)) || 0
    const students = await getCoachStudents(coachId)
    await telegramApi(token, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: query.message?.message_id,
      reply_markup: buildStudentKeyboard(students, page),
    })
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    return
  }

  if (data.startsWith('stu:')) {
    const studentId = data.slice(4)
    const students = await getCoachStudents(coachId)
    const student = students.find((s) => s.id === studentId)
    if (!student) {
      await telegramApi(token, 'answerCallbackQuery', {
        callback_query_id: query.id,
        text: 'Ученик не найден.',
        show_alert: true,
      })
      return
    }
    await updateTelegramSession(coachId, { activeStudentId: studentId })
    const allNorms = await getNormsCached()
    const summary = formatStudentSummary(student, allNorms)
    await telegramApi(token, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: `Выбран: ${displayName(student)}`,
    })
    await sendCoachMessage(
      token,
      chatId,
      `Обсуждаем: <b>${displayName(student).replace(/</g, '')}</b>\n\n${summary}`,
    )
    return
  }

  await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
}

/**
 * @param {string} token
 * @param {Record<string, unknown>} query
 * @param {string} coachId
 * @param {string} data
 */
async function handleTrainingCallback(token, query, coachId, data) {
  const chatId = query.message?.chat?.id
  const messageId = query.message?.message_id
  if (!chatId || !messageId) {
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    return
  }

  const students = await getCoachStudents(coachId)

  if (data === 'gt:go') {
    const text = await sendGroupTechniqueSummary(token, chatId, coachId)
    if (typeof text === 'string' && text.startsWith('Сначала')) {
      await telegramApi(token, 'answerCallbackQuery', {
        callback_query_id: query.id,
        text,
        show_alert: true,
      })
      return
    }
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: buildTrainingProgressKeyboard(),
      disable_web_page_preview: true,
    })
    return
  }

  if (data === 'gt:ex:back') {
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    await telegramApi(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: 'Выбор упражнения закрыт.',
      parse_mode: 'HTML',
    })
    return
  }

  if (data === 'gt:ex') {
    const session = await getGroupTrainingSession(coachId)
    if (session?.phase !== 'progress' || !session.selectedIds?.length) {
      await telegramApi(token, 'answerCallbackQuery', {
        callback_query_id: query.id,
        text: 'Сначала начните тренировку',
        show_alert: true,
      })
      return
    }
    const stats = buildGroupTrainingStats(students, session.selectedIds)
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: buildMuscleGroupPickerMessage(stats),
      parse_mode: 'HTML',
      reply_markup: buildMuscleGroupPickerKeyboard(),
      disable_web_page_preview: true,
    })
    return
  }

  if (data.startsWith('gt:mg:')) {
    const session = await getGroupTrainingSession(coachId)
    if (session?.phase !== 'progress' || !session.selectedIds?.length) {
      await telegramApi(token, 'answerCallbackQuery', {
        callback_query_id: query.id,
        text: 'Сначала начните тренировку',
        show_alert: true,
      })
      return
    }
    const muscleGroupId = data.slice(6)
    const muscleGroup = getMuscleGroup(muscleGroupId)
    if (!muscleGroup) {
      await telegramApi(token, 'answerCallbackQuery', {
        callback_query_id: query.id,
        text: 'Неизвестная группа мышц',
        show_alert: true,
      })
      return
    }
    await telegramApi(token, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: `Подбираю для «${muscleGroup.label}»…`,
    })
    await telegramApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {})
    const messages = await recommendGroupExercise(students, session.selectedIds, muscleGroupId)
    for (let i = 0; i < messages.length; i += 1) {
      await telegramApi(token, 'sendMessage', {
        chat_id: chatId,
        text: messages[i],
        parse_mode: 'HTML',
        reply_markup: i === messages.length - 1 ? buildMuscleGroupResultKeyboard() : undefined,
        disable_web_page_preview: true,
      })
    }
    return
  }

  if (data === 'gt:end') {
    await endTrainingFromTelegram(coachId)
    await telegramApi(token, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Тренировка завершена',
    })
    await telegramApi(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: 'Тренировка завершена. Нажмите 🏋️ Тренировка в меню, чтобы начать снова.',
      parse_mode: 'HTML',
    })
    return
  }

  if (data.startsWith('gt:pg:')) {
    const page = Number(data.slice(6)) || 0
    await refreshTrainingRosterMessage(token, chatId, messageId, coachId, page)
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    return
  }

  if (data.startsWith('gt:t:')) {
    const parts = data.split(':')
    const page = Number(parts[2]) || 0
    const studentId = parts.slice(3).join(':')
    await toggleTrainingStudent(coachId, studentId, students, page)
    await refreshTrainingRosterMessage(token, chatId, messageId, coachId, page)
    await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
    return
  }

  await telegramApi(token, 'answerCallbackQuery', { callback_query_id: query.id })
}

export const telegramCoachWebhook = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    invoker: 'public',
    secrets: [telegramBotToken],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const token = telegramBotToken.value()
      const update = req.body
      if (!update || typeof update !== 'object') {
        res.status(400).send('Bad update')
        return
      }
      await processTelegramUpdate(token, update)
      res.status(200).json({ ok: true })
    } catch (err) {
      console.error('telegramCoachWebhook', err)
      res.status(200).json({ ok: true })
    }
  },
)

export const telegramCreateLinkToken = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    invoker: 'public',
    cors: false,
  },
  async (req, res) => {
    const origin = req.headers.origin
    const allowed = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https:\/\/cartel-academy\.web\.app$/,
      /^https:\/\/cartel-academy\.firebaseapp\.com$/,
      /^https:\/\/[\w-]+\.vercel\.app$/,
    ]
    if (origin && allowed.some((r) => r.test(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method-not-allowed' })
      return
    }

    try {
      const { getAuth } = await import('firebase-admin/auth')
      const { createLinkToken } = await import('./telegramCoachData.js')

      const authHeader = req.headers.authorization ?? ''
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!idToken) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }
      const decoded = await getAuth().verifyIdToken(idToken)
      const coachId = decoded.uid
      const link = await createLinkToken(coachId)
      res.status(200).json({
        url: link.url,
        botUsername: 'CartelCoachBot',
        expiresAt: link.expiresAt,
      })
    } catch (err) {
      console.error('telegramCreateLinkToken', err)
      res.status(500).json({
        error: 'internal',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  },
)

export const telegramSetupWebhook = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 3,
    invoker: 'public',
    secrets: [telegramBotToken],
  },
  async (req, res) => {
    const origin = req.headers.origin
    const allowed = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https:\/\/cartel-academy\.web\.app$/,
      /^https:\/\/cartel-academy\.firebaseapp\.com$/,
      /^https:\/\/[\w-]+\.vercel\.app$/,
    ]
    if (origin && allowed.some((r) => r.test(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method-not-allowed' })
      return
    }

    try {
      const { getAuth } = await import('firebase-admin/auth')
      const authHeader = req.headers.authorization ?? ''
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!idToken) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }
      await getAuth().verifyIdToken(idToken)

      const webhookUrl = String(req.body?.webhookUrl ?? '').trim()
      if (!webhookUrl.startsWith('https://')) {
        res.status(400).json({ error: 'invalid-argument', detail: 'webhookUrl required' })
        return
      }

      const token = telegramBotToken.value()
      const result = await telegramApi(token, 'setWebhook', {
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message', 'callback_query'],
        drop_pending_updates: true,
      })
      await setupBotMenu(token)
      res.status(200).json({ ok: true, result })
    } catch (err) {
      console.error('telegramSetupWebhook', err)
      res.status(500).json({
        error: 'internal',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  },
)
