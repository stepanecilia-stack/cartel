import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { normalizeOrientirExternalCamp } from '../utils/orientirParticipation.js'
import db, { isFirebaseConfigured } from './firebaseService.js'

const COLLECTION_ID = 'orientir_participation'

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase не настроен. Проверьте VITE_FIREBASE_* в .env')
  }
  return db
}

/** @param {string} coachId @param {string} orientirId */
function participationDocId(coachId, orientirId) {
  return `${coachId}__${orientirId}`
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string} id
 * @param {string} coachId
 */
function normalizeOrientirParticipation(raw, id, coachId) {
  const orientirId = typeof raw.orientirId === 'string' ? raw.orientirId.trim() : ''
  if (!orientirId) return null
  const participantIds = Array.isArray(raw.participantIds)
    ? [...new Set(raw.participantIds.filter((x) => typeof x === 'string' && x.trim()))]
    : []
  const externalCamp = normalizeOrientirExternalCamp(raw.externalCamp)
  return {
    id,
    coachId: typeof raw.coachId === 'string' ? raw.coachId : coachId,
    orientirId,
    participantIds,
    externalCamp,
  }
}

/**
 * @param {string} coachId
 * @param {(records: import('../utils/orientirParticipation.js').OrientirParticipation[]) => void} onData
 * @param {(err: Error) => void} [onError]
 */
export function subscribeOrientirParticipation(coachId, onData, onError) {
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
        const row = normalizeOrientirParticipation(d.data(), d.id, coachId)
        if (row) list.push(row)
      }
      onData(list)
    },
    (err) => {
      console.error('[orientir_participation]', err)
      onError?.(new Error(formatFirestoreErrorMessage(err)))
      onData([])
    },
  )
}

/**
 * @param {string} coachId
 * @param {string} orientirId
 * @param {{
 *   participantIds: string[],
 *   externalCamp?: import('../utils/orientirParticipation.js').OrientirExternalCamp | null,
 * }} payload
 */
export async function setOrientirParticipation(coachId, orientirId, payload) {
  if (!coachId) throw new Error('Войдите в аккаунт тренера.')
  if (!orientirId?.trim()) throw new Error('Не указан ориентир.')

  const participantIds = [...new Set(payload.participantIds.filter((x) => typeof x === 'string' && x.trim()))]
  const externalCamp = payload.externalCamp?.enabled ? payload.externalCamp : null
  const ref = doc(ensureDb(), COLLECTION_ID, participationDocId(coachId, orientirId))

  if (participantIds.length === 0 && !externalCamp) {
    await deleteDoc(ref)
    return
  }

  /** @type {Record<string, unknown>} */
  const data = {
    coachId,
    orientirId: orientirId.trim(),
    participantIds,
    updatedAt: serverTimestamp(),
  }
  if (externalCamp) {
    data.externalCamp = externalCamp
  } else {
    data.externalCamp = null
  }

  await setDoc(ref, data, { merge: true })
}
