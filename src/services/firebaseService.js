import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getCoachProfileCache } from '../data/coachProfileCache.js'
import { inferUpdateSectionFromPayload } from '../utils/studentUpdateSections.js'

const trimEnv = (value) => (typeof value === 'string' ? value.trim() : value)

export const firebaseConfig = {
  apiKey: trimEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trimEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trimEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: trimEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: trimEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: trimEnv(import.meta.env.VITE_FIREBASE_APP_ID),
}

const hasFirebaseConfig =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.authDomain) &&
  Boolean(firebaseConfig.projectId) &&
  firebaseConfig.apiKey !== 'undefined'

/** false на проде, если при сборке не были заданы VITE_FIREBASE_* (например в Vercel → Environment Variables). */
export const isFirebaseConfigured = hasFirebaseConfig

let app = null
let db = null
let auth = null

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  try {
    auth = getAuth(app)
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error)
    auth = null
  }
}

export const ensureDb = () => {
  if (!db) throw new Error('Firebase не настроен: отсутствует валидный конфиг')
  return db
}

export const ensureAuth = () => {
  if (!auth) throw new Error('Firebase Auth недоступен: проверьте конфигурацию')
  return auth
}

export const getCurrentCoachId = () => auth?.currentUser?.uid ?? null
export const studentsCollection = db ? collection(db, 'students') : null
export const accessCodesCollection = db ? collection(db, 'accessCodes') : null
export const publicStudentSharesCollection = db ? collection(db, 'public_student_shares') : null

/** Непредсказуемый токен для ссылки /share/:token (не ID документа). */
export function generateOpaqueShareToken() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(24)
    crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.padEnd(48, '0').slice(0, 48)
}

/** Публичная карточка прогресса (чтение без входа в аккаунт). */
export const getPublicStudentShareByToken = async (token) => {
  if (!token || typeof token !== 'string' || token.length < 16) return null
  const snap = await getDoc(doc(ensureDb(), 'public_student_shares', token))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Подписка на публичную карточку (realtime). Возвращает функцию отписки.
 */
export const subscribePublicStudentShareByToken = (token, onData, onError) => {
  if (!db || !token || typeof token !== 'string' || token.length < 16) {
    onData?.(null)
    return () => {}
  }
  const ref = doc(ensureDb(), 'public_student_shares', token)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData?.(null)
        return
      }
      onData?.({ id: snap.id, ...snap.data() })
    },
    (err) => {
      console.error('subscribePublicStudentShareByToken', err)
      onError?.(err)
    },
  )
}

export const setPublicStudentShareDocument = async (token, { payload, ownerCoachIds = [] }) => {
  if (!token || typeof token !== 'string') throw new Error('Некорректный токен ссылки')
  const safePayload = deepOmitUndefined(payload)
  if (safePayload === undefined) throw new Error('Пустой payload для публичной страницы')
  await setDoc(
    doc(ensureDb(), 'public_student_shares', token),
    {
      payload: safePayload,
      ownerCoachIds: Array.isArray(ownerCoachIds) ? ownerCoachIds.filter(Boolean) : [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/** Публичный рейтинг тренера (чтение без входа). */
export const subscribePublicLeaderboardShareByToken = (token, onData, onError) => {
  if (!db || !token || typeof token !== 'string' || token.length < 16) {
    onData?.(null)
    return () => {}
  }
  const ref = doc(ensureDb(), 'public_leaderboard_shares', token)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData?.(null)
        return
      }
      onData?.({ id: snap.id, ...snap.data() })
    },
    (err) => {
      console.error('subscribePublicLeaderboardShareByToken', err)
      onError?.(err)
    },
  )
}

export const setPublicLeaderboardShareDocument = async (token, { payload, ownerCoachId }) => {
  if (!token || typeof token !== 'string') throw new Error('Некорректный токен ссылки')
  const safePayload = deepOmitUndefined(payload)
  if (safePayload === undefined) throw new Error('Пустой payload для публичного рейтинга')
  await setDoc(
    doc(ensureDb(), 'public_leaderboard_shares', token),
    {
      payload: safePayload,
      ownerCoachId: typeof ownerCoachId === 'string' ? ownerCoachId : '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const subscribeCoachProfile = (coachId, onData, onError) => {
  if (!db || !coachId) {
    onData?.(null)
    return () => {}
  }
  const ref = doc(ensureDb(), 'coaches', coachId)
  return onSnapshot(
    ref,
    (snap) => {
      onData?.(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    },
    (err) => {
      console.error('subscribeCoachProfile', err)
      onError?.(err)
    },
  )
}

export const updateCoachLeaderboardSettings = async (coachId, settings) => {
  if (!coachId) throw new Error('Не указан тренер')
  const payload = deepOmitUndefined(settings)
  if (!payload || Object.keys(payload).length === 0) return
  await setDoc(
    doc(ensureDb(), 'coaches', coachId),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/**
 * Подписка на учеников тренера (realtime, coach_ids + legacy coachId).
 * @returns {() => void}
 */
export const subscribeCoachStudents = (coachId, onData, onError) => {
  if (!studentsCollection || !coachId) {
    onData?.([])
    return () => {}
  }
  const col = collection(ensureDb(), 'students')
  let arrayDocs = []
  let legacyDocs = []
  let legacyIdsDocs = []
  const errors = { coach_ids: null, coachId: null, coachIds: null }

  const emit = () => {
    const failed = Object.values(errors).filter(Boolean)
    const merged = mergeCoachStudentsDocs([...arrayDocs, ...legacyDocs, ...legacyIdsDocs])
    if (failed.length >= 3) {
      onError?.(failed[0])
      return
    }
    if (failed.length > 0) {
      console.warn(
        '[subscribeCoachStudents] Часть запросов недоступна — список собран из оставшихся.',
        failed.map((e) => e?.code || e?.message),
      )
    }
    onData?.(merged)
  }

  const bindSnapshot = (label, q, assignDocs) =>
    onSnapshot(
      q,
      (snap) => {
        errors[label] = null
        assignDocs(snap.docs)
        emit()
      },
      (err) => {
        console.error(`subscribeCoachStudents ${label}`, err)
        errors[label] = err
        assignDocs([])
        emit()
      },
    )

  const unsubArray = bindSnapshot(
    'coach_ids',
    query(col, where('coach_ids', 'array-contains', coachId)),
    (docs) => {
      arrayDocs = docs
    },
  )
  const unsubLegacy = bindSnapshot(
    'coachId',
    query(col, where('coachId', '==', coachId)),
    (docs) => {
      legacyDocs = docs
    },
  )
  const unsubLegacyIds = bindSnapshot(
    'coachIds',
    query(col, where('coachIds', 'array-contains', coachId)),
    (docs) => {
      legacyIdsDocs = docs
    },
  )

  return () => {
    unsubArray()
    unsubLegacy()
    unsubLegacyIds()
  }
}

/**
 * Подписка на всех учеников коллекции (режим администратора).
 * @returns {() => void}
 */
export const subscribeAllStudents = (onData, onError) => {
  if (!studentsCollection) {
    onData?.([])
    return () => {}
  }
  return onSnapshot(
    studentsCollection,
    (snap) => {
      onData?.(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    },
    (err) => {
      console.error('subscribeAllStudents', err)
      onError?.(err)
    },
  )
}

export const getStudents = async () => {
  if (!studentsCollection) return []
  const snapshot = await getDocs(studentsCollection)
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export const createStudent = async (studentPayload) => {
  if (!studentsCollection) throw new Error('Коллекция students недоступна')
  const ref = await addDoc(studentsCollection, studentPayload)
  return ref.id
}

export const updateStudent = async (studentId, studentPayload) => {
  await updateDoc(doc(ensureDb(), 'students', studentId), studentPayload)
}

/** Firestore не допускает undefined ни на одном уровне вложенности. */
export const deepOmitUndefined = (value) => {
  if (value === undefined) return undefined
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((item) => deepOmitUndefined(item))
  }
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue
    const nested = deepOmitUndefined(v)
    if (nested !== undefined) out[k] = nested
  }
  return out
}

export async function resolveCurrentCoachAuditFields() {
  const safeAuth = ensureAuth()
  const user = safeAuth.currentUser
  const uid = user?.uid
  if (!uid || user?.isAnonymous) return {}

  const cached = getCoachProfileCache(uid)
  if (cached) {
    const name = [cached.firstName, cached.lastName].filter(Boolean).join(' ').trim()
    return {
      lastUpdatedByCoachId: uid,
      lastUpdatedByCoachName: name || safeAuth.currentUser?.email || 'Тренер',
    }
  }

  try {
    const profile = await getCoachProfile(uid)
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
    return {
      lastUpdatedByCoachId: uid,
      lastUpdatedByCoachName: name || safeAuth.currentUser?.email || 'Тренер',
    }
  } catch {
    return {
      lastUpdatedByCoachId: uid,
      lastUpdatedByCoachName: safeAuth.currentUser?.email || 'Тренер',
    }
  }
}

/** Обновить имя в индексе student_codes (поиск по коду). */
export async function syncStudentCodeIndexName(shortId, { name, fullName, photoURL } = {}) {
  if (!isValidSixDigitShortId(shortId)) return
  const patch = deepOmitUndefined({
    name: name ?? fullName ?? '',
    fullName: fullName ?? name ?? '',
    photoURL,
    updatedAt: serverTimestamp(),
  })
  if (Object.keys(patch).length <= 1) return
  await updateDoc(doc(ensureDb(), 'student_codes', String(Math.floor(Number(shortId)))), patch)
}

/** Обновление полей ученика (без вложенных undefined — совместимо с Firestore). */
export const updateStudentData = async (studentId, updatedData, meta = {}) => {
  const payload = deepOmitUndefined(updatedData)
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) return
  const audit = await resolveCurrentCoachAuditFields()
  const section =
    typeof meta.section === 'string' && meta.section.trim()
      ? meta.section.trim()
      : inferUpdateSectionFromPayload(payload)
  await updateDoc(doc(ensureDb(), 'students', studentId), {
    ...payload,
    ...audit,
    lastUpdatedSection: section,
    updatedAt: serverTimestamp(),
  })

  const nameTouched = ['name', 'fullName', 'firstName', 'lastName'].some((k) => k in payload)
  if (nameTouched && isValidSixDigitShortId(meta.shortId)) {
    try {
      await syncStudentCodeIndexName(meta.shortId, {
        name: payload.name ?? payload.fullName,
        fullName: payload.fullName ?? payload.name,
        photoURL: meta.photoURL,
      })
    } catch (e) {
      console.warn('[syncStudentCodeIndexName]', e)
    }
  }

  const coachId = audit.lastUpdatedByCoachId
  if (coachId) {
    import('./leaderboardShareService.js')
      .then(({ scheduleLeaderboardShareSync }) => scheduleLeaderboardShareSync(coachId))
      .catch(() => {})
  }
}

export const getStudentById = async (studentId) => {
  if (!studentId) return null
  const snapshot = await getDoc(doc(ensureDb(), 'students', studentId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export const getAccessCodeById = async (codeId) => {
  const snapshot = await getDoc(doc(ensureDb(), 'accessCodes', codeId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export const createAccessCode = async (accessCodePayload) => {
  if (!accessCodesCollection) throw new Error('Коллекция accessCodes недоступна')
  const ref = await addDoc(accessCodesCollection, accessCodePayload)
  return ref.id
}

export const registerCoach = async (email, password, coachData) => {
  const safeAuth = ensureAuth()
  const safeDb = ensureDb()
  if (safeAuth.currentUser?.isAnonymous) {
    await signOut(safeAuth)
    try {
      const { clearPortalSession } = await import('../utils/studentPortalAuth.js')
      clearPortalSession()
    } catch {
      /* ignore */
    }
  }
  const userCredential = await createUserWithEmailAndPassword(safeAuth, email, password)
  const { user } = userCredential

  await setDoc(doc(safeDb, 'coaches', user.uid), {
    firstName: coachData.firstName,
    lastName: coachData.lastName,
    city: coachData.city,
    email,
    role: 'coach',
    createdAt: serverTimestamp(),
  })

  return user
}

export const loginCoach = async (email, password) => {
  const safeAuth = ensureAuth()
  if (safeAuth.currentUser?.isAnonymous) {
    await signOut(safeAuth)
    try {
      const { clearPortalSession } = await import('../utils/studentPortalAuth.js')
      clearPortalSession()
    } catch {
      /* ignore */
    }
  }
  const userCredential = await signInWithEmailAndPassword(safeAuth, email, password)
  return userCredential.user
}

export const logoutCoach = async () => {
  const safeAuth = ensureAuth()
  await signOut(safeAuth)
}

export const subscribeToAuth = (callback) => {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export const getCoachProfile = async (coachId) => {
  const snapshot = await getDoc(doc(ensureDb(), 'coaches', coachId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

/** Все тренеры (для админки доступа). */
export const getAllCoaches = async () => {
  const snap = await getDocs(collection(ensureDb(), 'coaches'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const na = [a.firstName, a.lastName].filter(Boolean).join(' ')
      const nb = [b.firstName, b.lastName].filter(Boolean).join(' ')
      return na.localeCompare(nb, 'ru')
    })
}

export const deleteStudentDoc = async (studentId) => {
  if (!studentId) return
  await deleteDoc(doc(ensureDb(), 'students', studentId))
}

/**
 * Убирает тренера из coach_ids / legacy coachId.
 * @returns {Promise<{ status: 'detached' | 'unchanged' | 'no_coaches_left' }>}
 */
export const detachCoachFromStudent = async (studentId, coachId) => {
  const ref = doc(ensureDb(), 'students', studentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Ученик не найден')
  const data = snap.data()
  const set = new Set(Array.isArray(data.coach_ids) ? data.coach_ids : [])
  if (data.coachId) set.add(data.coachId)
  if (!set.has(coachId)) return { status: 'unchanged' }
  set.delete(coachId)
  const remaining = [...set]
  const patch = {
    coach_ids: remaining,
    updatedAt: serverTimestamp(),
  }
  if (data.coachId === coachId) {
    if (remaining.length > 0) {
      patch.coachId = remaining[0]
    } else {
      patch.coachId = deleteField()
    }
  }
  await updateDoc(ref, patch)
  if (remaining.length === 0) return { status: 'no_coaches_left' }
  return { status: 'detached' }
}

/** Валидный публичный код ученика для шеринга (6 цифр). */
export const isValidSixDigitShortId = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 100000 && n <= 999999
}

/** Уникальный 6-значный short_id (100000–999999). Индекс student_codes — без list-запроса по students. */
export const generateUniqueShortId = async () => {
  if (!studentsCollection) throw new Error('Коллекция students недоступна')
  const safeDb = ensureDb()
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const n = 100000 + Math.floor(Math.random() * 900000)
    const snap = await getDoc(doc(safeDb, 'student_codes', String(n)))
    if (!snap.exists()) return n
  }
  throw new Error('Не удалось сгенерировать уникальный код ученика')
}

async function writeStudentCodeIndex(shortId, { studentId, coachId, name, fullName, photoURL }) {
  await setDoc(doc(ensureDb(), 'student_codes', String(shortId)), {
    studentId,
    coachId,
    name: name ?? fullName ?? '',
    fullName: fullName ?? name ?? '',
    photoURL: photoURL ?? '',
    updatedAt: serverTimestamp(),
  })
}

export const addStudent = async (studentData) => {
  const safeAuth = ensureAuth()
  const currentCoach = safeAuth.currentUser
  if (!currentCoach) throw new Error('Тренер не авторизован')
  if (currentCoach.isAnonymous) {
    throw new Error('Войдите как тренер (email и пароль), а не через кабинет ученика.')
  }
  if (!studentsCollection) throw new Error('Коллекция students недоступна')

  const short_id = await generateUniqueShortId()
  const { coachId: _drop, coach_ids: _dropIds, short_id: _dropShort, ...rest } = studentData || {}

  const payload = {
    ...rest,
    short_id,
    coach_ids: [currentCoach.uid],
    /** Совместимость с правилами / запросами по полю coachId (владелец карточки). */
    coachId: currentCoach.uid,
    createdAt: serverTimestamp(),
  }

  const ref = await addDoc(studentsCollection, payload)
  await writeStudentCodeIndex(short_id, {
    studentId: ref.id,
    coachId: currentCoach.uid,
    name: payload.name,
    fullName: payload.fullName,
    photoURL: payload.photoURL,
  })
  return ref.id
}

function mergeCoachStudentsDocs(queryDocs) {
  const map = new Map()
  for (const d of queryDocs) {
    if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() })
  }
  return Array.from(map.values())
}

/**
 * Гарантирует наличие short_id в документе (чтение + при необходимости запись).
 * @returns {Promise<{ short_id: number } | { short_id: null, error: string } | null>}
 */
export const ensureStudentShortId = async (studentId) => {
  if (!studentId) return null
  const ref = doc(ensureDb(), 'students', studentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  if (isValidSixDigitShortId(data.short_id)) {
    return { short_id: Math.floor(Number(data.short_id)) }
  }
  const short_id = await generateUniqueShortId()
  try {
    await updateDoc(ref, {
      short_id,
      updatedAt: serverTimestamp(),
    })
    await writeStudentCodeIndex(short_id, {
      studentId,
      coachId: data.coachId ?? data.coach_ids?.[0] ?? getCurrentCoachId(),
      name: data.name,
      fullName: data.fullName ?? data.name,
      photoURL: data.photoURL ?? data.photo,
    })
    return { short_id }
  } catch (e) {
    if (e?.code === 'permission-denied') {
      return { short_id: null, error: 'permission-denied' }
    }
    throw e
  }
}

let coachIdsQueryDeniedLogged = false

export const getCoachStudents = async (coachId) => {
  if (!studentsCollection || !coachId) return []
  const safeDb = ensureDb()
  const col = collection(safeDb, 'students')

  const [arrayResult, legacyResult, legacyIdsResult] = await Promise.all([
    getDocs(query(col, where('coach_ids', 'array-contains', coachId))).catch((e) => {
      if (e?.code === 'permission-denied') {
        if (!coachIdsQueryDeniedLogged) {
          coachIdsQueryDeniedLogged = true
          console.info(
            '[Cartel] Запрос coach_ids недоступен по правилам — используем coachId / coachIds.',
          )
        }
      } else {
        console.warn('[getCoachStudents] Запрос coach_ids:', e)
      }
      return { docs: [] }
    }),
    getDocs(query(col, where('coachId', '==', coachId))).catch((e) => {
      console.warn('[getCoachStudents] Запрос coachId:', e)
      return { docs: [] }
    }),
    getDocs(query(col, where('coachIds', 'array-contains', coachId))).catch((e) => {
      console.warn('[getCoachStudents] Запрос coachIds:', e)
      return { docs: [] }
    }),
  ])

  return mergeCoachStudentsDocs([
    ...arrayResult.docs,
    ...legacyResult.docs,
    ...legacyIdsResult.docs,
  ])
}

/**
 * Поиск ученика по 6-значному коду (только цифры 100000–999999).
 * @returns {Promise<{ id: string } & Record<string, unknown> | null>}
 */
export const findStudentByShortId = async (digits) => {
  if (!studentsCollection) return null
  const n = typeof digits === 'string' ? Number(String(digits).replace(/\D/g, '')) : Number(digits)
  if (!Number.isFinite(n) || n < 100000 || n > 999999) return null

  const codeSnap = await getDoc(doc(ensureDb(), 'student_codes', String(n)))
  if (codeSnap.exists()) {
    const idx = codeSnap.data()
    const studentId = idx?.studentId
    if (studentId) {
      try {
        const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
        if (studentSnap.exists()) {
          return { id: studentSnap.id, ...studentSnap.data() }
        }
      } catch {
        /* карточку ещё не читаем — достаточно индекса для превью */
      }
      return {
        id: studentId,
        short_id: n,
        name: idx.name,
        fullName: idx.fullName ?? idx.name,
        photoURL: idx.photoURL,
      }
    }
  }

  try {
    const snap = await getDocs(query(studentsCollection, where('short_id', '==', n), limit(1)))
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, ...d.data() }
  } catch {
    return null
  }
}

/**
 * Добавляет тренера в coach_ids (many-to-many). Учитывает legacy coachId.
 * @returns {Promise<{ status: 'attached' | 'already' }>}
 */
export const attachCoachToStudent = async (studentId, coachId) => {
  const ref = doc(ensureDb(), 'students', studentId)
  await updateDoc(ref, {
    coach_ids: arrayUnion(coachId),
    updatedAt: serverTimestamp(),
  })
  return { status: 'attached' }
}

export default db

