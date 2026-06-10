/** Снимок открытой карточки ученика (форма + техника) для помощника-тренера. */

/** @type {Record<string, Record<string, unknown>>} */
let snapshots = {}

/**
 * @param {string} studentId
 * @param {Record<string, unknown>} patch
 */
export function setStudentCardLiveSnapshot(studentId, patch) {
  const id = String(studentId ?? '')
  if (!id || !patch || typeof patch !== 'object') return
  snapshots[id] = { ...snapshots[id], ...patch }
}

/**
 * @param {string | undefined | null} studentId
 */
export function getStudentCardLiveSnapshot(studentId) {
  const id = String(studentId ?? '')
  if (!id) return null
  return snapshots[id] ?? null
}

/** @param {string | undefined | null} studentId */
export function clearStudentCardLiveSnapshot(studentId) {
  const id = String(studentId ?? '')
  if (!id) return
  delete snapshots[id]
}

/**
 * @param {object | null | undefined} student
 */
export function mergeStudentCardLiveSnapshot(student) {
  if (!student?.id) return student ?? null
  const live = getStudentCardLiveSnapshot(student.id)
  if (!live) return student
  return { ...student, ...live }
}
