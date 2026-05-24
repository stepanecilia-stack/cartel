import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { normalizeCompetitionRange } from '../data/competitionLevels.js'
import { competitionDateToInputString } from '../utils/competitionDate.js'
import { normalizeCoachEvent } from '../utils/coachEvents.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import db, { isFirebaseConfigured } from './firebaseService.js'

const COLLECTION_ID = 'coach_events'

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase не настроен. Проверьте VITE_FIREBASE_* в .env')
  }
  return db
}

/**
 * @param {string} coachId
 * @param {(events: import('../utils/coachEvents.js').CoachEvent[]) => void} onData
 * @param {(err: Error) => void} [onError]
 */
export function subscribeCoachEvents(coachId, onData, onError) {
  if (!coachId) {
    onData([])
    return () => {}
  }
  if (!isFirebaseConfigured || !db) {
    onError?.(new Error('Firebase не настроен'))
    onData([])
    return () => {}
  }

  const q = query(collection(ensureDb(), COLLECTION_ID), where('coachId', '==', coachId))
  return onSnapshot(
    q,
    (snap) => {
      const list = []
      for (const d of snap.docs) {
        const ev = normalizeCoachEvent(d.data(), d.id, coachId)
        if (ev) list.push(ev)
      }
      list.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      onData(list)
    },
    (err) => {
      console.error('[coach_events]', err)
      onError?.(new Error(formatFirestoreErrorMessage(err)))
      onData([])
    },
  )
}

/**
 * @param {string} coachId
 * @param {{
 *   title: string,
 *   kind: import('../utils/coachEvents.js').CoachEventKind,
 *   dateISO: string,
 *   dateEndISO: string,
 *   participantIds?: string[],
 * }} payload
 */
export async function createCoachEvent(coachId, payload) {
  if (!coachId) {
    throw new Error('Войдите в аккаунт тренера.')
  }
  const range = normalizeCompetitionRange(payload.dateISO, payload.dateEndISO)
  const ref = await addDoc(collection(ensureDb(), COLLECTION_ID), {
    coachId,
    title: payload.title.trim(),
    kind: payload.kind === 'competition' ? 'competition' : 'practice',
    dateISO: range.dateISO,
    dateEndISO: range.dateEndISO,
    participantIds: [...new Set(payload.participantIds ?? [])],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/**
 * @param {string} eventId
 * @param {Partial<{
 *   title: string,
 *   kind: import('../utils/coachEvents.js').CoachEventKind,
 *   dateISO: string,
 *   dateEndISO: string,
 *   participantIds: string[],
 * }>} patch
 */
export async function updateCoachEvent(eventId, patch) {
  const ref = doc(ensureDb(), COLLECTION_ID, eventId)
  /** @type {Record<string, unknown>} */
  const data = { updatedAt: serverTimestamp() }
  if (patch.title != null) data.title = patch.title.trim()
  if (patch.kind != null) data.kind = patch.kind === 'competition' ? 'competition' : 'practice'
  if (patch.participantIds != null) {
    data.participantIds = [...new Set(patch.participantIds)]
  }
  if (patch.dateISO != null || patch.dateEndISO != null) {
    const startRaw = patch.dateISO ?? patch.dateEndISO
    const endRaw = patch.dateEndISO ?? patch.dateISO
    const start = competitionDateToInputString(startRaw) || String(startRaw ?? '').trim()
    const end = competitionDateToInputString(endRaw) || start
    const range = normalizeCompetitionRange(start, end)
    data.dateISO = range.dateISO
    data.dateEndISO = range.dateEndISO
  }
  await updateDoc(ref, data)
}

/** @param {string} eventId */
export async function deleteCoachEvent(eventId) {
  await deleteDoc(doc(ensureDb(), COLLECTION_ID, eventId))
}

/**
 * @param {string} eventId
 * @param {string} studentId
 * @param {string[]} currentParticipantIds
 */
export async function removeParticipantFromCoachEvent(eventId, studentId, currentParticipantIds) {
  const next = currentParticipantIds.filter((id) => id !== studentId)
  if (next.length === 0) {
    await deleteCoachEvent(eventId)
    return
  }
  await updateCoachEvent(eventId, { participantIds: next })
}
