/** @typedef {'to_student' | 'from_student'} CoachBridgeDirection */

/**
 * @typedef {{
 *   weekStartISO: string,
 *   weekEndISO: string,
 * }} CoachBridgeScheduleWeek
 */

/**
 * @typedef {{
 *   weekStartISO: string,
 *   weekEndISO: string,
 *   trainingDays: string[],
 * }} CoachBridgeScheduleReply
 */

/**
 * @typedef {{
 *   id: string,
 *   dir: CoachBridgeDirection,
 *   text: string,
 *   at: string,
 *   readByCoachAt?: string | null,
 *   readByStudentAt?: string | null,
 *   approvedByCoachId?: string | null,
 *   personaId?: string | null,
 *   requestType?: import('./coachBridgeTemplates.js').CoachBridgeRequestType | null,
 *   scheduleWeek?: CoachBridgeScheduleWeek | null,
 *   scheduleReply?: CoachBridgeScheduleReply | null,
 * }} CoachBridgeMessage
 */

/**
 * @typedef {{
 *   text: string,
 *   reason?: string,
 *   createdAt: string,
 * }} CoachBridgePendingDraft
 */

/**
 * @typedef {{
 *   pendingDraft: CoachBridgePendingDraft | null,
 *   messages: CoachBridgeMessage[],
 *   updatedAt?: unknown,
 * }} CoachBridgeThread
 */

export const COACH_BRIDGE_MAX_MESSAGES = 40

/**
 * @param {unknown} raw
 * @returns {CoachBridgeMessage | null}
 */
export function normalizeCoachBridgeMessage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '').trim()
  const text = String(raw.text ?? '').trim()
  const dir = raw.dir === 'from_student' ? 'from_student' : raw.dir === 'to_student' ? 'to_student' : null
  const at = typeof raw.at === 'string' && raw.at.trim() ? raw.at.trim() : null
  if (!id || !text || !dir || !at) return null

  let scheduleWeek = null
  const sw = raw.scheduleWeek
  if (sw && typeof sw === 'object') {
    const weekStartISO = typeof sw.weekStartISO === 'string' ? sw.weekStartISO.trim() : ''
    const weekEndISO = typeof sw.weekEndISO === 'string' ? sw.weekEndISO.trim() : ''
    if (weekStartISO && weekEndISO) {
      scheduleWeek = { weekStartISO, weekEndISO }
    }
  }

  let scheduleReply = null
  const sr = raw.scheduleReply
  if (sr && typeof sr === 'object') {
    const weekStartISO = typeof sr.weekStartISO === 'string' ? sr.weekStartISO.trim() : ''
    const weekEndISO = typeof sr.weekEndISO === 'string' ? sr.weekEndISO.trim() : ''
    const trainingDays = Array.isArray(sr.trainingDays)
      ? sr.trainingDays.filter((d) => typeof d === 'string').map((d) => d.trim()).filter(Boolean)
      : []
    if (weekStartISO && weekEndISO && trainingDays.length) {
      scheduleReply = { weekStartISO, weekEndISO, trainingDays }
    }
  }

  const requestTypeRaw = typeof raw.requestType === 'string' ? raw.requestType.trim() : ''
  const requestType =
    requestTypeRaw === 'training_frequency' ||
    requestTypeRaw === 'wellbeing' ||
    requestTypeRaw === 'custom'
      ? requestTypeRaw
      : null

  return {
    id,
    dir,
    text: text.slice(0, 2000),
    at,
    readByCoachAt: typeof raw.readByCoachAt === 'string' ? raw.readByCoachAt : null,
    readByStudentAt: typeof raw.readByStudentAt === 'string' ? raw.readByStudentAt : null,
    approvedByCoachId:
      typeof raw.approvedByCoachId === 'string' ? raw.approvedByCoachId : null,
    personaId: typeof raw.personaId === 'string' ? raw.personaId : null,
    requestType,
    scheduleWeek,
    scheduleReply,
  }
}

/**
 * @param {unknown} raw
 * @returns {CoachBridgeThread}
 */
export function normalizeCoachBridgeThread(raw) {
  if (!raw || typeof raw !== 'object') {
    return { pendingDraft: null, messages: [] }
  }
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(normalizeCoachBridgeMessage).filter(Boolean).slice(-COACH_BRIDGE_MAX_MESSAGES)
    : []
  let pendingDraft = null
  const pd = raw.pendingDraft
  if (pd && typeof pd === 'object') {
    const text = String(pd.text ?? '').trim()
    const createdAt = typeof pd.createdAt === 'string' ? pd.createdAt : new Date().toISOString()
    if (text) {
      pendingDraft = {
        text: text.slice(0, 2000),
        reason: typeof pd.reason === 'string' ? pd.reason.trim().slice(0, 500) : '',
        createdAt,
      }
    }
  }
  return { pendingDraft, messages, updatedAt: raw.updatedAt }
}

/**
 * @param {unknown} raw
 * @param {string} coachId
 */
export function readCoachBridgeInboxEntry(raw, coachId) {
  const inbox = raw?.coachBridgeInbox
  if (!inbox || typeof inbox !== 'object' || !coachId) return null
  const entry = inbox[coachId]
  if (!entry || typeof entry !== 'object') return null
  const unread = Number(entry.unreadFromStudent) || 0
  if (unread <= 0) return null
  return {
    unreadFromStudent: unread,
    lastPreview: String(entry.lastPreview ?? '').trim(),
    lastAt: typeof entry.lastAt === 'string' ? entry.lastAt : null,
  }
}

/**
 * @param {unknown} raw
 */
export function readPortalBridgeState(raw) {
  const pb = raw?.portalBridge
  if (!pb || typeof pb !== 'object') return { unreadCount: 0, lastPreview: '', lastAt: null, coachId: null }
  return {
    unreadCount: Math.max(0, Number(pb.unreadCount) || 0),
    lastPreview: String(pb.lastPreview ?? '').trim(),
    lastAt: typeof pb.lastAt === 'string' ? pb.lastAt : null,
    coachId: typeof pb.coachId === 'string' ? pb.coachId : null,
  }
}

export function countCoachUnreadFromStudent(messages) {
  if (!Array.isArray(messages)) return 0
  return messages.filter((m) => m?.dir === 'from_student' && !m.readByCoachAt).length
}

export function countStudentUnreadFromPersona(messages) {
  if (!Array.isArray(messages)) return 0
  return messages.filter((m) => m?.dir === 'to_student' && !m.readByStudentAt).length
}

export function newBridgeMessageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `br_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
