import { displayNameFromStudent, studentIdentityFieldsFromStudent } from './studentModel.js'
import { namePartsFromStudent } from './studentNameSearch.js'
import { isBridgeDraftSendConfirmation, parseCoachAssistantMarkers } from './coachAssistantActions.js'

/**
 * @param {string} userMessage
 * @param {string} [conversationText]
 * @param {object | null} [focusStudent]
 */
export function isCoachBridgeIntent(userMessage, conversationText = '', focusStudent = null) {
  const msg = String(userMessage ?? '').toLowerCase().replace(/ё/g, 'е')
  const combined = `${msg}\n${String(conversationText ?? '').toLowerCase().replace(/ё/g, 'е')}`

  const wantsContact = /(?:^|\s)(?:напиш|напис|отправ|спрос|узна|выясн|переда)/.test(msg)
  const aboutSchedule =
    /\b(сколько\s+раз|раз\s+в\s+недел|раз\s+недел|график|тренир|заним|занят)/.test(combined)

  if (wantsContact && aboutSchedule) return true

  if (wantsContact) {
    if (/\b(ему|ей|им|ученик|кабинет|личн|портал|сообщени)\b/.test(msg)) return true
    if (focusStudent?.id && messageMentionsStudent(msg, focusStudent)) return true
    if (focusStudent?.id && /\b(напиш|узна|выясн|спроси|отправ)/.test(msg)) return true
  }

  if (/\b(выясн|узна|узнай|спроси|надо|нужно|напиш|отправ)/.test(msg) && aboutSchedule) {
    return true
  }

  return false
}

/**
 * @param {string} msg
 * @param {object} student
 */
function messageMentionsStudent(msg, student) {
  const parts = namePartsFromStudent(student)
  return parts.some((part) => {
    if (part.length < 3) return false
    const stem = part.slice(0, Math.min(part.length, 4))
    return msg.includes(part) || msg.includes(stem)
  })
}

/**
 * @param {string} userMessage
 */
export function isPronounBridgeMessage(userMessage) {
  const msg = String(userMessage ?? '').toLowerCase()
  return (
    /(?:^|\s)(?:напиш|спрос|узна|выясн|отправ|переда)/.test(msg) &&
    /\b(ему|ей)\b/.test(msg)
  )
}

/**
 * @param {object | null | undefined} focusStudent
 * @param {{ significantTokens?: string[] }} nameQuery
 */
export function focusStudentMatchesNameQuery(focusStudent, nameQuery) {
  if (!focusStudent?.id) return false
  const significant = nameQuery?.significantTokens ?? []
  if (!significant.length) return false
  const parts = namePartsFromStudent(focusStudent)
  return significant.some((qt) =>
    parts.some((part) => part === qt || part.startsWith(qt) || qt.startsWith(part)),
  )
}

/**
 * @param {object} student
 */
function studentFirstName(student) {
  const { firstName } = studentIdentityFieldsFromStudent(student)
  if (firstName) return firstName
  const display = displayNameFromStudent(student)
  const token = display.split(/\s+/).filter(Boolean)[0]
  return token || 'друг'
}

/**
 * @param {string} userMessage
 * @param {string} conversationText
 * @returns {'training_frequency' | 'generic'}
 */
export function inferCoachBridgeTopic(userMessage, conversationText = '') {
  const combined = `${userMessage}\n${conversationText}`.toLowerCase().replace(/ё/g, 'е')
  if (/\b(сколько\s+раз|раз\s+в\s+недел|раз\s+недел|график|тренир|заним|занят)/.test(combined)) {
    return 'training_frequency'
  }
  return 'generic'
}

/**
 * @param {object} student
 * @param {'training_frequency' | 'generic'} topic
 */
export function buildCoachBridgeDraftText(student, topic) {
  const first = studentFirstName(student)
  if (topic === 'training_frequency') {
    return {
      draftToStudent: `${first}, привет! Чтобы скорректировать твой план, напиши, пожалуйста, сколько раз в неделю ты планируешь тренироваться.`,
      reason: 'Уточнить график тренировок для корректировки индивидуального плана.',
    }
  }
  return {
    draftToStudent: `${first}, привет! Тренер просит уточнить детали для твоего плана — ответь, пожалуйста, в этом чате.`,
    reason: 'Запросить уточнение у ученика через кабинет.',
  }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} student
 * @param {string} reason
 */
export function formatCoachBridgeCoachReply(personaId, student, reason) {
  const name = displayNameFromStudent(student)
  if (personaId === 'gleb') {
    return `Коллега, черновик для ${name} готов. ${reason} Текст в блоке «Сообщение в кабинет» выше — нажмите «Отправить», когда всё верно.`
  }
  if (personaId === 'vasily') {
    return `Коллега, черновик для ${name} готов — ${reason} Проверь текст выше и жми «Отправить».`
  }
  return `Коллега, черновик для ${name} готов (${reason}). Проверь текст в блоке выше и нажми «Отправить».`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} focusStudent
 * @param {string[]} nameTokens
 */
export function formatBridgeWrongStudentReply(personaId, focusStudent, nameTokens = []) {
  const openName = displayNameFromStudent(focusStudent)
  const asked = nameTokens.filter(Boolean).join(' ') || 'другого ученика'
  if (personaId === 'gleb') {
    return `Сейчас открыта карточка «${openName}». По запросу «${asked}» в этом контексте ученика нет — откройте нужную карточку или уточните имя.`
  }
  return `Коллега, сейчас открыт ${openName}. «${asked}» в этой карточке нет — открой нужного ученика или назови точнее.`
}

/**
 * @param {string} studentId
 * @param {string} draftToStudent
 * @param {string} reason
 */
export function buildCoachBridgeMarker(studentId, draftToStudent, reason) {
  return `||COACH_BRIDGE_TO_STUDENT:${JSON.stringify({
    studentId: String(studentId),
    draftToStudent,
    reason,
  })}||`
}

/**
 * @param {{
 *   personaId: import('../constants/studentPortalPersonas.js').PortalPersonaId,
 *   focusStudent?: object | null,
 *   queryResolvedStudent?: object | null,
 *   students?: object[],
 *   userMessage: string,
 *   messages?: Array<{ role?: string, content?: string }>,
 *   nameQuery?: { match?: object | null, significantTokens?: string[] },
 * }} params
 * @returns {{ reply: string, bridgeDraft: { studentId: string, draftToStudent: string, reason: string } } | null}
 */
export function tryBuildCoachBridgeDraft({
  personaId,
  focusStudent = null,
  queryResolvedStudent = null,
  students = [],
  userMessage,
  messages = [],
  nameQuery = {},
}) {
  const conversationText = messages.map((m) => m.content ?? '').join('\n')
  if (!isCoachBridgeIntent(userMessage, conversationText, focusStudent)) return null

  const list = Array.isArray(students) ? students : []
  let target = queryResolvedStudent?.id ? queryResolvedStudent : null
  if (!target && nameQuery.match?.id) target = nameQuery.match
  if (!target && focusStudent?.id && focusStudentMatchesNameQuery(focusStudent, nameQuery)) {
    target = focusStudent
  }
  if (!target && focusStudent?.id && messageMentionsStudent(String(userMessage).toLowerCase(), focusStudent)) {
    target = focusStudent
  }
  if (
    !target &&
    focusStudent?.id &&
    (isPronounBridgeMessage(userMessage) ||
      list.length <= 1 ||
      isCoachBridgeIntent(userMessage, conversationText, focusStudent))
  ) {
    target = focusStudent
  }

  if (!target?.id) return null

  if (
    focusStudent?.id &&
    String(target.id) === String(focusStudent.id) &&
    (nameQuery.significantTokens?.length ?? 0) > 0 &&
    !focusStudentMatchesNameQuery(focusStudent, nameQuery) &&
    !nameQuery.match?.id
  ) {
    return null
  }

  const topic = inferCoachBridgeTopic(userMessage, conversationText)
  const { draftToStudent, reason } = buildCoachBridgeDraftText(target, topic)
  return {
    reply: formatCoachBridgeCoachReply(personaId, target, reason),
    bridgeDraft: {
      studentId: String(target.id),
      draftToStudent,
      reason,
    },
  }
}

/**
 * @param {Parameters<typeof tryBuildCoachBridgeDraft>[0]} params
 * @returns {string | null}
 */
export function tryBuildCoachBridgeReply(params) {
  const built = tryBuildCoachBridgeDraft(params)
  return built?.reply ?? null
}

/**
 * @param {{
 *   personaId: import('../constants/studentPortalPersonas.js').PortalPersonaId,
 *   focusStudent?: object | null,
 *   nameQuery?: { significantTokens?: string[] },
 *   userMessage: string,
 *   messages?: Array<{ role?: string, content?: string }>,
 * }} params
 * @returns {string | null}
 */
export function tryBuildBridgeWrongStudentReply({
  personaId,
  focusStudent,
  nameQuery = {},
  userMessage,
  messages = [],
}) {
  if (!focusStudent?.id) return null
  const conversationText = messages.map((m) => m.content ?? '').join('\n')
  if (!isCoachBridgeIntent(userMessage, conversationText, focusStudent)) return null
  const tokens = nameQuery.significantTokens ?? []
  if (!tokens.length) return null
  if (focusStudentMatchesNameQuery(focusStudent, nameQuery)) return null
  return formatBridgeWrongStudentReply(personaId, focusStudent, tokens)
}

/**
 * Тренер правит черновик в чате (пока сообщение ещё не отправлено ученику).
 * @param {string} userMessage
 * @param {boolean} [hasPendingDraft]
 */
export function isBridgeDraftRevisionIntent(userMessage, hasPendingDraft = false) {
  if (!hasPendingDraft) return false
  const msg = String(userMessage ?? '').trim()
  if (!msg || isBridgeDraftSendConfirmation(msg)) return false
  const lower = msg.toLowerCase().replace(/ё/g, 'е')
  return (
    /(?:измен|исправ|перепиш|переформули|скоррект|смягч|короч|длинн|добав|убер|убрать|замен|вместо|не\s+так|по-другому|уточн|отредакт|поправ|другой\s+текст|убери|добавь|напиши\s+так)/.test(
      lower,
    ) ||
    (msg.length >= 12 && /^(?:а\s+)?(?:можно|давай|лучше)\b/.test(lower))
  )
}

/**
 * @param {string} reply
 */
export function extractBridgeDraftQuoteFromReply(reply) {
  const text = String(reply ?? '')
  const quoteMatch =
    text.match(/«([^»]{8,})»/) ??
    text.match(/"([^"]{8,})"/) ??
    text.match(/Содержание:\s*[«"]?([^»"\n]{8,})/i) ??
    text.match(/(?:новый\s+текст|так:\s*)[«"]?([^»"\n]{8,})/i)
  return quoteMatch?.[1]?.trim().slice(0, 2000) ?? ''
}

/**
 * @param {string} rawReply
 * @param {object | null} focusStudent
 * @param {string} [studentId]
 * @param {{ text?: string, reason?: string } | null} [pendingBridgeDraft]
 * @returns {{ displayReply: string, bridgeDraft: { studentId: string, draftToStudent: string, reason: string } | null }}
 */
export function extractBridgeDraftFromAiReply(
  rawReply,
  focusStudent,
  studentId = '',
  pendingBridgeDraft = null,
) {
  const { displayReply, bridgeAction } = parseCoachAssistantMarkers(rawReply)
  if (bridgeAction?.draftToStudent) {
    return {
      displayReply,
      bridgeDraft: {
        studentId: String(bridgeAction.studentId || focusStudent?.id || studentId),
        draftToStudent: bridgeAction.draftToStudent,
        reason: bridgeAction.reason || pendingBridgeDraft?.reason || 'Сообщение для кабинета ученика.',
      },
    }
  }

  const quoted = extractBridgeDraftQuoteFromReply(displayReply)
  if (quoted && focusStudent?.id) {
    return {
      displayReply,
      bridgeDraft: {
        studentId: String(focusStudent.id || studentId),
        draftToStudent: quoted,
        reason: pendingBridgeDraft?.reason || 'Сообщение для кабинета ученика.',
      },
    }
  }

  return { displayReply, bridgeDraft: null }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} focusStudent
 * @param {{ text?: string, reason?: string } | null} pendingBridgeDraft
 */
export function formatBridgeDraftRevisionCoachReply(personaId, focusStudent, pendingBridgeDraft) {
  const name = displayNameFromStudent(focusStudent)
  if (personaId === 'gleb') {
    return `Коллега, учёл правку для ${name}. Проверьте блок «Сообщение в кабинет» ниже.`
  }
  if (personaId === 'vasily') {
    return `Коллега, подправил текст для ${name}. Смотри блок ниже — там можно ещё поправить вручную.`
  }
  return `Коллега, учёл правку для ${name}. Текст в блоке ниже — отредактируйте при необходимости и нажмите «Отправить».`
}
