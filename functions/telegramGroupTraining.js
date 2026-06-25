import { getFirestore } from 'firebase-admin/firestore'
import {
  deleteGroupTrainingSession,
  getGroupTrainingSession,
  setGroupTrainingPhase,
  updateGroupTrainingRoster,
} from './groupTrainingSessionData.js'
import { displayName, getCoachStudents, STUDENTS_PAGE_SIZE } from './telegramCoachData.js'
import { loadTechnicalProgramBundle } from './telegramTechnicalProgram.js'
import {
  buildStudentTechniqueProgress,
  escapeTelegramHtml,
  formatStudentTechniqueBlock,
} from './telegramTechnicalProgress.js'
import { layoutButtonsInTwoColumns, sendTelegramMessage, telegramApi } from './telegramApi.js'
import { menuExtra } from './telegramMenu.js'

const ROSTER_PAGE_SIZE = STUDENTS_PAGE_SIZE
const ROSTER_BTN_LABEL_MAX = 24

/** Клавиатура после старта тренировки (фаза progress). */
export function buildTrainingProgressKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📋 Упражнения', callback_data: 'gt:ex' }],
      [{ text: '✕ Завершить', callback_data: 'gt:end' }],
    ],
  }
}

/**
 * @param {object[]} students
 * @param {Set<string>} selectedIds
 * @param {number} page
 */
export function buildTrainingRosterKeyboard(students, selectedIds, page = 0) {
  const start = page * ROSTER_PAGE_SIZE
  const slice = students.slice(start, start + ROSTER_PAGE_SIZE)
  const studentButtons = slice.map((s) => {
    const mark = selectedIds.has(s.id) ? '✅' : '⬜'
    const label = `${mark} ${displayName(s)}`.slice(0, ROSTER_BTN_LABEL_MAX)
    return { text: label, callback_data: `gt:t:${page}:${s.id}` }
  })
  const rows = layoutButtonsInTwoColumns(studentButtons)

  const nav = []
  if (page > 0) nav.push({ text: '← Назад', callback_data: `gt:pg:${page - 1}` })
  if (start + ROSTER_PAGE_SIZE < students.length) {
    nav.push({ text: 'Далее →', callback_data: `gt:pg:${page + 1}` })
  }
  if (nav.length) rows.push(nav)

  if (selectedIds.size > 0) {
    rows.push([{ text: '▶ Начать тренировку', callback_data: 'gt:go' }])
  }

  rows.push([{ text: '✕ Завершить', callback_data: 'gt:end' }])

  return { inline_keyboard: rows }
}

/**
 * @param {object[]} students
 * @param {string[]} selectedIds
 * @param {number} page
 */
export function rosterMessageText(students, selectedIds, page = 0) {
  const total = students.length
  const picked = selectedIds.length
  return [
    '<b>🏋️ Групповая тренировка</b>',
    '',
    'Отметьте присутствующих. Состав синхронизируется с приложением Cartel.',
    '',
    `Выбрано: <b>${picked}</b> из ${total} (стр. ${page + 1})`,
  ].join('\n')
}

/**
 * @param {object[]} students
 * @param {string[]} confirmedIds
 * @param {string[]} pendingFragments
 * @param {number} page
 * @param {{ removedNames?: string[], addedNames?: string[] }} [meta]
 */
export function formatComposeRosterMessage(students, confirmedIds, pendingFragments, page = 0, meta = {}) {
  let text = rosterMessageText(students, confirmedIds, page)
  if (pendingFragments.length) {
    text += `\n\n<b>Не нашёл в базе:</b>\n${pendingFragments
      .map((frag) => `❓ «${escapeTelegramHtml(frag)}»`)
      .join('\n')}`
  }
  if (meta.removedNames?.length) {
    text += `\n\n<b>Убрал:</b>\n${meta.removedNames.map((n) => `➖ ${escapeTelegramHtml(n)}`).join('\n')}`
  }
  if (meta.addedNames?.length) {
    text += `\n\n<b>Добавил:</b>\n${meta.addedNames.map((n) => `➕ ${escapeTelegramHtml(n)}`).join('\n')}`
  }
  return text
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {{ confirmedIds?: string[], pendingFragments?: string[], page?: number, meta?: object }} [options]
 */
export async function sendComposeRosterReply(token, chatId, coachId, options = {}) {
  const confirmedIds = options.confirmedIds ?? []
  const pendingFragments = options.pendingFragments ?? []
  const page = options.page ?? 0
  const meta = options.meta ?? {}
  const students = await getCoachStudents(coachId)

  if (confirmedIds.length > 0) {
    await updateGroupTrainingRoster(coachId, confirmedIds, 'compose')
  }

  const text = formatComposeRosterMessage(students, confirmedIds, pendingFragments, page, meta)
  await sendTelegramMessage(token, chatId, text, {
    ...menuExtra(),
    reply_markup: buildTrainingRosterKeyboard(students, new Set(confirmedIds), page),
    disable_web_page_preview: true,
  })
}

/**
 * @param {string} coachId
 * @param {object[]} students
 * @param {string[]} selectedIds
 */
export async function formatGroupTechniqueSummary(coachId, students, selectedIds) {
  const program = await loadTechnicalProgramBundle(getFirestore())
  const idSet = new Set(selectedIds)
  const roster = students.filter((s) => idSet.has(s.id))

  if (!roster.length) {
    return 'Никого не выбрано. Отметьте учеников на тренировке.'
  }

  const blocks = []
  for (const student of roster) {
    const progress = buildStudentTechniqueProgress(student, program)
    blocks.push(formatStudentTechniqueBlock(displayName(student), progress))
  }

  const header = [
    `<b>🏋️ Техника — ${roster.length} ученик${roster.length === 1 ? '' : roster.length < 5 ? 'а' : 'ов'}</b>`,
    '',
  ].join('\n')

  const footer = '\n\n<i>Запись прогресса в карточки — только из приложения Cartel.</i>'

  return header + blocks.join('\n\n') + footer
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {number} [page]
 */
export async function sendTrainingRoster(token, chatId, coachId, page = 0) {
  const students = await getCoachStudents(coachId)
  const session = await getGroupTrainingSession(coachId)
  const selectedIds = session?.selectedIds ?? []
  const selectedSet = new Set(selectedIds)

  if (!students.length) {
    return { empty: true }
  }

  if (session?.phase === 'progress' && selectedIds.length > 0) {
    const text = await formatGroupTechniqueSummary(coachId, students, selectedIds)
    await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: buildTrainingProgressKeyboard(),
      disable_web_page_preview: true,
    })
    return { empty: false }
  }

  if (!session && selectedIds.length === 0) {
    await updateGroupTrainingRoster(coachId, [], 'compose')
  }

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: rosterMessageText(students, selectedIds, page),
    parse_mode: 'HTML',
    reply_markup: buildTrainingRosterKeyboard(students, selectedSet, page),
    disable_web_page_preview: true,
  })
  return { empty: false }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {number} messageId
 * @param {string} coachId
 * @param {number} page
 */
export async function refreshTrainingRosterMessage(token, chatId, messageId, coachId, page) {
  const students = await getCoachStudents(coachId)
  const session = await getGroupTrainingSession(coachId)
  const selectedIds = session?.selectedIds ?? []
  const selectedSet = new Set(selectedIds)

  await telegramApi(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: rosterMessageText(students, selectedIds, page),
    parse_mode: 'HTML',
    reply_markup: buildTrainingRosterKeyboard(students, selectedSet, page),
    disable_web_page_preview: true,
  })
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 */
export async function sendGroupTechniqueSummary(token, chatId, coachId) {
  const students = await getCoachStudents(coachId)
  const session = await getGroupTrainingSession(coachId)
  const selectedIds = session?.selectedIds ?? []
  if (!selectedIds.length) {
    return 'Сначала отметьте учеников на тренировке.'
  }
  await setGroupTrainingPhase(coachId, 'progress')
  const text = await formatGroupTechniqueSummary(coachId, students, selectedIds)
  return text
}

/**
 * @param {string} coachId
 * @param {string} studentId
 * @param {object[]} students
 * @param {number} page
 */
export async function toggleTrainingStudent(coachId, studentId, students, page) {
  const session = await getGroupTrainingSession(coachId)
  const selected = new Set(session?.selectedIds ?? [])
  if (selected.has(studentId)) selected.delete(studentId)
  else selected.add(studentId)
  await updateGroupTrainingRoster(coachId, selected, 'compose')
  return {
    students,
    selectedIds: [...selected],
    page,
  }
}

/**
 * @param {string} coachId
 */
export async function endTrainingFromTelegram(coachId) {
  await deleteGroupTrainingSession(coachId)
}
