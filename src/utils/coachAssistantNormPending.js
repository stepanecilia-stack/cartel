import { prepareCoachAssistantContext } from '../services/coachAssistantService.js'
import { tryEvaluateNormFromConversation } from './coachAssistantNormEvaluate.js'

/**
 * @param {{ student?: { id?: string }, testId?: string, resultRaw?: string }} evaluation
 */
export function normConfirmStorageKey(evaluation) {
  if (!evaluation?.student?.id || !evaluation?.testId || !evaluation?.resultRaw) return ''
  return `${evaluation.student.id}:${evaluation.testId}:${evaluation.resultRaw}`
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {{
 *   coachName?: string,
 *   students?: object[],
 *   focusStudent?: object | null,
 * }} coachContextBase
 */
export async function resolvePendingNormFromMessages(messages, coachContextBase = {}) {
  const list = Array.isArray(messages) ? messages : []
  const conversationText = list
    .filter((m) => m?.role === 'user')
    .map((m) => m.content ?? '')
    .join('\n')
  const threadText = list.map((m) => m.content ?? '').join('\n')
  const lastUser = [...list].reverse().find((m) => m?.role === 'user')
  const coachContext = await prepareCoachAssistantContext(
    coachContextBase,
    lastUser?.content ?? '',
    conversationText,
    threadText,
  )
  const evaluation = tryEvaluateNormFromConversation(list, coachContext)
  if (!evaluation?.student?.id || !evaluation?.testId || !evaluation?.resultRaw) {
    return null
  }
  return {
    evaluation,
    key: normConfirmStorageKey(evaluation),
  }
}
