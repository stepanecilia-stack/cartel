import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { STUDENT_PORTAL_CONSENT_VERSION } from '../constants/studentPortalConsent.js'
import {
  generatePortalPin,
  hashPortalPin,
  normalizePortalPinInput,
  normalizePortalShortIdInput,
  verifyPortalPin,
  writePortalSession,
} from '../utils/studentPortalAuth.js'
import { normalizePortalKnowledgeDataForSave } from '../utils/portalKnowledgeData.js'
import { normalizePortalTrainingGoals } from '../constants/studentPortalOnboarding.js'
import { normalizePortalPersonaId } from '../constants/studentPortalPersonas.js'
import { normalizePortalPersonaMemory } from '../utils/portalPersonaMemory.js'
import {
  appendPortalNormSelfReport,
  appendStructuredPortalNormSelfReport,
  findNormByPortalTestId,
  normStorageKey,
} from '../utils/portalNormSelfReports.js'
import { migrateStudentTests } from '../utils/normsCategory.js'
import {
  getNormValueByTestId,
  mergeStudentSelfReportIntoPhysicalRow,
} from '../utils/normTestsStorage.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'
import { ensureAuth, ensureDb, deepOmitUndefined } from './firebaseService.js'

const PORTAL_AUTH_COLLECTION = 'student_portal_auth'

async function waitAuthReady(auth) {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
    return
  }
  await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub()
      resolve()
    })
  })
}

function portalAuthRef(shortId) {
  return doc(ensureDb(), PORTAL_AUTH_COLLECTION, shortId)
}

export async function getStudentPortalAuthRecord(shortId) {
  const snap = await getDoc(portalAuthRef(shortId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Настройка входа: PIN + документ auth (только тренер, через существующие rules).
 */
export async function ensureStudentPortalAccess(studentId, shortId, options = {}) {
  const sid = normalizePortalShortIdInput(shortId) ?? String(shortId)
  if (!studentId || !sid) throw new Error('Некорректный код ученика')

  const existing = await getStudentPortalAuthRecord(sid)
  let pin = options.pin ? normalizePortalPinInput(options.pin) : null
  if (!pin && existing?.pinHash) {
    const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
    const storedPin = normalizePortalPinInput(studentSnap.data()?.portalCoachPin)
    return { shortId: sid, pin: storedPin, regenerated: false, existing: true }
  }
  if (!pin) pin = generatePortalPin()

  const pinHash = await hashPortalPin(pin, sid)
  await setDoc(
    portalAuthRef(sid),
    {
      studentId,
      pinHash,
      enabled: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  await updateDoc(doc(ensureDb(), 'students', studentId), {
    portalEnabled: true,
    portalCoachPin: pin,
    updatedAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
  })
  return { shortId: sid, pin, regenerated: Boolean(existing?.pinHash), existing: false }
}

export async function resetStudentPortalPin(studentId, shortId) {
  return ensureStudentPortalAccess(studentId, shortId, { pin: generatePortalPin() })
}

/** Снять привязку к браузеру/телефону; код и PIN не меняются. */
export async function clearStudentPortalDeviceBinding(studentId) {
  if (!studentId) throw new Error('Не указан ученик')
  await updateDoc(doc(ensureDb(), 'students', studentId), {
    portalAuthUid: deleteField(),
    portalEnabled: true,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Обнулить прогресс кабинета и контекст виртуального тренера.
 * Код, PIN и доступ сохраняются — при следующем входе ученик проходит онбординг и программу заново.
 */
export async function resetStudentPortalContext(studentId) {
  if (!studentId) throw new Error('Не указан ученик')
  await updateDoc(doc(ensureDb(), 'students', studentId), {
    portalKnowledgeData: deleteField(),
    portalOnboardingCompletedAt: deleteField(),
    portalOnboardingSkippedAt: deleteField(),
    portalPersonaMemory: deleteField(),
    portalNormSelfReports: deleteField(),
    portalTrainingGoals: deleteField(),
    portalTrainingGoal: deleteField(),
    portalPersonaId: deleteField(),
    portalLastActivityAt: deleteField(),
    updatedAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
  })
}

export async function revokeStudentPortalAccess(studentId, shortId) {
  const sid = normalizePortalShortIdInput(shortId) ?? String(shortId)
  if (sid) {
    await setDoc(portalAuthRef(sid), { enabled: false, updatedAt: serverTimestamp() }, { merge: true })
  }
  await updateDoc(doc(ensureDb(), 'students', studentId), {
    portalEnabled: false,
    portalAuthUid: deleteField(),
    portalCoachPin: deleteField(),
    updatedAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
  })
}

/**
 * Вход ученика: код + PIN + согласие → анонимный Firebase Auth + привязка portalAuthUid.
 */
export async function loginStudentPortal({ shortIdInput, pinInput, consentAccepted }) {
  if (!consentAccepted) {
    throw new Error('Подтвердите согласие на обработку персональных данных.')
  }

  const shortId = normalizePortalShortIdInput(shortIdInput)
  const pin = normalizePortalPinInput(pinInput)
  if (!shortId && !pin) {
    throw new Error('Введите 6-значный код и 4-значный PIN.')
  }
  if (!shortId) {
    throw new Error('Код — 6 цифр (от 100000 до 999999).')
  }
  if (!pin) {
    throw new Error('PIN — 4 цифры.')
  }

  const authRecord = await getStudentPortalAuthRecord(shortId)
  if (!authRecord?.enabled) {
    throw new Error('Кабинет не включён. Попросите тренера выдать код и PIN.')
  }
  const ok = await verifyPortalPin(pin, shortId, authRecord.pinHash)
  if (!ok) throw new Error('Неверный код или PIN.')

  const studentId = authRecord.studentId
  const studentRef = doc(ensureDb(), 'students', studentId)

  const auth = ensureAuth()
  await waitAuthReady(auth)
  let user = auth.currentUser
  if (!user || user.isAnonymous !== true) {
    if (user) await signOut(auth)
    const cred = await signInAnonymously(auth)
    user = cred.user
  }

  try {
    await updateDoc(studentRef, {
      portalAuthUid: user.uid,
      portalEnabled: true,
      portalConsentAt: serverTimestamp(),
      portalConsentVersion: STUDENT_PORTAL_CONSENT_VERSION,
      portalLastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    if (e?.code === 'permission-denied') {
      throw new Error(
        'Не удалось войти в кабинет. Проверьте код и PIN. Если ошибка не исчезает — опубликуйте правила Firestore в Firebase или попросите тренера «Сбросить устройство» в карточке ученика.',
      )
    }
    throw e
  }

  writePortalSession({ studentId, shortId })
  return { studentId, shortId, uid: user.uid }
}

/** Дождаться восстановления сессии Firebase (иначе ложное «Сессия истекла»). */
export async function waitForFirebaseAuthReady() {
  const auth = ensureAuth()
  await waitAuthReady(auth)
  return auth.currentUser
}

/** Анонимный uid для кабинета; создаёт новый, если браузер «забыл» старый. */
export async function ensureStudentPortalAnonymousUser() {
  const auth = ensureAuth()
  await waitAuthReady(auth)
  const user = auth.currentUser
  if (user?.isAnonymous) return user
  if (user && !user.isAnonymous) {
    throw new Error('На этом устройстве открыт вход тренера. Выйдите из тренерского аккаунта или откройте кабинет ученика в другом браузере.')
  }
  const cred = await signInAnonymously(auth)
  return cred.user
}

async function rebindPortalAuthUid(studentId) {
  const user = await ensureStudentPortalAnonymousUser()
  const studentRef = doc(ensureDb(), 'students', studentId)
  await updateDoc(studentRef, {
    portalAuthUid: user.uid,
    portalEnabled: true,
    portalLastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
    lastUpdatedAt: serverTimestamp(),
  })
  return user.uid
}

/** Запись кабинета ученика: при рассинхроне uid — перепривязка и повтор. */
async function updateStudentPortalDoc(studentId, patch) {
  await ensureStudentPortalAnonymousUser()
  const studentRef = doc(ensureDb(), 'students', studentId)
  const safePatch = deepOmitUndefined(patch)
  try {
    await updateDoc(studentRef, safePatch)
  } catch (e) {
    if (e?.code !== 'permission-denied') throw e
    await rebindPortalAuthUid(studentId)
    await updateDoc(studentRef, safePatch)
  }
}

export async function logoutStudentPortal() {
  const { clearPortalSession } = await import('../utils/studentPortalAuth.js')
  clearPortalSession()
  // Не выходим из анонимного Firebase Auth — иначе при следующем входе
  // на том же телефоне появится новый uid и сработает ложная «блокировка устройства».
}

export async function fetchStudentForPortalSession(studentId) {
  if (!studentId) throw new Error('Сессия ученика не найдена.')
  const user = await ensureStudentPortalAnonymousUser()
  const ref = doc(ensureDb(), 'students', studentId)

  const loadSnap = () => getDoc(ref)

  let snap
  try {
    snap = await loadSnap()
  } catch (e) {
    if (e?.code !== 'permission-denied') throw e
    try {
      await rebindPortalAuthUid(studentId)
    } catch (rebindErr) {
      if (rebindErr?.code === 'permission-denied') {
        throw new Error(
          'Вход с этого устройства недоступен. Попросите тренера «Сбросить устройство» в карточке и войдите по коду и PIN.',
        )
      }
      throw rebindErr
    }
    snap = await loadSnap()
  }

  if (!snap.exists()) throw new Error('Профиль не найден.')
  let data = { id: snap.id, ...snap.data() }
  if (data.portalEnabled === false) {
    throw new Error('Кабинет отключён. Попросите тренера включить доступ.')
  }
  if (data.portalAuthUid !== user.uid) {
    try {
      await rebindPortalAuthUid(studentId)
      snap = await loadSnap()
      data = { id: snap.id, ...snap.data() }
    } catch (e) {
      if (e?.code === 'permission-denied') {
        throw new Error(
          'Вход с этого устройства недоступен. Попросите тренера «Сбросить устройство» в карточке и войдите по коду и PIN.',
        )
      }
      throw e
    }
  }
  if (data.portalAuthUid !== user.uid) {
    throw new Error('Нет доступа к этой карточке.')
  }
  return data
}

/** Восстановить кабинет по сохранённому коду (без повторного ввода PIN). */
export async function resumeStudentPortalSession() {
  const { readPortalSession } = await import('../utils/studentPortalAuth.js')
  const session = readPortalSession()
  if (!session?.studentId) return null
  const student = await fetchStudentForPortalSession(session.studentId)
  return { session, student }
}

export async function saveStudentPortalKnowledge(studentId, portalKnowledgeData) {
  const normalized = normalizePortalKnowledgeDataForSave(portalKnowledgeData)
  await updateStudentPortalDoc(studentId, {
    portalKnowledgeData: normalized,
    portalLastActivityAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
    updatedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  })
  return normalized
}

/** Завершение онбординга кабинета (цели, наставник, отметка прохождения). */
export async function saveStudentPortalOnboarding(studentId, { goals, personaId, personaMemory = null, skipped = false }) {
  await ensureStudentPortalAnonymousUser()
  const normalizedGoals = normalizePortalTrainingGoals(goals)
  const normalizedPersona = normalizePortalPersonaId(personaId)
  /** @type {Record<string, unknown>} */
  const patch = {
    portalTrainingGoals: normalizedGoals,
    portalPersonaId: normalizedPersona,
    portalOnboardingCompletedAt: serverTimestamp(),
    portalLastActivityAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
    updatedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  }
  if (skipped) {
    patch.portalOnboardingSkippedAt = serverTimestamp()
  }
  if (personaMemory) {
    patch.portalPersonaMemory = {
      ...normalizePortalPersonaMemory(personaMemory),
      updatedAt: new Date().toISOString(),
    }
  }
  await updateStudentPortalDoc(studentId, patch)
  return {
    goals: normalizedGoals,
    personaId: normalizedPersona,
    personaMemory: patch.portalPersonaMemory ?? null,
    skipped,
  }
}

/** Крупные пометки тренера об ученике (уровень + резюме общения). */
export async function saveStudentPortalPersonaMemory(studentId, personaMemory) {
  await ensureStudentPortalAnonymousUser()
  const normalized = {
    ...normalizePortalPersonaMemory(personaMemory),
    updatedAt: new Date().toISOString(),
  }
  await updateStudentPortalDoc(studentId, {
    portalPersonaMemory: normalized,
    portalLastActivityAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
    updatedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  })
  return normalized
}

function portalNormSaveError(err) {
  if (err?.code === 'permission-denied') {
    return new Error(
      'Не удалось сохранить в базу: нет прав доступа. Попросите тренера опубликовать firestore.rules в Firebase Console → Firestore → Rules → «Опубликовать».',
    )
  }
  if (err instanceof Error && err.message) return err
  return new Error('Не удалось сохранить результат. Проверьте интернет и войдите в кабинет заново.')
}

/** Самоотчёт ученика по нормативам — в tests.physical с пометкой «со слов ученика». */
export async function saveStudentPortalNormSelfReport(studentId, payload, options = null) {
  await ensureStudentPortalAnonymousUser()
  const opts =
    options == null || Array.isArray(options)
      ? { existingReports: options ?? null }
      : options
  const { existingReports = null, student = null, norms = [] } = opts

  const reportedAt = new Date()
  const reportedAtIso = reportedAt.toISOString()
  const portalNormSelfReports =
    typeof payload === 'string'
      ? appendPortalNormSelfReport(existingReports, payload, reportedAt)
      : appendStructuredPortalNormSelfReport(existingReports, payload, reportedAt)

  const studentSnap = student ?? (await fetchStudentForPortalSession(studentId))
  const migrated = migrateStudentTests(studentSnap.tests)
  const physical = { ...migrated.physical }
  const functional =
    studentSnap.tests?.functional && typeof studentSnap.tests.functional === 'object'
      ? { ...studentSnap.tests.functional }
      : {}

  let physicalUpdated = false
  if (typeof payload === 'object' && payload?.testId && payload?.resultRaw) {
    const testId = String(payload.testId).trim()
    const norm = findNormByPortalTestId(norms, testId)
    if (!norm) {
      throw new Error('Норматив не найден в таблице. Обновите страницу и попробуйте снова.')
    }
    const storageKey = normStorageKey(norm, testId)
    const existingRow = getNormValueByTestId(physical, storageKey)
    const merged = mergeStudentSelfReportIntoPhysicalRow(
      existingRow,
      norm,
      payload.resultRaw,
      reportedAtIso,
    )
    if (!merged) {
      throw new Error('Не удалось разобрать результат. Проверьте формат числа или времени.')
    }
    physical[storageKey] = merged
    physicalUpdated = true
  }

  const tests = { physical, functional }
  const metaPatch = {
    portalNormSelfReports,
    portalLastActivityAt: serverTimestamp(),
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
    updatedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  }

  try {
    await updateStudentPortalDoc(studentId, physicalUpdated ? { ...metaPatch, tests } : metaPatch)
  } catch (err) {
    if (err?.code === 'permission-denied' && physicalUpdated) {
      try {
        await updateStudentPortalDoc(studentId, metaPatch)
      } catch (fallbackErr) {
        throw portalNormSaveError(fallbackErr)
      }
      throw portalNormSaveError(err)
    }
    throw portalNormSaveError(err)
  }

  const fresh = await fetchStudentForPortalSession(studentId)
  return {
    portalNormSelfReports: fresh.portalNormSelfReports ?? portalNormSelfReports,
    reportedAt: reportedAtIso,
    tests: fresh.tests ?? tests,
  }
}
