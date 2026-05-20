import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import {
  DEFAULT_TECHNICAL_LEVEL2,
  getDefaultTechnicalProgramAtoms,
} from '../data/technicalProgramAtomsDefaults.js'
import {
  getTechnicalProgramAtomsCache,
  setTechnicalProgramAtomsCache,
} from '../data/technicalProgramAtomsCache.js'
import db, { isFirebaseConfigured } from './firebaseService.js'
import { loadLocalAtomDocs, upsertLocalAtom } from './technicalProgramAtomsLocal.js'

const COLLECTION_ID = 'technical_program_atoms'

/** @type {'firestore' | 'local'} */
let storageMode = 'firestore'
let firestoreBlocked = false
let unsubscribeSnapshot = null

export function getTechnicalProgramAtomsStorageMode() {
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

function atomsCollection() {
  return collection(ensureDb(), COLLECTION_ID)
}

function trimOrNull(value) {
  if (value == null) return null
  const s = String(value).trim()
  return s.length ? s : null
}

function mergeAtom(defaultAtom, override) {
  if (!override) return { ...defaultAtom, media: { gifSrc: null, webmSrc: null } }
  const m = override.media && typeof override.media === 'object' ? override.media : {}
  return {
    ...defaultAtom,
    name: trimOrNull(override.name) ?? defaultAtom.name,
    howTo: trimOrNull(override.howTo) ?? defaultAtom.howTo,
    whyHowTo: trimOrNull(override.whyHowTo) ?? defaultAtom.whyHowTo,
    mistakes: trimOrNull(override.mistakes) ?? defaultAtom.mistakes,
    whyMistakes: trimOrNull(override.whyMistakes) ?? defaultAtom.whyMistakes,
    videoLink: trimOrNull(override.videoLink) ?? defaultAtom.videoLink,
    embedUrl: trimOrNull(override.embedUrl) ?? defaultAtom.embedUrl,
    media: {
      gifSrc: trimOrNull(m.gifSrc),
      webmSrc: trimOrNull(m.webmSrc),
    },
  }
}

function buildCacheFromOverrides(overrideDocs) {
  const defaults = getDefaultTechnicalProgramAtoms()
  const byId = new Map()
  for (const snap of overrideDocs) {
    const data = typeof snap.data === 'function' ? snap.data() : snap
    const atomId = trimOrNull(data?.atomId) || snap.id
    if (!atomId) continue
    byId.set(atomId, { atomId, ...data })
  }

  const level1 = defaults.level1.map((d) => mergeAtom(d, byId.get(d.id)))
  const level2 = defaults.level2.map((d) => mergeAtom(d, byId.get(d.id)))
  setTechnicalProgramAtomsCache({ level1, level2 })
}

function applyCache(firestoreDocs = [], { blocked = firestoreBlocked } = {}) {
  firestoreBlocked = blocked
  storageMode = blocked ? 'local' : 'firestore'
  const localDocs = loadLocalAtomDocs()
  const merged = blocked ? localDocs : [...firestoreDocs, ...localDocs.filter((l) => !firestoreDocs.some((f) => f.id === l.id))]
  buildCacheFromOverrides(merged)
}

/**
 * @returns {Promise<import('../utils/ksrUtils.js').TechnicalAtom[]>}
 */
export async function getTechnicalProgramAtoms() {
  const { level1 } = getTechnicalProgramAtomsCache()
  if (level1.length > 0) return level1
  await loadTechnicalProgramAtomsOnce()
  return getTechnicalProgramAtomsCache().level1
}

export function getTechnicalProgramAtomsLevel2() {
  return getTechnicalProgramAtomsCache().level2.length
    ? getTechnicalProgramAtomsCache().level2
    : DEFAULT_TECHNICAL_LEVEL2
}

export async function loadTechnicalProgramAtomsOnce() {
  if (!isFirebaseConfigured) {
    applyCache([], { blocked: true })
    return
  }
  try {
    const snapshot = await getDocs(query(atomsCollection()))
    applyCache(snapshot.docs, { blocked: false })
  } catch (err) {
    if (isPermissionError(err)) applyCache([], { blocked: true })
    else throw err
  }
}

/** @returns {() => void} */
export function subscribeTechnicalProgramAtoms() {
  if (!isFirebaseConfigured) {
    applyCache([], { blocked: true })
    return () => setTechnicalProgramAtomsCache({ level1: [], level2: [] })
  }

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot()
    unsubscribeSnapshot = null
  }

  firestoreBlocked = false
  storageMode = 'firestore'

  unsubscribeSnapshot = onSnapshot(
    query(atomsCollection()),
    (snapshot) => applyCache(snapshot.docs, { blocked: false }),
    (err) => {
      console.error('subscribeTechnicalProgramAtoms', err)
      if (isPermissionError(err)) applyCache([], { blocked: true })
      else applyCache([], { blocked: true })
    },
  )

  return () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }
    setTechnicalProgramAtomsCache({ level1: [], level2: [] })
  }
}

/**
 * @param {string} atomId
 * @param {number} tier 1 | 2
 * @param {object} payload
 */
export async function saveTechnicalProgramAtomMedia(atomId, tier, payload) {
  const defaults = getDefaultTechnicalProgramAtoms()
  const list = tier === 2 ? defaults.level2 : defaults.level1
  const base = list.find((a) => a.id === atomId)
  if (!base) throw new Error('Неизвестный элемент программы')

  const record = {
    atomId,
    tier,
    number: base.number,
    name: trimOrNull(payload?.name) ?? base.name,
    howTo: trimOrNull(payload?.howTo) ?? base.howTo,
    whyHowTo: trimOrNull(payload?.whyHowTo) ?? base.whyHowTo,
    mistakes: trimOrNull(payload?.mistakes) ?? base.mistakes,
    whyMistakes: trimOrNull(payload?.whyMistakes) ?? base.whyMistakes,
    videoLink: trimOrNull(payload?.videoLink) ?? base.videoLink,
    embedUrl: trimOrNull(payload?.embedUrl) ?? base.embedUrl,
    media: {
      gifSrc: trimOrNull(payload?.gifSrc),
      webmSrc: trimOrNull(payload?.webmSrc),
    },
    updatedAt: serverTimestamp(),
  }

  if (!isFirebaseConfigured || storageMode === 'local') {
    upsertLocalAtom(record)
    applyCache(loadLocalAtomDocs(), { blocked: true })
    return atomId
  }

  await setDoc(doc(ensureDb(), COLLECTION_ID, atomId), record, { merge: true })
  return atomId
}
