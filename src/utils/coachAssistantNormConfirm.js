import {
  extractNormResultFromConversation,
  isNormConversationThread,
  resolveNormForStudentText,
  resolveStudentFromCoachMessages,
  tryEvaluateNormFromConversation,
} from './coachAssistantNormEvaluate.js'
import { preferFreshStudent } from './coachAssistantStudentSources.js'
export { isExplicitNormSaveIntent, isNormSaveConfirmation } from './coachAssistantConfirmText.js'
import { isExplicitNormSaveIntent, isNormSaveConfirmation } from './coachAssistantConfirmText.js'

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
