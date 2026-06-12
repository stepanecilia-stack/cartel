import { FieldValue, getFirestore } from 'firebase-admin/firestore'

export const GROUP_TRAINING_DOC_ID = 'active'
export const GROUP_TRAINING_SCHEMA_VERSION = 1

function db() {
  return getFirestore()
}

function sessionRef(coachId) {
  return db().collection('coaches').doc(coachId).collection('group_training').doc(GROUP_TRAINING_DOC_ID)
}

/**
 * @param {Record<string, unknown> | undefined} raw
 * @param {string} coachId
 */
export function parseGroupTrainingSession(raw, coachId) {
  if (!raw || typeof raw !== 'object' || raw.active === false) return null
  const selectedIds = Array.isArray(raw.selectedIds)
    ? raw.selectedIds.filter((id) => typeof id === 'string' && id)
    : []
  const slidersByStudentId =
    raw.slidersByStudentId && typeof raw.slidersByStudentId === 'object'
      ? raw.slidersByStudentId
      : {}
  const practicedAtomIdsByStudentId = {}
  if (
    raw.practicedAtomIdsByStudentId &&
    typeof raw.practicedAtomIdsByStudentId === 'object'
  ) {
    for (const [studentId, ids] of Object.entries(raw.practicedAtomIdsByStudentId)) {
      if (typeof studentId !== 'string' || !studentId || !Array.isArray(ids)) continue
      const clean = [...new Set(ids.filter((id) => typeof id === 'string' && id))]
      if (clean.length) practicedAtomIdsByStudentId[studentId] = clean
    }
  }
  return {
    coachId,
    active: true,
    phase: raw.phase === 'progress' ? 'progress' : 'compose',
    selectedIds,
    slidersByStudentId,
    practicedAtomIdsByStudentId,
    startedAt:
      typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString(),
    updatedBy: raw.updatedBy === 'telegram' ? 'telegram' : 'app',
    schemaVersion: Number(raw.schemaVersion) || GROUP_TRAINING_SCHEMA_VERSION,
  }
}

/**
 * @param {string} coachId
 */
export async function getGroupTrainingSession(coachId) {
  const snap = await sessionRef(coachId).get()
  if (!snap.exists) return null
  return parseGroupTrainingSession(snap.data(), coachId)
}

/**
 * @param {object} session
 * @param {'app' | 'telegram'} updatedBy
 */
export async function saveGroupTrainingSession(session, updatedBy = 'telegram') {
  if (!session?.coachId) return
  await sessionRef(session.coachId).set(
    {
      active: true,
      phase: session.phase === 'progress' ? 'progress' : 'compose',
      selectedIds: session.selectedIds ?? [],
      slidersByStudentId: session.slidersByStudentId ?? {},
      practicedAtomIdsByStudentId: session.practicedAtomIdsByStudentId ?? {},
      startedAt: session.startedAt ?? new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
      schemaVersion: GROUP_TRAINING_SCHEMA_VERSION,
    },
    { merge: true },
  )
}

/**
 * @param {string} coachId
 */
export async function deleteGroupTrainingSession(coachId) {
  await sessionRef(coachId).delete().catch(() => {})
}

/**
 * @param {string} coachId
 * @param {Iterable<string>} selectedIds
 * @param {'compose' | 'progress'} phase
 */
export async function updateGroupTrainingRoster(coachId, selectedIds, phase = 'compose') {
  const ids = [...new Set(selectedIds)]
  const existing = (await getGroupTrainingSession(coachId)) ?? {
    coachId,
    active: true,
    phase: 'compose',
    selectedIds: [],
    slidersByStudentId: {},
    practicedAtomIdsByStudentId: {},
    startedAt: new Date().toISOString(),
    schemaVersion: GROUP_TRAINING_SCHEMA_VERSION,
  }
  const session = {
    ...existing,
    selectedIds: ids,
    phase: phase === 'progress' ? 'progress' : 'compose',
    startedAt: ids.length && !existing.selectedIds.length ? new Date().toISOString() : existing.startedAt,
  }
  await saveGroupTrainingSession(session, 'telegram')
  return session
}

/**
 * @param {string} coachId
 * @param {string} studentId
 * @param {{ l1: number, l2: number, l3: number }} tiers
 * Задел варианта C: ползунки в сессии (запись в карточку ученика — отдельным шагом).
 */
export async function updateGroupTrainingSliders(coachId, studentId, tiers) {
  const existing = await getGroupTrainingSession(coachId)
  if (!existing) return null
  const session = {
    ...existing,
    slidersByStudentId: {
      ...existing.slidersByStudentId,
      [studentId]: { l1: tiers.l1, l2: tiers.l2, l3: tiers.l3 },
    },
  }
  await saveGroupTrainingSession(session, 'telegram')
  return session
}

/**
 * @param {string} coachId
 * @param {'compose' | 'progress'} phase
 */
export async function setGroupTrainingPhase(coachId, phase) {
  const existing = await getGroupTrainingSession(coachId)
  if (!existing) return null
  const session = { ...existing, phase: phase === 'progress' ? 'progress' : 'compose' }
  await saveGroupTrainingSession(session, 'telegram')
  return session
}
