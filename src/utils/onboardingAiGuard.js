import { trainingGoalsLabels } from '../constants/studentPortalOnboarding.js'

/** @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages @param {unknown} trainingGoals */
export function buildIntakeFactsCorpus(messages, trainingGoals) {
  const userText = messages
    .filter((m) => m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join(' ')
  const anketa = trainingGoalsLabels(trainingGoals).join(' ')
  return `${userText} ${anketa}`.toLowerCase().replace(/ё/g, 'е')
}

/** @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages @param {unknown} trainingGoals */
export function formatIntakeKnownFactsBlock(messages, trainingGoals) {
  const anketa = trainingGoalsLabels(trainingGoals)
  const userLines = messages
    .filter((m) => m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .filter(Boolean)

  const parts = []
  if (anketa.length > 0) parts.push(`Анкета: ${anketa.join('; ')}`)
  userLines.forEach((line, i) => parts.push(`Ответ ${i + 1}: «${line}»`))

  if (parts.length === 0) {
    return 'Известных фактов об ученике пока нет — только то, что он напишет в чате.'
  }
  return `Известные факты (ТОЛЬКО это; не додумывай разряд, КМС, бои, стаж): ${parts.join('. ')}.`
}

const INVENTED_RANK_PATTERNS = [
  /кмс/,
  /кандидат\s+в\s+мастера/,
  /кандидат\s+мастера/,
  /мастер\s+спорта/,
  /\bмс\s+по\s+боксу/,
  /\b1\s*[-–]?\s*й?\s*разряд/,
  /\b2\s*[-–]?\s*й?\s*разряд/,
  /\b3\s*[-–]?\s*й?\s*разряд/,
  /разрядник/,
  /ты\s+кмс/,
  /ты\s+—\s*кмс/,
]

/**
 * AI придумал разряд/КМС, которых нет в ответах ученика и анкете.
 * @param {string} reply
 * @param {string} corpus
 */
export function aiReplyInventsStudentRank(reply, corpus) {
  const lower = reply.toLowerCase().replace(/ё/g, 'е')
  return INVENTED_RANK_PATTERNS.some((re) => re.test(lower) && !re.test(corpus))
}
