import { normalizeCoachAssistantPersonaId } from './coachAssistantPersona.js'

export const COACH_ASSISTANT_CHAT_MAX_MESSAGES = 30

const STORAGE_PREFIX = 'cartel_coach_assistant_chat_v1'

/**
 * @typedef {{
 *   role: 'user' | 'assistant',
 *   content: string,
 *   voiceDurationSec?: number,
 *   voiceAudioUrl?: string,
 * }} CoachAssistantChatMessage
 */

function storageKey(coachId, personaId) {
  const coach = String(coachId ?? '').trim() || 'local'
  const persona = normalizeCoachAssistantPersonaId(personaId)
  return `${STORAGE_PREFIX}:${coach}:${persona}`
}

/** @param {unknown} raw */
function normalizeMessage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const role = raw.role === 'user' || raw.role === 'assistant' ? raw.role : null
  const content = typeof raw.content === 'string' ? raw.content.trim() : ''
  if (!role || !content) return null
  const voiceDurationSec =
    typeof raw.voiceDurationSec === 'number' && Number.isFinite(raw.voiceDurationSec)
      ? Math.round(raw.voiceDurationSec)
      : undefined
  return {
    role,
    content: content.slice(0, 4000),
    ...(voiceDurationSec ? { voiceDurationSec } : {}),
  }
}

/**
 * @param {CoachAssistantChatMessage[]} messages
 * @param {number} [max]
 */
export function trimCoachAssistantChatMessages(messages, max = COACH_ASSISTANT_CHAT_MAX_MESSAGES) {
  const list = Array.isArray(messages) ? messages : []
  const normalized = list.map(normalizeMessage).filter(Boolean)
  if (normalized.length <= max) return normalized
  return normalized.slice(-max)
}

/**
 * @param {string | undefined | null} coachId
 * @param {unknown} personaId
 * @returns {CoachAssistantChatMessage[] | null}
 */
export function readCoachAssistantChatHistory(coachId, personaId) {
  try {
    const raw = localStorage.getItem(storageKey(coachId, personaId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const messages = trimCoachAssistantChatMessages(parsed?.messages ?? parsed)
    return messages.length > 0 ? messages : null
  } catch {
    return null
  }
}

/**
 * @param {string | undefined | null} coachId
 * @param {unknown} personaId
 * @param {CoachAssistantChatMessage[]} messages
 */
export function writeCoachAssistantChatHistory(coachId, personaId, messages) {
  try {
    const trimmed = trimCoachAssistantChatMessages(messages)
    if (trimmed.length === 0) {
      localStorage.removeItem(storageKey(coachId, personaId))
      return
    }
    localStorage.setItem(
      storageKey(coachId, personaId),
      JSON.stringify({ messages: trimmed, updatedAt: new Date().toISOString() }),
    )
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string | undefined | null} coachId
 * @param {unknown} personaId
 * @param {string} opener
 */
export function loadCoachAssistantChatMessages(coachId, personaId, opener) {
  const stored = readCoachAssistantChatHistory(coachId, personaId)
  if (stored?.length) return stored
  const text = String(opener ?? '').trim()
  return text ? [{ role: 'assistant', content: text }] : []
}

/**
 * @param {string | undefined | null} coachId
 * @param {unknown} personaId
 */
export function clearCoachAssistantChatHistory(coachId, personaId) {
  try {
    localStorage.removeItem(storageKey(coachId, personaId))
  } catch {
    /* ignore */
  }
}

/**
 * Очистить историю и вернуть приветствие помощника.
 * @param {string | undefined | null} coachId
 * @param {unknown} personaId
 * @param {string} opener
 */
export function resetCoachAssistantChatMessages(coachId, personaId, opener) {
  clearCoachAssistantChatHistory(coachId, personaId)
  const text = String(opener ?? '').trim()
  return text ? [{ role: 'assistant', content: text }] : []
}
