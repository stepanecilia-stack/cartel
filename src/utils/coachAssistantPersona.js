import { normalizePortalPersonaId } from '../constants/studentPortalPersonas.js'

const STORAGE_KEY = 'cartel_coach_assistant_persona'

/** @param {unknown} raw */
export function normalizeCoachAssistantPersonaId(raw) {
  return normalizePortalPersonaId(raw) ?? 'arkady'
}

/** Локальный fallback до загрузки профиля. */
export function readCoachAssistantPersonaLocal() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return normalizeCoachAssistantPersonaId(v)
  } catch {
    return 'arkady'
  }
}

/** @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId */
export function writeCoachAssistantPersonaLocal(personaId) {
  try {
    localStorage.setItem(STORAGE_KEY, normalizeCoachAssistantPersonaId(personaId))
  } catch {
    /* ignore */
  }
}

/** @param {object | null | undefined} coachProfile */
export function resolveCoachAssistantPersonaId(coachProfile) {
  const fromProfile = coachProfile?.coachAssistantPersonaId
  if (fromProfile) return normalizeCoachAssistantPersonaId(fromProfile)
  return readCoachAssistantPersonaLocal()
}
