import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import db, { isFirebaseConfigured } from './firebaseService.js'
import { trimCoachAssistantChatMessages } from '../utils/coachAssistantChatHistory.js'
import {
  buildCoachColleagueBriefFromMessages,
} from '../utils/coachColleagueBrief.js'
import { normalizePortalPersonaMemory } from '../utils/portalPersonaMemory.js'
import { normalizePortalPersonaId } from '../constants/studentPortalPersonas.js'
import { updateStudentData } from './firebaseService.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'

const THREADS_SUB = 'coach_assistant_threads'

function ensureDb() {
  if (!db) throw new Error('Firebase не настроен')
  return db
}

function threadRef(studentId, coachId) {
  return doc(ensureDb(), 'students', studentId, THREADS_SUB, coachId)
}

/**
 * @param {unknown} raw
 * @returns {import('../utils/coachAssistantChatHistory.js').CoachAssistantChatMessage[]}
 */
function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  return trimCoachAssistantChatMessages(
    raw
      .map((m) => {
        if (!m || typeof m !== 'object') return null
        const role = m.role === 'user' || m.role === 'assistant' ? m.role : null
        const content = typeof m.content === 'string' ? m.content.trim() : ''
        if (!role || !content) return null
        return { role, content: content.slice(0, 4000) }
      })
      .filter(Boolean),
  )
}

/**
 * @param {string} studentId
 * @param {string} coachId
 * @param {(thread: { messages: import('../utils/coachAssistantChatHistory.js').CoachAssistantChatMessage[], personaId: string } | null) => void} onChange
 */
export function subscribeCoachAssistantStudentThread(studentId, coachId, onChange) {
  if (!isFirebaseConfigured || !studentId || !coachId) {
    onChange(null)
    return () => {}
  }
  return onSnapshot(
    threadRef(studentId, coachId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null)
        return
      }
      const data = snap.data() ?? {}
      onChange({
        messages: normalizeMessages(data.messages),
        personaId: normalizePortalPersonaId(data.personaId),
      })
    },
    (err) => {
      console.error('subscribeCoachAssistantStudentThread', err)
      onChange(null)
    },
  )
}

/**
 * @param {string} studentId
 * @param {string} coachId
 */
export async function loadCoachAssistantStudentThread(studentId, coachId) {
  if (!isFirebaseConfigured || !studentId || !coachId) return null
  const snap = await getDoc(threadRef(studentId, coachId))
  if (!snap.exists()) return null
  const data = snap.data() ?? {}
  return {
    messages: normalizeMessages(data.messages),
    personaId: normalizePortalPersonaId(data.personaId),
  }
}

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   personaId: string,
 *   messages: import('../utils/coachAssistantChatHistory.js').CoachAssistantChatMessage[],
 * }} params
 */
export async function saveCoachAssistantStudentThread({ studentId, coachId, personaId, messages }) {
  if (!isFirebaseConfigured) return
  const trimmed = normalizeMessages(messages)
  await setDoc(
    threadRef(studentId, coachId),
    {
      personaId: normalizePortalPersonaId(personaId),
      messages: trimmed,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  await syncCoachColleagueBriefToStudent(studentId, coachId, trimmed)
}

/**
 * @param {string} studentId
 * @param {string} coachId
 * @param {import('../utils/coachAssistantChatHistory.js').CoachAssistantChatMessage[]} messages
 */
export async function syncCoachColleagueBriefToStudent(studentId, coachId, messages) {
  if (!isFirebaseConfigured || !studentId) return null

  const brief = buildCoachColleagueBriefFromMessages(messages)
  const now = new Date().toISOString()

  const snap = await getDoc(doc(ensureDb(), 'students', studentId))
  if (!snap.exists()) return null
  const existing = normalizePortalPersonaMemory(snap.data()?.portalPersonaMemory)

  const nextMemory = normalizePortalPersonaMemory({
    ...existing,
    coachColleagueBrief: brief,
    coachColleagueBriefAt: brief ? now : null,
    coachColleagueBriefByCoachId: brief ? coachId : null,
    updatedAt: now,
  })

  await updateStudentData(studentId, {
    portalPersonaMemory: nextMemory,
    lastUpdatedSection: STUDENT_UPDATE_SECTION.studentPortal,
  })

  return nextMemory
}

/**
 * @param {string} studentId
 * @param {string} coachId
 */
export async function clearCoachAssistantStudentThread(studentId, coachId) {
  if (!isFirebaseConfigured) return null
  await deleteDoc(threadRef(studentId, coachId)).catch(() => {})
  return syncCoachColleagueBriefToStudent(studentId, coachId, [])
}
