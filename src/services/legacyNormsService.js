import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { getNormsCache, setNormsCache } from '../data/normsCache.js'
import db, { getCoachProfile, getCurrentCoachId, isFirebaseConfigured } from './firebaseService.js'
import { isProgramAdmin } from '../utils/coachRoles.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { loadLegacyNorms } from '../utils/ksrUtils.js'
import {
  legacyNormDocId,
  legacyNormFromFirestore,
  legacyNormToFirestore,
  sortLegacyNorms,
} from '../utils/legacyNormModel.js'

const COLLECTION_ID = 'legacy_norms'
const BATCH_SIZE = 400

let unsubscribeSnapshot = null
/** @type {string | null} */
let lastSyncError = null
/** @type {Promise<object[]> | null} */
let loadPromise = null
/** @type {'firestore' | 'csv' | null} */
let normsSource = null

export function getLegacyNormsSyncError() {
  return lastSyncError
}

export function getLegacyNormsSource() {
  return normsSource
}

function isPermissionError(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return code === 'permission-denied' || /insufficient permissions/i.test(msg)
}

function ensureDb() {
  if (!db) throw new Error('Firebase не настроен')
  return db
}

function normsCollection() {
  return collection(ensureDb(), COLLECTION_ID)
}

function setSyncError(err) {
  lastSyncError = err ? formatFirestoreErrorMessage(err) : null
}

/** @param {import('firebase/firestore').QueryDocumentSnapshot[]} docs */
function applyFirestoreDocs(docs) {
  const rows = docs
    .map((snap) => legacyNormFromFirestore(snap.data()))
    .filter((row) => row.category && row.testId && row.testName)
  if (rows.length === 0) return false
  normsSource = 'firestore'
  setNormsCache(sortLegacyNorms(rows))
  setSyncError(null)
  return true
}

/** @param {object[]} rows */
function applyCsvNorms(rows) {
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) return
  normsSource = 'csv'
  setNormsCache(sortLegacyNorms(list))
  setSyncError(null)
}

async function loadNormsFromCsv() {
  const rows = await loadLegacyNorms()
  applyCsvNorms(rows)
  return getNormsCache()
}

/**
 * Одна загрузка: Firestore → при пустой коллекции CSV (резерв).
 */
export async function loadLegacyNormsOnce() {
  if (getNormsCache().length > 0) return getNormsCache()
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    if (!isFirebaseConfigured) {
      return loadNormsFromCsv()
    }
    try {
      const snapshot = await getDocs(query(normsCollection()))
      if (applyFirestoreDocs(snapshot.docs)) {
        return getNormsCache()
      }
    } catch (err) {
      console.error('loadLegacyNormsOnce Firestore', err)
      setSyncError(err)
      if (!isPermissionError(err)) {
        loadPromise = null
        throw err
      }
    }
    return loadNormsFromCsv()
  })()
    .catch((err) => {
      loadPromise = null
      throw err
    })
    .finally(() => {
      loadPromise = null
    })

  return loadPromise
}

/** @returns {() => void} */
export function subscribeLegacyNorms() {
  if (!isFirebaseConfigured) {
    setSyncError(new Error('Firebase не настроен'))
    void loadNormsFromCsv().catch(() => {})
    return () => {}
  }

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot()
    unsubscribeSnapshot = null
  }

  unsubscribeSnapshot = onSnapshot(
    query(normsCollection()),
    (snapshot) => {
      if (snapshot.size > 0) {
        applyFirestoreDocs(snapshot.docs)
        return
      }
      if (getNormsCache().length === 0) {
        void loadNormsFromCsv().catch((err) => {
          console.error('subscribeLegacyNorms csv fallback', err)
          setSyncError(err)
        })
      }
    },
    (err) => {
      console.error('subscribeLegacyNorms', err)
      setSyncError(err)
      if (getNormsCache().length === 0) {
        void loadNormsFromCsv().catch(() => {})
      }
    },
  )

  return () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }
    lastSyncError = null
    normsSource = null
  }
}

/**
 * Загрузить нормативы из Google Sheets в Firestore (только администратор программы).
 * @returns {Promise<number>} число записанных документов
 */
export async function publishLegacyNormsFromSheet() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase не настроен.')
  }
  const coachId = getCurrentCoachId()
  if (!coachId) throw new Error('Войдите в аккаунт тренера.')
  const profile = await getCoachProfile(coachId)
  if (!isProgramAdmin(profile)) {
    throw new Error('Публикация нормативов доступна только администратору программы.')
  }

  const rows = await loadLegacyNorms()
  if (!rows.length) throw new Error('Таблица нормативов пуста или недоступна.')

  const database = ensureDb()
  let written = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(database)
    for (const norm of chunk) {
      const id = legacyNormDocId(norm)
      batch.set(doc(database, COLLECTION_ID, id), {
        ...legacyNormToFirestore(norm),
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
    written += chunk.length
  }

  normsSource = 'firestore'
  setNormsCache(sortLegacyNorms(rows))
  setSyncError(null)
  return written
}

/** @deprecated Используйте loadLegacyNormsOnce — оставлено для совместимости импортов. */
export const loadNormsOnce = loadLegacyNormsOnce
