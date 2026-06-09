import { ensureAuth, firebaseConfig, isFirebaseConfigured } from './firebaseService.js'
import { getPortalPersonaSystemPrompt } from '../utils/portalPersonaAiPrompt.js'

async function postPortalFunction(path, body) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured')
  }

  const auth = ensureAuth()
  const user = auth.currentUser
  if (!user) {
    throw new Error('Нужен вход в кабинет ученика (Firebase Auth).')
  }

  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1'
  const projectId = firebaseConfig.projectId
  if (!projectId) {
    throw new Error('VITE_FIREBASE_PROJECT_ID не задан')
  }

  const url = `https://${region}-${projectId}.cloudfunctions.net/${path}`
  const idToken = await user.getIdToken()

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const msg = data?.detail || data?.error || response.statusText
    throw new Error(`${path} ${response.status}: ${msg}`)
  }

  return data
}

/**
 * @param {{
 *   personaId: string,
 *   messages: import('./portalPersonaAiService.js').PortalChatMessage[],
 *   context?: import('../utils/portalPersonaAiPrompt.js').PortalPersonaChatContext,
 *   programHint?: string | null,
 *   personaMemory?: import('../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   studyAtom?: object | null,
 * }} params
 */
export async function callPortalPersonaChatFunction({
  personaId,
  messages,
  context = 'general',
  programHint = null,
  personaMemory = null,
  trainingGoals = null,
  studyAtom = null,
}) {
  const data = await postPortalFunction('portalPersonaChat', {
    personaId,
    messages: messages.slice(-12),
    context,
    systemPrompt: getPortalPersonaSystemPrompt(personaId, context, programHint, {
      personaMemory,
      trainingGoals,
      studyAtom,
      intakeMessages: context === 'onboarding_greeting' ? messages : null,
    }),
  })

  if (data && typeof data === 'object' && typeof data.reply === 'string' && data.reply.trim()) {
    if (import.meta.env.DEV && data.usage) {
      console.info('[portalPersonaAi] usage', data.usage)
    }
    return data.reply.trim()
  }

  throw new Error('Invalid AI response')
}

/**
 * @param {{
 *   messages: import('./portalPersonaAiService.js').PortalChatMessage[],
 *   existingMemory?: import('../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   context?: import('../utils/portalPersonaAiPrompt.js').PortalPersonaChatContext,
 * }} params
 */
export async function callPortalPersonaMemoryRefresh({
  messages,
  existingMemory = null,
  trainingGoals = null,
  context = 'general',
}) {
  const data = await postPortalFunction('portalPersonaMemoryRefresh', {
    messages: messages.slice(-24),
    existingMemory,
    trainingGoals,
    context,
  })

  if (data && typeof data === 'object') {
    return {
      levelNotes: typeof data.levelNotes === 'string' ? data.levelNotes : '',
      conversationSummary:
        typeof data.conversationSummary === 'string' ? data.conversationSummary : '',
    }
  }

  throw new Error('Invalid memory response')
}
