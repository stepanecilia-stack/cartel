import { trainingGoalsLabels } from '../constants/studentPortalOnboarding.js'

const MAX_LEVEL_NOTES = 800
const MAX_CONVERSATION_SUMMARY = 1200
const MAX_KINESTHESIA_SNIPPET = 200

/**
 * @typedef {{
 *   levelNotes?: string,
 *   conversationSummary?: string,
 *   updatedAt?: string | null,
 *   stagesQuizPassed?: boolean,
 *   stagesQuizPassedAt?: string | null,
 *   kinesthesiaConfirmed?: boolean,
 *   kinesthesiaConfirmedAt?: string | null,
 *   kinesthesiaAnswerSnippet?: string,
 * }} PortalPersonaMemory
 */

/** @param {unknown} raw */
export function normalizePortalPersonaMemory(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      levelNotes: '',
      conversationSummary: '',
      updatedAt: null,
      stagesQuizPassed: false,
      stagesQuizPassedAt: null,
      kinesthesiaConfirmed: false,
      kinesthesiaConfirmedAt: null,
      kinesthesiaAnswerSnippet: '',
    }
  }
  const levelNotes =
    typeof raw.levelNotes === 'string' ? raw.levelNotes.trim().slice(0, MAX_LEVEL_NOTES) : ''
  const conversationSummary =
    typeof raw.conversationSummary === 'string'
      ? raw.conversationSummary.trim().slice(0, MAX_CONVERSATION_SUMMARY)
      : ''
  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : null
  const stagesQuizPassed = raw.stagesQuizPassed === true
  const stagesQuizPassedAt =
    typeof raw.stagesQuizPassedAt === 'string' && raw.stagesQuizPassedAt.trim()
      ? raw.stagesQuizPassedAt.trim()
      : null
  const kinesthesiaConfirmed = raw.kinesthesiaConfirmed === true
  const kinesthesiaConfirmedAt =
    typeof raw.kinesthesiaConfirmedAt === 'string' && raw.kinesthesiaConfirmedAt.trim()
      ? raw.kinesthesiaConfirmedAt.trim()
      : null
  const kinesthesiaAnswerSnippet =
    typeof raw.kinesthesiaAnswerSnippet === 'string'
      ? raw.kinesthesiaAnswerSnippet.trim().slice(0, MAX_KINESTHESIA_SNIPPET)
      : ''
  return {
    levelNotes,
    conversationSummary,
    updatedAt,
    stagesQuizPassed,
    stagesQuizPassedAt,
    kinesthesiaConfirmed,
    kinesthesiaConfirmedAt,
    kinesthesiaAnswerSnippet,
  }
}

/**
 * @param {string} base
 * @param {string} block
 * @param {number} maxLen
 */
function mergeTextBlock(base, block, maxLen) {
  const cleanBlock = block.trim()
  if (!cleanBlock) return base.trim().slice(0, maxLen)
  const cleanBase = base.trim()
  if (!cleanBase) return cleanBlock.slice(0, maxLen)
  if (cleanBase.includes(cleanBlock)) return cleanBase.slice(0, maxLen)
  return `${cleanBase}\n${cleanBlock}`.trim().slice(0, maxLen)
}

/**
 * @param {PortalPersonaMemory} memory
 * @param {unknown} goalsRaw
 */
export function applyTrainingGoalsToPersonaMemory(memory, goalsRaw) {
  const labels = trainingGoalsLabels(goalsRaw)
  if (labels.length === 0) return normalizePortalPersonaMemory(memory)
  const block = `Цели из анкеты: ${labels.join('; ')}.`
  return normalizePortalPersonaMemory({
    ...memory,
    levelNotes: mergeTextBlock(memory.levelNotes ?? '', block, MAX_LEVEL_NOTES),
  })
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {PortalPersonaMemory} existing
 * @param {unknown} goalsRaw
 */
export function buildLocalPersonaMemoryFallback(messages, existing, goalsRaw) {
  const normalized = applyTrainingGoalsToPersonaMemory(existing, goalsRaw)
  const userLines = messages
    .filter((m) => m?.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .filter(Boolean)
    .slice(-8)

  if (userLines.length === 0) return normalized

  const quotes = userLines.map((line) => `— «${line.slice(0, 120)}»`).join('\n')
  const conversationSummary = mergeTextBlock(
    normalized.conversationSummary,
    `Ученик в переписке:\n${quotes}`,
    MAX_CONVERSATION_SUMMARY,
  )

  return normalizePortalPersonaMemory({
    ...normalized,
    conversationSummary,
  })
}

/**
 * @param {{
 *   personaMemory?: PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 * }} params
 */
export function formatPortalPersonaMemoryForPrompt({ personaMemory, trainingGoals } = {}) {
  const memory = normalizePortalPersonaMemory(personaMemory)
  const withGoals = applyTrainingGoalsToPersonaMemory(memory, trainingGoals)
  const blocks = []

  if (withGoals.levelNotes) {
    blocks.push(`Пометки об уровне и целях ученика:\n${withGoals.levelNotes}`)
  }
  if (withGoals.conversationSummary) {
    blocks.push(`Резюме общения с этим учеником (помни, не повторяй дословно):\n${withGoals.conversationSummary}`)
  }
  if (withGoals.stagesQuizPassed) {
    blocks.push(
      'Инструктаж по этапам навыка пройден в онбординге (квиз с виртуальным тренером).',
    )
  }
  if (withGoals.kinesthesiaConfirmed) {
    const snippet = withGoals.kinesthesiaAnswerSnippet
      ? ` Формулировка ученика: «${withGoals.kinesthesiaAnswerSnippet}».`
      : ''
    blocks.push(
      `Ученик подтвердил критерий «Знание»: три образа, включая кинестетику.${snippet} Не давай «Понял» без честности про тело.`,
    )
  }

  return blocks.join('\n\n')
}

/**
 * @param {PortalPersonaMemory} memory
 */
export function hasPersonaMemoryMilestones(memory) {
  const m = normalizePortalPersonaMemory(memory)
  return m.stagesQuizPassed || m.kinesthesiaConfirmed
}

/**
 * @param {string | null | undefined} iso
 */
function formatCoachMilestoneDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/**
 * @param {PortalPersonaMemory} memory
 * @returns {Array<{ label: string, detail?: string }>}
 */
export function getPersonaMemoryMilestonesForCoach(memory) {
  const m = normalizePortalPersonaMemory(memory)
  /** @type {Array<{ label: string, detail?: string }>} */
  const items = []

  if (m.stagesQuizPassed) {
    const when = formatCoachMilestoneDate(m.stagesQuizPassedAt)
    items.push({
      label: 'Квиз по этапам навыка пройден',
      detail: when ? `Засчитано: ${when}` : undefined,
    })
  }
  if (m.kinesthesiaConfirmed) {
    const when = formatCoachMilestoneDate(m.kinesthesiaConfirmedAt)
    items.push({
      label: 'Три образа с кинестетикой подтверждены',
      detail: [
        when ? `Засчитано: ${when}` : null,
        m.kinesthesiaAnswerSnippet ? `Ответ: «${m.kinesthesiaAnswerSnippet}»` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }

  return items
}

/**
 * @param {PortalPersonaMemory} memory
 * @param {import('./onboardingStagesChat.js').OnboardingStagesMilestones} milestones
 */
export function applyOnboardingStagesMilestones(memory, milestones) {
  if (!milestones.stagesQuizPassed) return normalizePortalPersonaMemory(memory)

  const normalized = normalizePortalPersonaMemory(memory)
  let levelNotes = normalized.levelNotes

  if (milestones.kinesthesiaConfirmed) {
    levelNotes = mergeTextBlock(
      levelNotes,
      'Инструктаж пройден: этап «Знание», три образа (логика + зрение + кинестетика) подтверждены в чате с виртуальным тренером.',
      MAX_LEVEL_NOTES,
    )
  } else {
    levelNotes = mergeTextBlock(
      levelNotes,
      'Инструктаж: квиз по этапам навыка пройден в чате с виртуальным тренером.',
      MAX_LEVEL_NOTES,
    )
  }

  return normalizePortalPersonaMemory({
    ...normalized,
    ...milestones,
    levelNotes,
  })
}

/**
 * @param {PortalPersonaMemory} summarized
 * @param {PortalPersonaMemory} preserved
 */
export function mergePersonaMemoryAfterSummarize(summarized, preserved) {
  const next = normalizePortalPersonaMemory({ ...preserved, ...summarized })
  const keep = normalizePortalPersonaMemory(preserved)
  return normalizePortalPersonaMemory({
    ...next,
    stagesQuizPassed: keep.stagesQuizPassed || next.stagesQuizPassed,
    stagesQuizPassedAt: keep.stagesQuizPassedAt ?? next.stagesQuizPassedAt,
    kinesthesiaConfirmed: keep.kinesthesiaConfirmed || next.kinesthesiaConfirmed,
    kinesthesiaConfirmedAt: keep.kinesthesiaConfirmedAt ?? next.kinesthesiaConfirmedAt,
    kinesthesiaAnswerSnippet: keep.kinesthesiaAnswerSnippet || next.kinesthesiaAnswerSnippet,
    levelNotes: next.levelNotes || keep.levelNotes,
  })
}

export { MAX_LEVEL_NOTES, MAX_CONVERSATION_SUMMARY }
