import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { ensureDb, isFirebaseConfigured, updateStudentData } from './firebaseService.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'
import {
  buildWeekFromStartISO,
  formatTrainingWeekReply,
} from '../utils/studentTrainingWeekPlan.js'
import {
  COACH_BRIDGE_MAX_MESSAGES,
  countCoachUnreadFromStudent,
  countStudentUnreadFromPersona,
  newBridgeMessageId,
  normalizeCoachBridgeThread,
} from '../utils/coachBridgeModel.js'
const BRIDGE_SUB = 'coach_bridge'

/**
 * @param {string} studentId
 * @param {object} patch
 * @param {{ asCoach?: boolean }} [opts]
 */
async function patchStudentBridgeFields(studentId, patch, opts = {}) {
  const payload = { ...patch, updatedAt: serverTimestamp(), lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal }
  if (opts.asCoach) {
    await updateStudentData(studentId, payload, { section: STUDENT_UPDATE_SECTION.studentPortal })
    return
  }
  await updateDoc(doc(ensureDb(), 'students', studentId), payload)
}

function bridgeRef(studentId, coachId) {
  return doc(ensureDb(), 'students', studentId, BRIDGE_SUB, coachId)
}

/**
 * @param {string} studentId
 * @param {string} coachId
 * @param {(thread: import('../utils/coachBridgeModel.js').CoachBridgeThread) => void} onChange
 */
export function subscribeCoachBridgeThread(studentId, coachId, onChange) {
  if (!isFirebaseConfigured || !studentId || !coachId) {
    onChange({ pendingDraft: null, messages: [] })
    return () => {}
  }
  return onSnapshot(
    bridgeRef(studentId, coachId),
    (snap) => {
      onChange(snap.exists() ? normalizeCoachBridgeThread(snap.data()) : { pendingDraft: null, messages: [] })
    },
    (err) => {
      console.error('subscribeCoachBridgeThread', err)
      onChange({ pendingDraft: null, messages: [] })
    },
  )
}

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   draftToStudent: string,
 *   reason?: string,
 * }} params
 */
export async function saveCoachBridgeDraft({ studentId, coachId, draftToStudent, reason = '' }) {
  if (!studentId || !coachId) return
  const text = String(draftToStudent ?? '').trim().slice(0, 2000)
  if (!text) {
    await setDoc(
      bridgeRef(studentId, coachId),
      { pendingDraft: null, updatedAt: serverTimestamp() },
      { merge: true },
    )
    return
  }
  await setDoc(
    bridgeRef(studentId, coachId),
    {
      pendingDraft: {
        text,
        reason: String(reason ?? '').trim().slice(0, 500),
        createdAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * @param {object} studentSnapData
 * @param {string} coachId
 * @param {import('../utils/coachBridgeModel.js').CoachBridgeMessage[]} messages
 */
function buildCoachBridgeInboxPatch(studentSnapData, coachId, messages) {
  const unread = countCoachUnreadFromStudent(messages)
  const lastFromStudent = [...messages].reverse().find((m) => m.dir === 'from_student')
  const prevInbox =
    studentSnapData?.coachBridgeInbox && typeof studentSnapData.coachBridgeInbox === 'object'
      ? { ...studentSnapData.coachBridgeInbox }
      : {}
  if (unread > 0 && lastFromStudent) {
    prevInbox[coachId] = {
      unreadFromStudent: unread,
      lastPreview: lastFromStudent.text.slice(0, 120),
      lastAt: lastFromStudent.at,
    }
  } else {
    delete prevInbox[coachId]
  }
  return { coachBridgeInbox: prevInbox }
}

function buildPortalBridgePatch(coachId, messages) {
  const unread = countStudentUnreadFromPersona(messages)
  const lastToStudent = [...messages].reverse().find((m) => m.dir === 'to_student')
  return {
    portalBridge: {
      unreadCount: Math.max(0, unread),
      lastPreview: lastToStudent?.text?.slice(0, 120) ?? '',
      lastAt: lastToStudent?.at ?? null,
      coachId: coachId || null,
    },
  }
}

/**
 * Проверяет, что сообщение попало в thread и portalBridge ученика.
 * @param {string} studentId
 * @param {string} coachId
 * @param {string} messageId
 */
export async function verifyCoachBridgeDelivery(studentId, coachId, messageId) {
  const [studentSnap, threadSnap] = await Promise.all([
    getDoc(doc(ensureDb(), 'students', studentId)),
    getDoc(bridgeRef(studentId, coachId)),
  ])

  if (!studentSnap.exists()) {
    throw new Error('Карточка ученика не найдена после отправки.')
  }
  if (!threadSnap.exists()) {
    throw new Error(
      'Переписка не сохранилась. Задеплойте правила Firestore: npx firebase-tools deploy --only firestore:rules',
    )
  }

  const thread = normalizeCoachBridgeThread(threadSnap.data())
  const message = thread.messages.find((m) => m.id === messageId && m.dir === 'to_student')
  if (!message) {
    throw new Error(
      'Сообщение не записалось в coach_bridge. Задеплойте правила Firestore: npx firebase-tools deploy --only firestore:rules',
    )
  }

  const portalBridge = studentSnap.data()?.portalBridge
  const unread = Number(portalBridge?.unreadCount) || 0
  const preview = String(portalBridge?.lastPreview ?? '').trim()
  if (unread < 1 && !preview) {
    throw new Error(
      'Кабинет ученика не обновился (portalBridge). Проверьте права тренера и правила Firestore.',
    )
  }

  return {
    message,
    portalBridge: {
      unreadCount: unread,
      lastPreview: preview || message.text.slice(0, 120),
      lastAt: portalBridge?.lastAt ?? message.at,
      coachId,
    },
  }
}

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   text: string,
 *   personaId?: string,
 *   requestType?: import('../utils/coachBridgeTemplates.js').CoachBridgeRequestType | null,
 *   scheduleWeek?: import('../utils/coachBridgeModel.js').CoachBridgeScheduleWeek | null,
 * }} params
 */
export async function approveCoachBridgeMessage({
  studentId,
  coachId,
  text,
  personaId = null,
  requestType = null,
  scheduleWeek = null,
}) {
  const messageText = String(text ?? '').trim().slice(0, 2000)
  if (!studentId || !coachId || !messageText) throw new Error('Нет текста сообщения.')

  const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
  if (!studentSnap.exists()) throw new Error('Ученик не найден.')

  const threadSnap = await getDoc(bridgeRef(studentId, coachId))
  const thread = normalizeCoachBridgeThread(threadSnap.exists() ? threadSnap.data() : null)
  const now = new Date().toISOString()
  const msg = {
    id: newBridgeMessageId(),
    dir: 'to_student',
    text: messageText,
    at: now,
    readByCoachAt: now,
    readByStudentAt: null,
    approvedByCoachId: coachId,
    personaId: personaId || null,
    requestType: requestType || null,
    scheduleWeek:
      scheduleWeek?.weekStartISO && scheduleWeek?.weekEndISO
        ? {
            weekStartISO: scheduleWeek.weekStartISO,
            weekEndISO: scheduleWeek.weekEndISO,
          }
        : null,
  }
  const messages = [...thread.messages, msg].slice(-COACH_BRIDGE_MAX_MESSAGES)

  await setDoc(
    bridgeRef(studentId, coachId),
    {
      messages,
      pendingDraft: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  await patchStudentBridgeFields(studentId, {
    ...buildPortalBridgePatch(coachId, messages),
    ...buildCoachBridgeInboxPatch(studentSnap.data(), coachId, messages),
  }, { asCoach: true })

  const verified = await verifyCoachBridgeDelivery(studentId, coachId, msg.id)

  return { message: verified.message, messages, portalBridge: verified.portalBridge, delivered: true }
}

/**
 * @param {string} studentId
 * @param {string} coachId
 */
export async function markCoachBridgeReadByCoach(studentId, coachId) {
  if (!studentId || !coachId) return null
  const threadSnap = await getDoc(bridgeRef(studentId, coachId))
  if (!threadSnap.exists()) return null

  const thread = normalizeCoachBridgeThread(threadSnap.data())
  const now = new Date().toISOString()
  let changed = false
  const messages = thread.messages.map((m) => {
    if (m.dir === 'from_student' && !m.readByCoachAt) {
      changed = true
      return { ...m, readByCoachAt: now }
    }
    return m
  })
  if (!changed) return thread

  await setDoc(bridgeRef(studentId, coachId), { messages, updatedAt: serverTimestamp() }, { merge: true })

  const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
  const patch = buildCoachBridgeInboxPatch(studentSnap.exists() ? studentSnap.data() : {}, coachId, messages)
  await patchStudentBridgeFields(studentId, patch, { asCoach: true })
  return { messages }
}

/**
 * @param {{ studentId: string, coachId: string, text: string }} params
 */
export async function sendStudentBridgeReply({ studentId, coachId, text }) {
  const replyText = String(text ?? '').trim().slice(0, 2000)
  if (!studentId || !coachId || !replyText) throw new Error('Введите ответ.')

  const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
  if (!studentSnap.exists()) throw new Error('Карточка не найдена.')

  const threadSnap = await getDoc(bridgeRef(studentId, coachId))
  const thread = normalizeCoachBridgeThread(threadSnap.exists() ? threadSnap.data() : null)
  const now = new Date().toISOString()
  const msg = {
    id: newBridgeMessageId(),
    dir: 'from_student',
    text: replyText,
    at: now,
    readByCoachAt: null,
    readByStudentAt: now,
  }
  const messages = [...thread.messages, msg].slice(-COACH_BRIDGE_MAX_MESSAGES)

  await setDoc(
    bridgeRef(studentId, coachId),
    { messages, updatedAt: serverTimestamp() },
    { merge: true },
  )

  await patchStudentBridgeFields(studentId, {
    ...buildCoachBridgeInboxPatch(studentSnap.data(), coachId, messages),
    ...buildPortalBridgePatch(coachId, messages),
  })

  return { message: msg, messages }
}

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   weekStartISO: string,
 *   weekEndISO: string,
 *   trainingDays: string[],
 *   bridgeRequestMessageId?: string | null,
 * }} params
 */
export async function sendStudentBridgeScheduleReply({
  studentId,
  coachId,
  weekStartISO,
  weekEndISO,
  trainingDays,
  bridgeRequestMessageId = null,
}) {
  const days = [...new Set(trainingDays.map((d) => String(d).trim()).filter(Boolean))].sort()
  if (!studentId || !coachId || !weekStartISO || !weekEndISO || days.length === 0) {
    throw new Error('Выберите тренировочные дни.')
  }
  if (days.length > 6) throw new Error('Максимум 6 тренировок — нужен хотя бы один день отдыха.')

  const week = buildWeekFromStartISO(weekStartISO)
  const replyText = formatTrainingWeekReply(week, days)

  const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
  if (!studentSnap.exists()) throw new Error('Карточка не найдена.')

  const threadSnap = await getDoc(bridgeRef(studentId, coachId))
  const thread = normalizeCoachBridgeThread(threadSnap.exists() ? threadSnap.data() : null)
  const now = new Date().toISOString()
  const msg = {
    id: newBridgeMessageId(),
    dir: 'from_student',
    text: replyText,
    at: now,
    readByCoachAt: null,
    readByStudentAt: now,
    scheduleReply: {
      weekStartISO,
      weekEndISO,
      trainingDays: days,
    },
  }
  const messages = [...thread.messages, msg].slice(-COACH_BRIDGE_MAX_MESSAGES)

  await setDoc(
    bridgeRef(studentId, coachId),
    { messages, updatedAt: serverTimestamp() },
    { merge: true },
  )

  await patchStudentBridgeFields(studentId, {
    ...buildCoachBridgeInboxPatch(studentSnap.data(), coachId, messages),
    ...buildPortalBridgePatch(coachId, messages),
    studentTrainingWeekPlan: {
      weekStartISO,
      weekEndISO,
      trainingDays: days,
      submittedAt: now,
      coachId,
      bridgeMessageId: bridgeRequestMessageId || null,
    },
  })

  return { message: msg, messages }
}

/**
 * @param {string} studentId
 * @param {string} coachId
 */
export async function markCoachBridgeReadByStudent(studentId, coachId) {
  if (!studentId || !coachId) return null
  const threadSnap = await getDoc(bridgeRef(studentId, coachId))
  if (!threadSnap.exists()) return null

  const thread = normalizeCoachBridgeThread(threadSnap.data())
  const now = new Date().toISOString()
  let changed = false
  const messages = thread.messages.map((m) => {
    if (m.dir === 'to_student' && !m.readByStudentAt) {
      changed = true
      return { ...m, readByStudentAt: now }
    }
    return m
  })
  if (!changed) return thread

  await setDoc(bridgeRef(studentId, coachId), { messages, updatedAt: serverTimestamp() }, { merge: true })

  const studentSnap = await getDoc(doc(ensureDb(), 'students', studentId))
  await patchStudentBridgeFields(studentId, {
    ...buildPortalBridgePatch(coachId, messages),
    ...buildCoachBridgeInboxPatch(studentSnap.exists() ? studentSnap.data() : {}, coachId, messages),
  })
  return { messages }
}

/** @param {string} studentId */
export async function resolveStudentBridgeCoachId(studentId) {
  const snap = await getDoc(doc(ensureDb(), 'students', studentId))
  if (!snap.exists()) return null
  const data = snap.data()
  const fromPortal = data?.portalBridge?.coachId
  if (typeof fromPortal === 'string' && fromPortal) return fromPortal
  if (typeof data.coachId === 'string' && data.coachId) return data.coachId
  const ids = Array.isArray(data.coach_ids) ? data.coach_ids : data.coachIds
  if (Array.isArray(ids) && ids[0]) return String(ids[0])
  return null
}
