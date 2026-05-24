import { normalizeCompetitionRange } from '../data/competitionLevels.js'
import {
  defaultExternalCampTitle,
  normalizeExternalCampOrganizer,
} from '../data/externalCampKinds.js'
import { competitionDateToInputString } from './competitionDate.js'
import { isOrientirStart, pickNearestFutureCompetition } from './plannedCompetitions.js'

/**
 * @typedef {import('../data/externalCampKinds.js').ExternalCampOrganizer} ExternalCampOrganizer
 * @typedef {{
 *   enabled: boolean,
 *   dateISO: string,
 *   dateEndISO: string,
 *   organizer: ExternalCampOrganizer,
 *   title: string,
 * }} OrientirExternalCamp
 * @typedef {{
 *   id: string,
 *   coachId: string,
 *   orientirId: string,
 *   participantIds: string[],
 *   externalCamp: OrientirExternalCamp | null,
 * }} OrientirParticipation
 */

/** @param {unknown} raw */
export function normalizeOrientirExternalCamp(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.enabled === false) return null
  const dateISO = competitionDateToInputString(raw.dateISO)
  if (!dateISO) return null
  const organizer = normalizeExternalCampOrganizer(raw.organizer)
  const range = normalizeCompetitionRange(dateISO, raw.dateEndISO ?? dateISO)
  const title =
    typeof raw.title === 'string'
      ? defaultExternalCampTitle(organizer, raw.title)
      : defaultExternalCampTitle(organizer, '')
  return {
    enabled: true,
    dateISO: range.dateISO,
    dateEndISO: range.dateEndISO,
    organizer,
    title,
  }
}

/** @param {OrientirParticipation[]} records */
export function participationByOrientirId(records) {
  /** @type {Record<string, string[]>} */
  const map = {}
  for (const r of records) {
    if (r.orientirId) map[r.orientirId] = r.participantIds ?? []
  }
  return map
}

/** @param {OrientirParticipation[]} records */
export function participationRecordByOrientirId(records) {
  /** @type {Record<string, OrientirParticipation>} */
  const map = {}
  for (const r of records) {
    if (r.orientirId) map[r.orientirId] = r
  }
  return map
}

/**
 * @param {Array<import('./plannedCompetitions.js').PlannedCompetition & { participantIds?: string[] }>} items
 * @param {Record<string, string[]>} byOrientirId
 */
export function applyOrientirParticipations(items, byOrientirId) {
  if (!items.length || !Object.keys(byOrientirId).length) return items
  return items.map((c) => {
    if (!isOrientirStart(c)) return c
    const ids = byOrientirId[c.id]
    if (!ids?.length) return c
    return { ...c, participantIds: ids }
  })
}

/** @param {string} orientirId */
export function externalCampCalendarId(orientirId) {
  return `external-camp-${orientirId}`
}

/**
 * @param {OrientirParticipation[]} records
 * @param {{ studentId?: string | null }} [opts]
 */
export function externalCampCalendarItems(records, opts = {}) {
  const { studentId = null } = opts
  /** @type {Array<import('./plannedCompetitions.js').PlannedCompetition & {
 *   planKind: 'external_camp',
 *   anchorOrientirId: string,
 *   externalCampOrganizer: ExternalCampOrganizer,
 *   participantIds?: string[],
 * }>} */
  const out = []
  for (const row of records) {
    const camp = row.externalCamp
    if (!camp?.enabled) continue
    const participantIds = row.participantIds ?? []
    if (studentId && !participantIds.includes(studentId)) continue
    out.push({
      id: externalCampCalendarId(row.orientirId),
      dateISO: camp.dateISO,
      dateEndISO: camp.dateEndISO,
      title: camp.title,
      track: 'federation',
      stage: null,
      dateStatus: /** @type {'confirmed'} */ ('confirmed'),
      planKind: 'external_camp',
      anchorOrientirId: row.orientirId,
      externalCampOrganizer: camp.organizer,
      participantIds,
    })
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/**
 * @param {Array<import('./plannedCompetitions.js').PlannedCompetition>} items
 * @param {OrientirParticipation[]} records
 * @param {{ studentId?: string | null }} [opts]
 */
export function mergeOrientirExternalCamps(items, records, opts = {}) {
  const camps = externalCampCalendarItems(records, opts)
  if (!camps.length) return items
  return [...items, ...camps].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/**
 * @param {Array<{ planKind?: string, dateISO: string, dateEndISO?: string, participantIds?: string[] }>} items
 * @param {string | null | undefined} studentId
 */
export function pickNearestStudentExternalCamp(items, studentId) {
  const camps = items.filter((c) => {
    if (c.planKind !== 'external_camp') return false
    if (!studentId) return true
    return (c.participantIds ?? []).includes(studentId)
  })
  return pickNearestFutureCompetition(camps)
}
