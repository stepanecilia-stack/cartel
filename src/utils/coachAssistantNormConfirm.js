import {
  extractNormResultFromConversation,
  isNormConversationThread,
  resolveNormForStudentText,
  resolveStudentFromCoachMessages,
  tryEvaluateNormFromConversation,
} from './coachAssistantNormEvaluate.js'
import { preferFreshStudent } from './coachAssistantStudentSources.js'

/**
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
 * @param {string} text
 */
function assistantDiscussedNorm(text) {
  return /запис|подтверж|зачт[её]м|внес|в карточк|как «|как "|бронз|серебр|золот|зафиксир|отжим|подтяг|упор.*лёж/i.test(
    String(text ?? ''),
  )
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {number} beforeIndex
 */
function lastAssistantBefore(messages, beforeIndex) {
  for (let i = beforeIndex - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'assistant') return messages[i]
  }
  return null
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {{
 *   students?: object[],
 *   focusStudent?: object | null,
 *   queryResolvedStudent?: object | null,
 *   allNorms?: object[],
 * }} coachContext
 * @returns {{ studentId: string, testId: string, resultRaw: string } | null}
 */
export function tryBuildNormSaveFromConversation(messages, coachContext = {}) {
  const list = Array.isArray(messages) ? messages : []
  const lastUser = [...list].reverse().find((m) => m?.role === 'user')
  if (!lastUser?.content) return null

  const trimmed = String(lastUser.content).trim()
  const wantsSave = isNormSaveConfirmation(trimmed) || isExplicitNormSaveIntent(trimmed)
  if (!wantsSave) return null

  const allNorms = coachContext.allNorms ?? []
  const student = resolveStudentFromCoachMessages(list, coachContext)
  if (!student?.id) return null

  const evalContext = {
    ...coachContext,
    allNorms,
    focusStudent: preferFreshStudent(student, coachContext.focusStudent),
    queryResolvedStudent: coachContext.queryResolvedStudent?.id
      ? preferFreshStudent(coachContext.queryResolvedStudent, coachContext.focusStudent)
      : preferFreshStudent(student, coachContext.focusStudent),
  }

  const evaluation = tryEvaluateNormFromConversation(list, evalContext)
  if (evaluation?.testId && evaluation?.resultRaw && evaluation?.student?.id) {
    return {
      studentId: String(evaluation.student.id),
      testId: String(evaluation.testId),
      resultRaw: evaluation.resultRaw,
    }
  }

  let lastUserIndex = -1
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role === 'user') {
      lastUserIndex = i
      break
    }
  }
  const lastAssistant = lastUserIndex >= 0 ? lastAssistantBefore(list, lastUserIndex) : null
  const threadHasNorm = isNormConversationThread(list)
  if (!lastAssistant?.content && !threadHasNorm) return null
  if (lastAssistant?.content && !assistantDiscussedNorm(lastAssistant.content) && !threadHasNorm) {
    return null
  }

  const userText = list
    .filter((m) => m?.role === 'user')
    .map((m) => m.content ?? '')
    .join('\n')
  const combined = `${userText}\n${lastAssistant?.content ?? ''}`
  const norm = resolveNormForStudentText(evalContext.focusStudent ?? student, allNorms, combined)
  if (!norm?.testId) return null

  const resultRaw = extractNormResultFromConversation(list)
  if (!resultRaw) return null

  return {
    studentId: String(student.id),
    testId: String(norm.testId),
    resultRaw,
  }
}
