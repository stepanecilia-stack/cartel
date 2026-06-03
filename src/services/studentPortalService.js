import {
  getAuth,
  signInAnonymously,
  signOut,
} from 'firebase/auth'
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
import { normalizeTechnicalDataForSave } from '../utils/studentTechnicalUpdate.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'
import { ensureAuth, ensureDb, updateStudentData } from './firebaseService.js'

const PORTAL_AUTH_COLLECTION = 'student_portal_auth'

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
    return { shortId: sid, pin: null, regenerated: false, existing: true }
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
    updatedAt: serverTimestamp(),
  })
  return { shortId: sid, pin, regenerated: Boolean(existing?.pinHash), existing: false }
}

export async function resetStudentPortalPin(studentId, shortId) {
  return ensureStudentPortalAccess(studentId, shortId, { pin: generatePortalPin() })
}

export async function revokeStudentPortalAccess(studentId, shortId) {
  const sid = normalizePortalShortIdInput(shortId) ?? String(shortId)
  if (sid) {
    await setDoc(portalAuthRef(sid), { enabled: false, updatedAt: serverTimestamp() }, { merge: true })
  }
  await updateDoc(doc(ensureDb(), 'students', studentId), {
    portalEnabled: false,
    portalAuthUid: deleteField(),
    updatedAt: serverTimestamp(),
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
  if (!shortId || !pin) {
    throw new Error('Введите 6-значный код и 4-значный PIN.')
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
      await signOut(auth)
      throw new Error(
        'Кабинет уже привязан к другому устройству. Попросите тренера сбросить доступ в карточке.',
      )
    }
    throw e
  }

  writePortalSession({ studentId, shortId })
  return { studentId, shortId, uid: user.uid }
}

export async function logoutStudentPortal() {
  const { clearPortalSession } = await import('../utils/studentPortalAuth.js')
  clearPortalSession()
  const auth = getAuth()
  if (auth.currentUser?.isAnonymous) {
    await signOut(auth)
  }
}

export async function fetchStudentForPortalSession(studentId) {
  const auth = ensureAuth()
  if (!auth.currentUser?.isAnonymous) {
    throw new Error('Сессия истекла. Войдите снова.')
  }
  const ref = doc(ensureDb(), 'students', studentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Профиль не найден.')
  const data = { id: snap.id, ...snap.data() }
  if (data.portalAuthUid !== auth.currentUser.uid) {
    throw new Error('Нет доступа к этой карточке.')
  }
  return data
}

export async function saveStudentPortalKnowledge(studentId, technicalData) {
  const normalized = normalizeTechnicalDataForSave(technicalData)
  await updateStudentData(
    studentId,
    {
      technicalData: normalized,
      portalLastActivityAt: serverTimestamp(),
    },
    { section: STUDENT_UPDATE_SECTION.studentPortal },
  )
  return normalized
}
