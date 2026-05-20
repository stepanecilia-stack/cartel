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
  collection,
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

const ensureDb = () => {
  if (!db) throw new Error('Firebase не настроен: отсутствует валидный конфиг')
  return db
}

const ensureAuth = () => {
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

  const emit = () => {
    onData?.(mergeCoachStudentsDocs([...arrayDocs, ...legacyDocs]))
  }

  const unsubArray = onSnapshot(
    query(col, where('coach_ids', 'array-contains', coachId)),
    (snap) => {
      arrayDocs = snap.docs
      emit()
    },
    (err) => {
      console.error('subscribeCoachStudents coach_ids', err)
      onError?.(err)
    },
  )

  const unsubLegacy = onSnapshot(
    query(col, where('coachId', '==', coachId)),
    (snap) => {
      legacyDocs = snap.docs
      emit()
    },
    (err) => {
      console.error('subscribeCoachStudents coachId', err)
      onError?.(err)
    },
  )

  return () => {
    unsubArray()
    unsubLegacy()
  }
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
const deepOmitUndefined = (value) => {
  if (value === undefined) return undefined
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
  const uid = safeAuth.currentUser?.uid
  if (!uid) return {}
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

/** Валидный публичный код ученика для шеринга (6 цифр). */
export const isValidSixDigitShortId = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 100000 && n <= 999999
}

/** Уникальный 6-значный short_id (100000–999999). */
export const generateUniqueShortId = async () => {
  if (!studentsCollection) throw new Error('Коллекция students недоступна')
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const n = 100000 + Math.floor(Math.random() * 900000)
    const snap = await getDocs(query(studentsCollection, where('short_id', '==', n), limit(1)))
    if (snap.empty) return n
  }
  throw new Error('Не удалось сгенерировать уникальный код ученика')
}

export const addStudent = async (studentData) => {
  const safeAuth = ensureAuth()
  const currentCoach = safeAuth.currentUser
  if (!currentCoach) throw new Error('Тренер не авторизован')
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

  let arrayDocs = []
  try {
    const snapArray = await getDocs(query(col, where('coach_ids', 'array-contains', coachId)))
    arrayDocs = snapArray.docs
  } catch (e) {
    if (e?.code === 'permission-denied') {
      if (!coachIdsQueryDeniedLogged) {
        coachIdsQueryDeniedLogged = true
        console.info(
          '[Cartel] Второй список тренеров в базе отключён настройками — показываются только «свои» ученики по старому полю. Это нормально, пока администратор не обновит правила.',
        )
      }
    } else {
      console.warn('[getCoachStudents] Запрос coach_ids:', e)
    }
  }

  let legacyDocs = []
  try {
    const snapLegacy = await getDocs(query(col, where('coachId', '==', coachId)))
    legacyDocs = snapLegacy.docs
  } catch (e) {
    console.warn('[getCoachStudents] Запрос coachId:', e)
  }

  return mergeCoachStudentsDocs([...arrayDocs, ...legacyDocs])
}

/**
 * Поиск ученика по 6-значному коду (только цифры 100000–999999).
 * @returns {Promise<{ id: string } & Record<string, unknown> | null>}
 */
export const findStudentByShortId = async (digits) => {
  if (!studentsCollection) return null
  const n = typeof digits === 'string' ? Number(String(digits).replace(/\D/g, '')) : Number(digits)
  if (!Number.isFinite(n) || n < 100000 || n > 999999) return null
  const snap = await getDocs(query(studentsCollection, where('short_id', '==', n), limit(1)))
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

/**
 * Добавляет тренера в coach_ids (many-to-many). Учитывает legacy coachId.
 * @returns {Promise<{ status: 'attached' | 'already' }>}
 */
export const attachCoachToStudent = async (studentId, coachId) => {
  const ref = doc(ensureDb(), 'students', studentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Ученик не найден')
  const data = snap.data()
  const set = new Set(Array.isArray(data.coach_ids) ? data.coach_ids : [])
  if (data.coachId) set.add(data.coachId)
  if (set.has(coachId)) return { status: 'already' }
  set.add(coachId)
  await updateDoc(ref, {
    coach_ids: Array.from(set),
    updatedAt: serverTimestamp(),
  })
  return { status: 'attached' }
}

export default db

