import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { EMPTY_TIER_COVERS } from '../data/technicalProgramAtomsCache.js'
import { getDefaultTechnicalProgramAtoms } from '../data/technicalProgramAtomsDefaults.js'
import { PROGRAM_TIER_COVER_DOC_IDS } from '../utils/technicalProgramTierCovers.js'
import { getDefaultTechnicalLevel3Atoms } from '../utils/technicalProgramAtomsResolved.js'
import {
  getTechnicalProgramAtomsCache,
  setTechnicalProgramAtomsCache,
} from '../data/technicalProgramAtomsCache.js'
import db, { getCoachProfile, getCurrentCoachId, isFirebaseConfigured } from './firebaseService.js'
import { isProgramAdmin } from '../utils/coachRoles.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'

const COLLECTION_ID = 'technical_program_atoms'

let unsubscribeSnapshot = null
/** @type {string | null} */
let lastSyncError = null

export function getTechnicalProgramAtomsSyncError() {
  return lastSyncError
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

/** Поле из Firestore: если ключ задан (в т.ч. null) — не подставляем дефолт программы. */
function pickOverrideField(override, key, defaultVal) {
  if (!override || typeof override !== 'object') return defaultVal ?? null
  if (Object.prototype.hasOwnProperty.call(override, key)) {
    return trimOrNull(override[key])
  }
  return defaultVal ?? null
}

function pickOverrideMedia(override, key, defaultVal) {
  if (!override || typeof override !== 'object') return defaultVal ?? null
  const m = override.media && typeof override.media === 'object' ? override.media : {}
  if (Object.prototype.hasOwnProperty.call(m, key)) {
    return trimOrNull(m[key])
  }
  return defaultVal ?? null
}

function mergeAtom(defaultAtom, override) {
  if (!override) {
    return {
      ...defaultAtom,
      media: {
        posterSrc: defaultAtom.media?.posterSrc ?? null,
        webmSrc: defaultAtom.media?.webmSrc ?? null,
        detailPosterSrc: defaultAtom.media?.detailPosterSrc ?? null,
        detailWebmSrc: defaultAtom.media?.detailWebmSrc ?? null,
      },
    }
  }
  return {
    ...defaultAtom,
    name: pickOverrideField(override, 'name', defaultAtom.name),
    howTo: pickOverrideField(override, 'howTo', defaultAtom.howTo),
    whyHowTo: pickOverrideField(override, 'whyHowTo', defaultAtom.whyHowTo),
    mistakes: pickOverrideField(override, 'mistakes', defaultAtom.mistakes),
    whyMistakes: pickOverrideField(override, 'whyMistakes', defaultAtom.whyMistakes),
    media: {
      posterSrc: pickOverrideMedia(override, 'posterSrc', defaultAtom.media?.posterSrc),
      webmSrc: pickOverrideMedia(override, 'webmSrc', defaultAtom.media?.webmSrc),
      detailPosterSrc: pickOverrideMedia(override, 'detailPosterSrc', defaultAtom.media?.detailPosterSrc),
      detailWebmSrc: pickOverrideMedia(override, 'detailWebmSrc', defaultAtom.media?.detailWebmSrc),
    },
  }
}

function parseTierCoverDoc(data) {
  if (!data || data.kind !== 'tier_cover') return null
  const tier = Number(data.tier)
  if (tier !== 1 && tier !== 2 && tier !== 3) return null
  const posterSrc = trimOrNull(data.media?.posterSrc)
  return { tier, posterSrc }
}

function buildCacheFromOverrides(overrideDocs) {
  const defaults = getDefaultTechnicalProgramAtoms()
  const byId = new Map()
  const tierCovers = { ...EMPTY_TIER_COVERS }
  for (const snap of overrideDocs) {
    const data = typeof snap.data === 'function' ? snap.data() : snap
    const cover = parseTierCoverDoc(data)
    if (cover) {
      tierCovers[cover.tier] = cover.posterSrc
      continue
    }
    const atomId = trimOrNull(data?.atomId) || snap.id
    if (!atomId || atomId.startsWith('tier_cover_')) continue
    byId.set(atomId, { atomId, ...data })
  }

  const level1 = defaults.level1.map((d) => mergeAtom(d, byId.get(d.id)))
  const level2 = defaults.level2.map((d) => mergeAtom(d, byId.get(d.id)))
  const level3 = getDefaultTechnicalLevel3Atoms(level1).map((d) => mergeAtom(d, byId.get(d.id)))
  setTechnicalProgramAtomsCache({ level1, level2, level3, tierCovers })
}

function setSyncError(err) {
  lastSyncError = err ? formatFirestoreErrorMessage(err) : null
}

function applyFirestoreDocs(docs) {
  lastSyncError = null
  buildCacheFromOverrides(docs)
}

function applyDefaultsOnly() {
  buildCacheFromOverrides([])
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
  const { level2 } = getTechnicalProgramAtomsCache()
  return level2.length ? level2 : getDefaultTechnicalProgramAtoms().level2
}

export function getTechnicalProgramAtomsLevel3() {
  const { level1, level3 } = getTechnicalProgramAtomsCache()
  return level3.length ? level3 : getDefaultTechnicalLevel3Atoms(level1)
}

export async function loadTechnicalProgramAtomsOnce() {
  const { ensureCoachCatalogSync } = await import('../data/coachCatalogSync.js')
  ensureCoachCatalogSync()
  applyDefaultsOnly()
  if (!isFirebaseConfigured) {
    setSyncError(new Error('Firebase не настроен'))
    return
  }
  try {
    const snapshot = await getDocs(query(atomsCollection()))
    applyFirestoreDocs(snapshot.docs)
  } catch (err) {
    console.error('loadTechnicalProgramAtomsOnce', err)
    applyDefaultsOnly()
    setSyncError(err)
    if (!isPermissionError(err)) throw err
  }
}

/** @returns {() => void} */
export function subscribeTechnicalProgramAtoms() {
  applyDefaultsOnly()

  if (!isFirebaseConfigured) {
    setSyncError(new Error('Firebase не настроен'))
    return () => applyDefaultsOnly()
  }

  if (unsubscribeSnapshot) {
    unsubscribeSnapshot()
    unsubscribeSnapshot = null
  }

  unsubscribeSnapshot = onSnapshot(
    query(atomsCollection()),
    (snapshot) => applyFirestoreDocs(snapshot.docs),
    (err) => {
      console.error('subscribeTechnicalProgramAtoms', err)
      applyDefaultsOnly()
      setSyncError(err)
    },
  )

  return () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot()
      unsubscribeSnapshot = null
    }
    lastSyncError = null
    applyDefaultsOnly()
  }
}

/**
 * @param {string} atomId
 * @param {number} tier 1 | 2 | 3
 * @param {object} payload
 */
export async function saveTechnicalProgramAtomMedia(atomId, tier, payload) {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase не настроен. Медиа элементов программы сохраняются только в облако (коллекция technical_program_atoms).',
    )
  }

  const coachId = getCurrentCoachId()
  if (!coachId) {
    throw new Error('Войдите в аккаунт тренера.')
  }
  const profile = await getCoachProfile(coachId)
  if (!isProgramAdmin(profile)) {
    throw new Error('Редактирование каталога техники доступно только администратору программы.')
  }

  const defaults = getDefaultTechnicalProgramAtoms()
  const level1 = getTechnicalProgramAtomsCache().level1.length
    ? getTechnicalProgramAtomsCache().level1
    : defaults.level1
  const list =
    tier === 3
      ? getDefaultTechnicalLevel3Atoms(level1)
      : tier === 2
        ? defaults.level2
        : defaults.level1
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
    media: {
      posterSrc: trimOrNull(payload?.posterSrc),
      webmSrc: trimOrNull(payload?.webmSrc),
      detailPosterSrc: trimOrNull(payload?.detailPosterSrc),
      detailWebmSrc: trimOrNull(payload?.detailWebmSrc),
    },
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(ensureDb(), COLLECTION_ID, atomId), record)
  return atomId
}

/**
 * Общая обложка уровня (картинка для атомов без своего WebM).
 * @param {1 | 2 | 3} tier
 * @param {string | null | undefined} posterSrc
 */
export async function saveTechnicalProgramTierCover(tier, posterSrc) {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase не настроен.')
  }
  const t = Number(tier)
  if (t !== 1 && t !== 2 && t !== 3) throw new Error('Некорректный уровень программы.')

  const coachId = getCurrentCoachId()
  if (!coachId) throw new Error('Войдите в аккаунт тренера.')
  const profile = await getCoachProfile(coachId)
  if (!isProgramAdmin(profile)) {
    throw new Error('Редактирование каталога техники доступно только администратору программы.')
  }

  const docId = PROGRAM_TIER_COVER_DOC_IDS[t]
  await setDoc(doc(ensureDb(), COLLECTION_ID, docId), {
    kind: 'tier_cover',
    tier: t,
    atomId: docId,
    media: { posterSrc: trimOrNull(posterSrc) },
    updatedAt: serverTimestamp(),
  })
  return docId
}
