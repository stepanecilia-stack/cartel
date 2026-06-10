/**
 * Короткие подтверждения тренера — не содержат имени ученика.
 * @param {string} text
 */
export function isNormSaveConfirmation(text) {
  const t = String(text ?? '').trim().toLowerCase()
  if (!t || t.length > 120) return false
  if (/^да[\s,]*(она|он|этот|эта|этого|ту|тот)\b/.test(t)) return false
  if (/^(да|ага|угу|верно|точно|подтверждаю|записывай|запиши|вноси|внеси|давай|ок|окей|yes|конечно|именно)\b/.test(t)) {
    return true
  }
  if (/\b(фиксируем|зафиксируй|зафиксируйте|фиксируй)\b/.test(t)) {
    return true
  }
  if (/не золото|не серебро|как бронз|бронз[ауеё]?\b|ну да\b|согласен|согласна/.test(t)) {
    return true
  }
  return false
}

/**
 * @param {string} text
 */
export function isExplicitNormSaveIntent(text) {
  const t = String(text ?? '').trim().toLowerCase()
  if (!t) return false
  if (/^(запиши|записать|зафиксируй|зафиксируйте|внеси|вноси|сохрани|сохранить)\b/.test(t)) {
    return true
  }
  return /\b(запиши|зафиксируй|внеси|сохрани)\b/.test(t) && /\b(карточк|норматив|зач[её]т)\b/.test(t)
}

/**
 * Текст для поиска ученика: при подтверждении смотрим всю переписку, не только последнюю реплику.
 * @param {{ userMessage?: string, conversationText?: string, threadText?: string }} params
 */
export function pickCoachAssistantStudentLookupText({ userMessage = '', conversationText = '', threadText = '' }) {
  const thread = String(threadText ?? '').trim()
  const conv = String(conversationText ?? '').trim()
  const last = String(userMessage ?? '').trim()
  if (isNormSaveConfirmation(last)) {
    return thread || conv || last
  }
  return conv || last || thread
}
