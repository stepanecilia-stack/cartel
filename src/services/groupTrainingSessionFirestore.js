import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import db from './firebaseService.js'

export const GROUP_TRAINING_DOC_ID = 'active'

/** @typedef {'compose' | 'progress'} GroupTrainingPhase */
/** @typedef {{ l1: number, l2: number, l3: number }} GroupTrainingSliderTiers */

/**
 * @typedef {{
 *   coachId: string,
 *   active: boolean,
 *   phase: GroupTrainingPhase,
 *   selectedIds: string[],
 *   slidersByStudentId: Record<string, GroupTrainingSliderTiers>,
 *   practicedAtomIdsByStudentId: Record<string, string[]>,
 *   startedAt: string,
 *   updatedBy?: 'app' | 'telegram',
 *   schemaVersion: number,
 * }} GroupTrainingSessionDoc
 */

/**
 * @param {string} coachId
 */
export function groupTrainingSessionRef(coachId) {
  if (!db) throw new Error('Firebase не настроен')
  return doc(db, 'coaches', coachId, 'group_training', GROUP_TRAINING_DOC_ID)
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @param {string} coachId
 * @returns {GroupTrainingSessionDoc | null}
 */
export function parseGroupTrainingSessionDoc(raw, coachId) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.active === false) return null
  const selectedIds = Array.isArray(raw.selectedIds)
    ? raw.selectedIds.filter((id) => typeof id === 'string' && id)
    : []
  const slidersByStudentId =
    raw.slidersByStudentId && typeof raw.slidersByStudentId === 'object'
      ? /** @type {Record<string, GroupTrainingSliderTiers>} */ (raw.slidersByStudentId)
      : {}
  const practicedAtomIdsByStudentId = {}
  if (
    raw.practicedAtomIdsByStudentId &&
    typeof raw.practicedAtomIdsByStudentId === 'object'
  ) {
    for (const [studentId, ids] of Object.entries(raw.practicedAtomIdsByStudentId)) {
      if (typeof studentId !== 'string' || !studentId || !Array.isArray(ids)) continue
      const clean = [...new Set(ids.filter((id) => typeof id === 'string' && id))]
      if (clean.length) practicedAtomIdsByStudentId[studentId] = clean
    }
  }
  const phase = raw.phase === 'progress' ? 'progress' : 'compose'
  return {
    coachId,
    active: true,
    phase,
    selectedIds,
    slidersByStudentId,
    practicedAtomIdsByStudentId,
    startedAt:
      typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString(),
    updatedBy: raw.updatedBy === 'telegram' ? 'telegram' : 'app',
    schemaVersion: Number(raw.schemaVersion) || 1,
  }
}

/**
 * @param {GroupTrainingSessionDoc} session
 */
export function groupTrainingSessionToFirestore(session) {
  return {
    active: true,
    phase: session.phase === 'progress' ? 'progress' : 'compose',
    selectedIds: session.selectedIds,
    slidersByStudentId: session.slidersByStudentId ?? {},
    practicedAtomIdsByStudentId: session.practicedAtomIdsByStudentId ?? {},
    startedAt: session.startedAt,
    updatedAt: serverTimestamp(),
    updatedBy: session.updatedBy === 'telegram' ? 'telegram' : 'app',
    schemaVersion: session.schemaVersion || 1,
  }
}

/**
 * @param {string} coachId
 * @param {(session: GroupTrainingSessionDoc | null) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeGroupTrainingFirestore(coachId, onData, onError) {
  if (!db || !coachId) {
    onData(null)
    return () => {}
  }
  return onSnapshot(
    groupTrainingSessionRef(coachId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(parseGroupTrainingSessionDoc(snap.data(), coachId))
    },
    (err) => {
      console.warn('groupTrainingSessionFirestore subscribe', err)
      onError?.(err)
    },
  )
}

/**
 * @param {string} coachId
 * @param {GroupTrainingSessionDoc} session
 */
export async function writeGroupTrainingFirestore(coachId, session) {
  if (!db || !coachId) return
  await setDoc(groupTrainingSessionRef(coachId), groupTrainingSessionToFirestore(session), {
    merge: true,
  })
}

/**
 * @param {string} coachId
 */
export async function deleteGroupTrainingFirestore(coachId) {
  if (!db || !coachId) return
  await deleteDoc(groupTrainingSessionRef(coachId))
}
