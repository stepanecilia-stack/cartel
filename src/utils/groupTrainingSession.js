import { saveLastTrainingRoster } from './groupTrainingPreferences.js'

const STORAGE_KEY = 'cartel_group_training_session_v1'

/** @typedef {{ l1: number, l2: number, l3: number }} GroupTrainingSliderTiers */

/**
 * @typedef {{
 *   coachId: string,
 *   active: boolean,
 *   selectedIds: string[],
 *   slidersByStudentId: Record<string, GroupTrainingSliderTiers>,
 *   startedAt: string,
 * }} GroupTrainingSession
 */

/** @type {Set<() => void>} */
const listeners = new Set()

function notify() {
  for (const fn of listeners) fn()
}

/**
 * @returns {GroupTrainingSession | null}
 */
function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    if (!data.active || typeof data.coachId !== 'string') return null
    const selectedIds = Array.isArray(data.selectedIds)
      ? data.selectedIds.filter((id) => typeof id === 'string' && id)
      : []
    const slidersByStudentId =
      data.slidersByStudentId && typeof data.slidersByStudentId === 'object'
        ? data.slidersByStudentId
        : {}
    return {
      coachId: data.coachId,
      active: true,
      selectedIds,
      slidersByStudentId,
      startedAt: typeof data.startedAt === 'string' ? data.startedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * @param {GroupTrainingSession | null} session
 */
function writeRaw(session) {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (err) {
    console.warn('groupTrainingSession: не удалось записать', err)
  }
  notify()
}

/**
 * @param {string | undefined | null} coachId
 * @returns {GroupTrainingSession | null}
 */
export function getGroupTrainingSession(coachId) {
  if (!coachId) return null
  const data = readRaw()
  if (!data || data.coachId !== coachId) return null
  return data
}

/**
 * @param {string} coachId
 * @param {Iterable<string>} selectedIds
 */
export function startGroupTrainingSession(coachId, selectedIds) {
  const ids = [...new Set(selectedIds)]
  writeRaw({
    coachId,
    active: true,
    selectedIds: ids,
    slidersByStudentId: {},
    startedAt: new Date().toISOString(),
  })
  saveLastTrainingRoster(coachId, ids)
}

/**
 * @param {string} coachId
 * @param {string} studentId
 * @param {GroupTrainingSliderTiers} tiers
 */
export function updateGroupTrainingSessionSliders(coachId, studentId, tiers) {
  const data = readRaw()
  if (!data || data.coachId !== coachId) return
  writeRaw({
    ...data,
    slidersByStudentId: {
      ...data.slidersByStudentId,
      [studentId]: {
        l1: tiers.l1,
        l2: tiers.l2,
        l3: tiers.l3,
      },
    },
  })
}

/**
 * @param {string | undefined | null} [coachId]
 */
export function endGroupTrainingSession(coachId) {
  const data = readRaw()
  if (!data) return
  if (coachId && data.coachId !== coachId) return
  writeRaw(null)
}

export function clearGroupTrainingSession() {
  writeRaw(null)
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeGroupTrainingSession(listener) {
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) listener()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}
