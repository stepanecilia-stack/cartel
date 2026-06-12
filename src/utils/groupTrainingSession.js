import { saveLastTrainingRoster } from './groupTrainingPreferences.js'
import {
  deleteGroupTrainingFirestore,
  parseGroupTrainingSessionDoc,
  subscribeGroupTrainingFirestore,
  writeGroupTrainingFirestore,
} from '../services/groupTrainingSessionFirestore.js'

const LEGACY_STORAGE_KEY = 'cartel_group_training_session_v1'

/** @typedef {{ l1: number, l2: number, l3: number }} GroupTrainingSliderTiers */

/**
 * @typedef {{
 *   coachId: string,
 *   active: boolean,
 *   phase: 'compose' | 'progress',
 *   selectedIds: string[],
 *   slidersByStudentId: Record<string, GroupTrainingSliderTiers>,
 *   practicedAtomIdsByStudentId: Record<string, string[]>,
 *   startedAt: string,
 *   updatedBy?: 'app' | 'telegram',
 *   schemaVersion: number,
 * }} GroupTrainingSession
 */

/** @type {GroupTrainingSession | null} */
let sessionCache = null

/** @type {string | null} */
let subscribedCoachId = null

/** @type {(() => void) | null} */
let unsubscribeFirestore = null

/** @type {Set<() => void>} */
const listeners = new Set()

function notify() {
  for (const fn of listeners) fn()
}

/**
 * @returns {GroupTrainingSession | null}
 */
function readLegacyLocal() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    if (!data.active || typeof data.coachId !== 'string') return null
    return parseGroupTrainingSessionDoc(
      {
        ...data,
        phase: data.phase === 'progress' ? 'progress' : 'compose',
        schemaVersion: 1,
      },
      data.coachId,
    )
  } catch {
    return null
  }
}

function clearLegacyLocal() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @param {GroupTrainingSession | null} session
 */
function setCache(session) {
  sessionCache = session
  notify()
}

async function persistSession(session) {
  if (!session?.coachId) return
  try {
    await writeGroupTrainingFirestore(session.coachId, session)
  } catch (err) {
    console.warn('groupTrainingSession: Firestore write failed', err)
  }
}

async function migrateLegacyIfNeeded(coachId) {
  const legacy = readLegacyLocal()
  if (!legacy || legacy.coachId !== coachId) return
  if (sessionCache) {
    clearLegacyLocal()
    return
  }
  try {
    await writeGroupTrainingFirestore(coachId, legacy)
    setCache(legacy)
    clearLegacyLocal()
  } catch (err) {
    console.warn('groupTrainingSession: legacy migration failed', err)
    setCache(legacy)
  }
}

function ensureFirestoreSubscription(coachId) {
  if (!coachId) return
  if (subscribedCoachId === coachId && unsubscribeFirestore) return

  if (unsubscribeFirestore) {
    unsubscribeFirestore()
    unsubscribeFirestore = null
  }
  subscribedCoachId = coachId

  void migrateLegacyIfNeeded(coachId)

  unsubscribeFirestore = subscribeGroupTrainingFirestore(
    coachId,
    (remote) => {
      setCache(remote)
    },
    () => {},
  )
}

/**
 * @param {string | undefined | null} coachId
 * @returns {GroupTrainingSession | null}
 */
export function getGroupTrainingSession(coachId) {
  if (!coachId) return null
  ensureFirestoreSubscription(coachId)
  if (sessionCache?.coachId === coachId) return sessionCache
  return null
}

/**
 * @param {string} coachId
 * @param {Iterable<string>} selectedIds
 * @param {Record<string, string[]>} [initialPracticedByStudentId]
 * @param {'compose' | 'progress'} [phase]
 */
export function startGroupTrainingSession(
  coachId,
  selectedIds,
  initialPracticedByStudentId,
  phase = 'progress',
) {
  const ids = [...new Set(selectedIds)]
  const practicedAtomIdsByStudentId = {}
  if (initialPracticedByStudentId && typeof initialPracticedByStudentId === 'object') {
    for (const [studentId, atomIds] of Object.entries(initialPracticedByStudentId)) {
      if (!ids.includes(studentId) || !Array.isArray(atomIds)) continue
      const clean = [...new Set(atomIds.filter((id) => typeof id === 'string' && id))]
      if (clean.length) practicedAtomIdsByStudentId[studentId] = clean
    }
  }
  const session = {
    coachId,
    active: true,
    phase: phase === 'compose' ? 'compose' : 'progress',
    selectedIds: ids,
    slidersByStudentId: sessionCache?.coachId === coachId ? { ...sessionCache.slidersByStudentId } : {},
    practicedAtomIdsByStudentId,
    startedAt: new Date().toISOString(),
    updatedBy: 'app',
    schemaVersion: 1,
  }
  setCache(session)
  void persistSession(session)
  saveLastTrainingRoster(coachId, ids)
}

/**
 * @param {string} coachId
 * @param {Iterable<string>} selectedIds
 * @param {'compose' | 'progress'} [phase]
 */
export function updateGroupTrainingRoster(coachId, selectedIds, phase = 'compose') {
  const ids = [...new Set(selectedIds)]
  const base =
    sessionCache?.coachId === coachId
      ? sessionCache
      : {
          coachId,
          active: true,
          phase: 'compose',
          selectedIds: [],
          slidersByStudentId: {},
          practicedAtomIdsByStudentId: {},
          startedAt: new Date().toISOString(),
          updatedBy: 'app',
          schemaVersion: 1,
        }
  const session = {
    ...base,
    selectedIds: ids,
    phase: phase === 'progress' ? 'progress' : 'compose',
    updatedBy: 'app',
  }
  setCache(session)
  void persistSession(session)
  if (ids.length) saveLastTrainingRoster(coachId, ids)
}

/**
 * @param {string} coachId
 * @param {'compose' | 'progress'} phase
 */
export function setGroupTrainingPhase(coachId, phase) {
  if (!sessionCache || sessionCache.coachId !== coachId) return
  const session = {
    ...sessionCache,
    phase: phase === 'progress' ? 'progress' : 'compose',
    updatedBy: 'app',
  }
  setCache(session)
  void persistSession(session)
}

/**
 * @param {string} coachId
 * @param {string} studentId
 * @param {string[]} atomIds
 */
export function updateGroupTrainingSessionPracticed(coachId, studentId, atomIds) {
  if (!sessionCache || sessionCache.coachId !== coachId) return
  const clean = [...new Set(atomIds.filter((id) => typeof id === 'string' && id))]
  const practicedAtomIdsByStudentId = { ...sessionCache.practicedAtomIdsByStudentId }
  if (clean.length) practicedAtomIdsByStudentId[studentId] = clean
  else delete practicedAtomIdsByStudentId[studentId]
  const session = { ...sessionCache, practicedAtomIdsByStudentId, updatedBy: 'app' }
  setCache(session)
  void persistSession(session)
}

/**
 * Задел для варианта C: ползунки сессии (пока только в Firestore, запись в карточку — из приложения).
 * @param {string} coachId
 * @param {string} studentId
 * @param {GroupTrainingSliderTiers} tiers
 */
export function updateGroupTrainingSessionSliders(coachId, studentId, tiers) {
  if (!sessionCache || sessionCache.coachId !== coachId) return
  const session = {
    ...sessionCache,
    slidersByStudentId: {
      ...sessionCache.slidersByStudentId,
      [studentId]: { l1: tiers.l1, l2: tiers.l2, l3: tiers.l3 },
    },
    updatedBy: 'app',
  }
  setCache(session)
  void persistSession(session)
}

/**
 * @param {string | undefined | null} [coachId]
 */
export function endGroupTrainingSession(coachId) {
  if (coachId && sessionCache && sessionCache.coachId !== coachId) return
  setCache(null)
  if (coachId) void deleteGroupTrainingFirestore(coachId)
}

export function clearGroupTrainingSession() {
  const coachId = sessionCache?.coachId
  setCache(null)
  if (coachId) void deleteGroupTrainingFirestore(coachId)
}

/**
 * @param {string | undefined | null} coachId
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeGroupTrainingSession(coachId, listener) {
  if (coachId) ensureFirestoreSubscription(coachId)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
