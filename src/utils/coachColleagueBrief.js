const MAX_BRIEF = 1200

/**
 * Краткое резюме переписки очного тренера с виртуальным коллегой —
 * попадает в portalPersonaMemory и влияет на ответы ученику в кабинете.
 *
 * @param {Array<{ role?: string, content?: string }>} messages
 */
export function buildCoachColleagueBriefFromMessages(messages) {
  const list = Array.isArray(messages) ? messages : []
  const coachLines = list
    .filter((m) => m?.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .filter(Boolean)
    .slice(-12)

  const assistantLines = list
    .filter((m) => m?.role === 'assistant' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .filter(Boolean)
    .slice(-4)

  if (!coachLines.length && !assistantLines.length) return ''

  const parts = []
  if (coachLines.length) {
    parts.push(
      `Очный тренер обсудил:\n${coachLines.map((line) => `— ${line.slice(0, 220)}`).join('\n')}`,
    )
  }
  if (assistantLines.length) {
    const last = assistantLines[assistantLines.length - 1]
    parts.push(`Коллега-бот зафиксировал:\n— ${last.slice(0, 400)}`)
  }

  return parts.join('\n\n').trim().slice(0, MAX_BRIEF)
}
