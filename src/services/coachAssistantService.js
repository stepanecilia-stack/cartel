import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ensureDb } from './firebaseService.js'
import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { loadNormsOnce } from '../data/normsCache.js'
import { buildCoachAssistantSystemPrompt } from '../utils/coachAssistantPrompt.js'
import { scriptedCoachAssistantReply } from '../utils/coachAssistantScript.js'
import { isPortalPersonaAiRemoteEnabled } from '../utils/portalPersonaAiConfig.js'
import { normalizeCoachAssistantPersonaId, writeCoachAssistantPersonaLocal } from '../utils/coachAssistantPersona.js'
import { mergeStudentCardLiveSnapshot } from '../data/studentCardLiveCache.js'
import {
  mergeStudentIntoList,
  resolveCoachAssistantStudentTargets,
} from '../utils/coachAssistantStudentSources.js'
import { COACH_ASSISTANT_CHAT_MAX_MESSAGES } from '../utils/coachAssistantChatHistory.js'
import { isStudentCodeExplicitQuery } from '../utils/studentNameSearch.js'
import { isNormSaveConfirmation } from '../utils/coachAssistantConfirmText.js'
import {
  formatStudentLookupReply,
  isStudentLookupQuery,
} from '../utils/coachAssistantStudentContext.js'
import {
  buildNormEvaluationHint,
  formatNormConfirmAckReply,
  formatNormEvaluationReply,
  shouldUseDeterministicNormReply,
  tryEvaluateNormFromConversation,
} from '../utils/coachAssistantNormEvaluate.js'
import { ensureAuth, firebaseConfig, isFirebaseConfigured } from './firebaseService.js'

/**
 * @param {{
 *   coachName?: string,
 *   students?: object[],
 *   focusStudent?: object | null,
 *   allNorms?: object[],
 *   programAtoms?: { level1?: object[], level2?: object[], level3?: object[] },
 *   queryResolvedStudent?: object | null,
 *   queryStudentSuggestions?: object[],
 *   queryText?: string,
 *   includeCodeInSuggestions?: boolean,
 * }} coachContext
 * @param {string} [userMessage]
 * @param {string} [conversationText]
 * @param {string} [threadText]
 */
export async function prepareCoachAssistantContext(
  coachContext = {},
  userMessage = '',
  conversationText = '',
  threadText = '',
) {
  const allNorms =
    Array.isArray(coachContext.allNorms) && coachContext.allNorms.length > 0
      ? coachContext.allNorms
      : await loadNormsOnce().catch(() => [])
  const cache = getTechnicalProgramAtomsCache()
  const programAtoms = coachContext.programAtoms ?? {
    level1: cache.level1,
    level2: cache.level2,
    level3: cache.level3,
  }
  const students = mergeStudentIntoList(
    coachContext.students,
    coachContext.focusStudent,
  ).map((student) => mergeStudentCardLiveSnapshot(student))

  const targets = resolveCoachAssistantStudentTargets({
    students,
    focusStudent: coachContext.focusStudent,
    userMessage,
    conversationText,
    threadText,
    presetResolvedStudent: coachContext.queryResolvedStudent,
    presetSuggestions: coachContext.queryStudentSuggestions,
  })
  const focusStudent = targets.focusStudent
  const queryResolvedStudent = targets.queryResolvedStudent
  const queryStudentSuggestions = targets.queryStudentSuggestions

  return {
    ...coachContext,
    students,
    focusStudent,
    allNorms,
    programAtoms,
    queryResolvedStudent,
    queryStudentSuggestions,
    queryText: userMessage,
    includeCodeInSuggestions:
      coachContext.includeCodeInSuggestions === true || isStudentCodeExplicitQuery(userMessage),
  }
}

/**
 * @typedef {{ role: 'user' | 'assistant', content: string }} CoachChatMessage
 */

export async function saveCoachAssistantPersona(coachId, personaId) {
  const normalized = normalizeCoachAssistantPersonaId(personaId)
  writeCoachAssistantPersonaLocal(normalized)
  if (!coachId) return normalized
  await updateDoc(doc(ensureDb(), 'coaches', coachId), {
    coachAssistantPersonaId: normalized,
    updatedAt: serverTimestamp(),
  })
  return normalized
}

async function callCoachAssistantChatFunction({ personaId, messages, coachContext }) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const auth = ensureAuth()
  const user = auth.currentUser
  if (!user) throw new Error('Войдите как тренер.')

  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1'
  const projectId = firebaseConfig.projectId
  const url = `https://${region}-${projectId}.cloudfunctions.net/portalPersonaChat`
  const idToken = await user.getIdToken()

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      personaId,
      messages: messages.slice(-COACH_ASSISTANT_CHAT_MAX_MESSAGES),
      context: 'coach_assistant',
      systemPrompt: buildCoachAssistantSystemPrompt(personaId, coachContext),
    }),
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || response.statusText)
  }
  if (data?.reply?.trim()) return data.reply.trim()
  throw new Error('Пустой ответ')
}

/**
 * @param {{
 *   personaId: unknown,
 *   messages: CoachChatMessage[],
 *   coachContext?: {
 *     coachName?: string,
 *     students?: object[],
 *     focusStudent?: object | null,
 *     allNorms?: object[],
 *     programAtoms?: { level1?: object[], level2?: object[], level3?: object[] },
 *   },
 * }} params
 */
export async function sendCoachAssistantMessage({ personaId, messages, coachContext = {} }) {
  const id = normalizeCoachAssistantPersonaId(personaId)
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userMessage = lastUser?.content ?? ''
  const conversationText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content ?? '')
    .join('\n')
  const threadText = messages.map((m) => m.content ?? '').join('\n')
  let enrichedContext = await prepareCoachAssistantContext(
    coachContext,
    userMessage,
    conversationText,
    threadText,
  )
  const normEvaluation = tryEvaluateNormFromConversation(messages, enrichedContext)
  enrichedContext = {
    ...enrichedContext,
    normEvaluation,
    normEvaluationHint: buildNormEvaluationHint(normEvaluation),
    conversationMessages: messages,
  }

  if (isNormSaveConfirmation(userMessage) && normEvaluation?.student?.id) {
    return {
      reply: formatNormConfirmAckReply(normEvaluation, id),
      source: 'norm-confirm',
    }
  }

  const lookupStudent = enrichedContext.queryResolvedStudent ?? enrichedContext.focusStudent
  if (isStudentLookupQuery(userMessage) && lookupStudent?.id) {
    return {
      reply: formatStudentLookupReply(
        lookupStudent,
        id,
        enrichedContext.allNorms ?? [],
        enrichedContext.programAtoms ?? null,
      ),
      source: 'student-lookup',
    }
  }

  if (shouldUseDeterministicNormReply(userMessage, normEvaluation, enrichedContext, messages)) {
    return {
      reply: formatNormEvaluationReply(normEvaluation, id, userMessage),
      source: 'norm-eval',
    }
  }

  if (isPortalPersonaAiRemoteEnabled()) {
    try {
      const reply = await callCoachAssistantChatFunction({
        personaId: id,
        messages,
        coachContext: enrichedContext,
      })
      return { reply, source: 'ai' }
    } catch (err) {
      console.warn('[coachAssistant] remote failed', err)
      await new Promise((r) => setTimeout(r, 400))
      return {
        reply: await scriptedCoachAssistantReply(id, userMessage, enrichedContext),
        source: 'script-fallback',
      }
    }
  }

  await new Promise((r) => setTimeout(r, 350 + Math.random() * 300))
  return {
    reply: await scriptedCoachAssistantReply(id, userMessage, enrichedContext),
    source: 'script',
  }
}
