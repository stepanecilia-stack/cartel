import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { MOTOR_QUALITY_SLUG_BY_TITLE } from '../data/motorQualitiesCatalog.js'
import { setMotorQualityExercisesCache } from '../data/motorQualityExercises.js'
import db, { isFirebaseConfigured } from './firebaseService.js'
import {
  addLocalExercise,
  deleteLocalExercise,
  loadLocalExerciseDocs,
  updateLocalExercise,
} from './motorQualityExercisesLocal.js'

const COLLECTION_ID = 'motor_quality_exercises'

/** @type {'firestore' | 'local'} */
let storageMode = 'firestore'

/** true только после ошибки прав Firestore — не путать с пустой коллекцией */
let firestoreExercisesBlocked = false

export function getMotorQualityExercisesStorageMode() {
  return storageMode
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

function exercisesCollection() {
  return collection(ensureDb(), COLLECTION_ID)
}

function trimOrNull(value) {
  if (value == null) return null
  const s = String(value).trim()
  return s.length ? s : null
}

function parseOptionalAge(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 99) return null
  return Math.round(n)
}

function omitUndefined(value) {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => omitUndefined(item))
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue
    const nested = omitUndefined(v)
    if (nested !== undefined) out[k] = nested
  }
  return out
}

function docToExercise(id, data) {
  const media = data?.media && typeof data.media === 'object' ? data.media : {}
  return {
    id,
    title: String(data.title ?? '').trim(),
    intent: String(data.intent ?? '').trim(),
    cues: trimOrNull(data.cues) ?? undefined,
    avoid: trimOrNull(data.avoid) ?? undefined,
    contraindications: trimOrNull(data.contraindications) ?? undefined,
    minAge: data.minAge != null && Number.isFinite(data.minAge) ? data.minAge : undefined,
    maxAge: data.maxAge != null && Number.isFinite(data.maxAge) ? data.maxAge : undefined,
    doseUnder12: trimOrNull(data.doseUnder12) ?? undefined,
    dose13to15: trimOrNull(data.dose13to15) ?? undefined,
    dose16Plus: trimOrNull(data.dose16Plus) ?? undefined,
    media: {
      gifSrc: trimOrNull(media.gifSrc),
      webmSrc: trimOrNull(media.webmSrc),
    },
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
  }
}

function groupDocsToCache(docs) {
  /** @type {Record<string, import('../data/motorQualityExercises.js').MotorQualityExercise[]>} */
  const bySlug = {}
  for (const snap of docs) {
    const data = typeof snap.data === 'function' ? snap.data() : snap
    const id = snap.id
    const slug = trimOrNull(data?.qualitySlug)
    if (!slug) continue
    if (!bySlug[slug]) bySlug[slug] = []
    bySlug[slug].push(docToExercise(id, data))
  }
  for (const list of Object.values(bySlug)) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title, 'ru'))
  }
  setMotorQualityExercisesCache(bySlug)
}

function mergeDocSnapshots(...docLists) {
  const byId = new Map()
  for (const docs of docLists) {
    for (const snap of docs) {
      byId.set(snap.id, snap)
    }
  }
  return [...byId.values()]
}

function applyExercisesCache(firestoreDocs = [], { blocked = firestoreExercisesBlocked } = {}) {
  firestoreExercisesBlocked = blocked
  storageMode = blocked ? 'local' : 'firestore'
  const merged = blocked
    ? mergeDocSnapshots([], loadLocalExerciseDocs())
    : mergeDocSnapshots(firestoreDocs, loadLocalExerciseDocs())
  groupDocsToCache(merged)
}

let unsubscribeSnapshot = null

/**
 * @returns {() => void}
 */
export function subscribeMotorQualityExercises() {
  if (!isFirebaseConfigured) {
    applyExercisesCache([], { blocked: true })
    return () => setMotorQualityExercisesCache({})
  }

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot()
    unsubscribeSnapshot = null
  }

  firestoreExercisesBlocked = false
  storageMode = 'firestore'

  const q = query(exercisesCollection())
  unsubscribeSnapshot = onSnapshot(
    q,
    (snapshot) => {
      applyExercisesCache(snapshot.docs, { blocked: false })
    },
    (err) => {
      console.error('subscribeMotorQualityExercises', err)
      if (isPermissionError(err)) {
        applyExercisesCache([], { blocked: true })
        return
      }
      setMotorQualityExercisesCache({})
    },
  )

  return () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }
    setMotorQualityExercisesCache({})
  }
}

export async function loadMotorQualityExercisesOnce() {
  if (!isFirebaseConfigured) {
    applyExercisesCache([], { blocked: true })
    return
  }
  try {
    const snapshot = await getDocs(query(exercisesCollection()))
    applyExercisesCache(snapshot.docs, { blocked: false })
  } catch (err) {
    if (isPermissionError(err)) applyExercisesCache([], { blocked: true })
    else throw err
  }
}

const VALID_SLUGS = new Set(Object.values(MOTOR_QUALITY_SLUG_BY_TITLE))

function buildExerciseFields(qualitySlug, payload) {
  const slug = trimOrNull(qualitySlug)
  if (!slug || !VALID_SLUGS.has(slug)) {
    throw new Error('Неизвестное качество')
  }
  const title = trimOrNull(payload?.title)
  const intent = trimOrNull(payload?.intent)
  if (!title || !intent) {
    throw new Error('Укажите название и цель упражнения')
  }

  const minAge = parseOptionalAge(payload?.minAge)
  const maxAge = parseOptionalAge(payload?.maxAge)
  if (minAge != null && maxAge != null && minAge > maxAge) {
    throw new Error('Минимальный возраст не может быть больше максимального')
  }

  return {
    qualitySlug: slug,
    title,
    intent,
    cues: trimOrNull(payload?.cues),
    avoid: trimOrNull(payload?.avoid),
    contraindications: trimOrNull(payload?.contraindications),
    minAge,
    maxAge,
    doseUnder12: trimOrNull(payload?.doseUnder12),
    dose13to15: trimOrNull(payload?.dose13to15),
    dose16Plus: trimOrNull(payload?.dose16Plus),
    media: {
      gifSrc: trimOrNull(payload?.gifSrc),
      webmSrc: trimOrNull(payload?.webmSrc),
    },
  }
}

async function writeToFirestore(record) {
  return addDoc(exercisesCollection(), omitUndefined(record))
}

/**
 * @param {string} qualitySlug
 * @param {object} payload
 */
export async function addMotorQualityExercise(qualitySlug, payload) {
  const fields = buildExerciseFields(qualitySlug, payload)
  const record = {
    ...fields,
    sortOrder: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (!isFirebaseConfigured || firestoreExercisesBlocked) {
    const id = addLocalExercise({
      ...fields,
      sortOrder: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    applyExercisesCache([], { blocked: true })
    return id
  }

  try {
    const ref = await writeToFirestore(record)
    return ref.id
  } catch (err) {
    if (isPermissionError(err)) {
      firestoreExercisesBlocked = true
      const id = addLocalExercise({
        ...fields,
        sortOrder: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      try {
        const snapshot = await getDocs(query(exercisesCollection()))
        applyExercisesCache(snapshot.docs, { blocked: true })
      } catch {
        applyExercisesCache([], { blocked: true })
      }
      return id
    }
    throw err
  }
}

/**
 * @param {string} exerciseId
 * @param {string} qualitySlug
 * @param {object} payload
 */
export async function updateMotorQualityExercise(exerciseId, qualitySlug, payload) {
  if (!exerciseId || typeof exerciseId !== 'string') {
    throw new Error('Некорректный идентификатор упражнения')
  }
  const fields = buildExerciseFields(qualitySlug, payload)

  if (!isFirebaseConfigured || firestoreExercisesBlocked || exerciseId.startsWith('local-')) {
    updateLocalExercise(exerciseId, { ...fields, updatedAt: Date.now() })
    applyExercisesCache([], { blocked: true })
    return
  }

  try {
    await updateDoc(
      doc(ensureDb(), COLLECTION_ID, exerciseId),
      omitUndefined({
        ...fields,
        updatedAt: serverTimestamp(),
      }),
    )
  } catch (err) {
    if (isPermissionError(err)) {
      firestoreExercisesBlocked = true
      updateLocalExercise(exerciseId, { ...fields, updatedAt: Date.now() })
      applyExercisesCache([], { blocked: true })
      return
    }
    throw err
  }
}

/** @param {string} exerciseId */
export async function deleteMotorQualityExercise(exerciseId) {
  if (!exerciseId || typeof exerciseId !== 'string') {
    throw new Error('Некорректный идентификатор упражнения')
  }

  if (!isFirebaseConfigured || firestoreExercisesBlocked || exerciseId.startsWith('local-')) {
    deleteLocalExercise(exerciseId)
    applyExercisesCache([], { blocked: true })
    return
  }

  try {
    await deleteDoc(doc(ensureDb(), COLLECTION_ID, exerciseId))
  } catch (err) {
    if (isPermissionError(err)) {
      firestoreExercisesBlocked = true
      deleteLocalExercise(exerciseId)
      applyExercisesCache([], { blocked: true })
      return
    }
    throw err
  }
}
