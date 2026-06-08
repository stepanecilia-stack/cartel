import { saveStudentPortalPersonaMemory } from './studentPortalService.js'
import {
  buildLocalPersonaMemoryFallback,
  normalizePortalPersonaMemory,
  applyOnboardingStagesMilestones,
  mergePersonaMemoryAfterSummarize,
} from '../utils/portalPersonaMemory.js'
import { extractOnboardingStagesMilestones } from '../utils/onboardingStagesChat.js'

/**
 * @param {{
 *   messages: import('./portalPersonaAiService.js').PortalChatMessage[],
 *   existingMemory?: import('../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   context?: import('../utils/portalPersonaAiPrompt.js').PortalPersonaChatContext,
 * }} params
 */
export async function summarizePortalPersonaMemory({
  messages,
  existingMemory = null,
  trainingGoals = null,
  context = 'general',
}) {
  const normalizedExisting = normalizePortalPersonaMemory(existingMemory)
  const useRemote = import.meta.env.VITE_PORTAL_PERSONA_AI === '1'

  if (useRemote) {
    try {
      const { callPortalPersonaMemoryRefresh } = await import('./portalPersonaAiRemote.js')
      const remote = await callPortalPersonaMemoryRefresh({
        messages,
        existingMemory: normalizedExisting,
        trainingGoals,
        context,
      })
      return normalizePortalPersonaMemory(remote)
    } catch (err) {
      console.warn('[portalPersonaMemory] remote summarize failed, using local fallback', err)
    }
  }

  return buildLocalPersonaMemoryFallback(messages, normalizedExisting, trainingGoals)
}

/**
 * @param {{
 *   studentId: string,
 *   messages: import('./portalPersonaAiService.js').PortalChatMessage[],
 *   existingMemory?: import('../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   context?: import('../utils/portalPersonaAiPrompt.js').PortalPersonaChatContext,
 * }} params
 */
export async function refreshAndSavePortalPersonaMemory({
  studentId,
  messages,
  existingMemory = null,
  trainingGoals = null,
  context = 'general',
}) {
  const userCount = messages.filter((m) => m.role === 'user' && m.content?.trim()).length
  if (!studentId || userCount === 0) {
    return normalizePortalPersonaMemory(existingMemory)
  }

  const normalizedExisting = normalizePortalPersonaMemory(existingMemory)
  let workingMemory = normalizedExisting

  if (context === 'onboarding_stages') {
    const milestones = extractOnboardingStagesMilestones(messages)
    workingMemory = applyOnboardingStagesMilestones(workingMemory, milestones)
  }

  const summarized = await summarizePortalPersonaMemory({
    messages,
    existingMemory: workingMemory,
    trainingGoals,
    context,
  })

  const merged = mergePersonaMemoryAfterSummarize(summarized, workingMemory)

  return saveStudentPortalPersonaMemory(studentId, merged)
}
