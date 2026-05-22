import { normalizeCompetitionRange } from '../data/competitionLevels.js'
import { competitionDateToInputString } from './competitionDate.js'

/**
 * @typedef {'practice' | 'competition'} CoachEventKind
 * @typedef {{
 *   id: string,
 *   coachId: string,
 *   title: string,
 *   dateISO: string,
 *   dateEndISO: string,
 *   kind: CoachEventKind,
 *   participantIds: string[],
 * }} CoachEvent
 */

/** @param {unknown} raw */
export function normalizeCoachEventKind(raw) {
  return raw === 'competition' ? 'competition' : 'practice'
}

/** @param {Record<string, unknown>} raw @param {string} id @param {string} coachId */
export function normalizeCoachEvent(raw, id, coachId) {
  const dateISO = competitionDateToInputString(raw.dateISO ?? raw.date)
  if (!dateISO) return null
  const dateEndISO = competitionDateToInputString(raw.dateEndISO ?? raw.dateEnd) || dateISO
  const range = normalizeCompetitionRange(dateISO, dateEndISO)
  const participantIds = Array.isArray(raw.participantIds)
    ? [...new Set(raw.participantIds.filter((x) => typeof x === 'string' && x.trim()))]
    : []

  return {
    id,
    coachId: typeof raw.coachId === 'string' ? raw.coachId : coachId,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    dateISO: range.dateISO,
    dateEndISO: range.dateEndISO,
    kind: normalizeCoachEventKind(raw.kind),
    participantIds,
  }
}

/**
 * Для сетки календаря (совместимо с PlannedCompetition).
 * @param {CoachEvent} event
 */
export function coachEventToCalendarItem(event) {
  const isCompetition = event.kind === 'competition'
  return {
    id: event.id,
    coachEventId: event.id,
    dateISO: event.dateISO,
    dateEndISO: event.dateEndISO,
    title: event.title,
    track: isCompetition ? 'federation' : 'match',
    stage: isCompetition ? 'russia' : null,
    dateStatus: /** @type {'confirmed'} */ ('confirmed'),
    eventKind: event.kind,
    participantIds: event.participantIds,
  }
}

/**
 * @param {CoachEvent[]} events
 * @param {string | null | undefined} studentId
 */
export function calendarItemsForStudent(events, studentId) {
  if (!studentId) return []
  return events
    .filter((e) => e.participantIds.includes(studentId))
    .map(coachEventToCalendarItem)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/**
 * @param {CoachEvent[]} events
 */
export function calendarItemsForCoach(events) {
  return events.map(coachEventToCalendarItem).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/**
 * События тренера + бледные ориентиры Минспорта на одной сетке.
 * @param {ReturnType<typeof coachEventToCalendarItem>[]} coachItems
 * @param {import('./plannedCompetitions.js').PlannedCompetition[]} orientirItems
 */
export function mergeCalendarWithOrientirs(coachItems, orientirItems) {
  return [...coachItems, ...orientirItems].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/**
 * @param {CoachEvent[]} events
 * @param {string} startISO
 * @param {string} endISO
 * @param {CoachEventKind} kind
 */
export function hasOverlappingCoachEvent(events, startISO, endISO, kind) {
  const range = normalizeCompetitionRange(startISO, endISO)
  return events.some(
    (e) =>
      e.kind === kind &&
      e.dateISO === range.dateISO &&
      e.dateEndISO === range.dateEndISO,
  )
}
