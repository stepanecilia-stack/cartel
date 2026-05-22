import { FEDERATION_CALENDAR_2026 } from '../data/federationCalendar2026.js'
import { isOrientirStart } from './plannedCompetitions.js'

const STAGE_LADDER_ORDER = ['pmo', 'chmo', 'krai', 'district', 'russia', 'russiaSenior']

/**
 * @param {string | null | undefined} stage
 */
export function stageLadderIndex(stage) {
  const i = STAGE_LADDER_ORDER.indexOf(stage ?? '')
  return i >= 0 ? i : 99
}

/**
 * @param {import('./plannedCompetitions.js').PlannedCompetition} c
 * @param {number} year
 */
export function eventTouchesYear(c, year) {
  const yStart = `${year}-01-01`
  const yEnd = `${year}-12-31`
  const end = c.dateEndISO && c.dateEndISO >= c.dateISO ? c.dateEndISO : c.dateISO
  return c.dateISO <= yEnd && end >= yStart
}

/**
 * @param {import('./plannedCompetitions.js').PlannedCompetition[]} items
 * @param {number} year
 */
export function buildCoachSeasonLadderView(items, year) {
  /** @type {Map<string, import('./plannedCompetitions.js').PlannedCompetition[]>} */
  const byCohort = new Map()
  /** @type {import('./plannedCompetitions.js').PlannedCompetition[]} */
  const coachEvents = []

  for (const item of items) {
    if (!eventTouchesYear(item, year)) continue
    if (isOrientirStart(item) && item.orientirCohortId) {
      const arr = byCohort.get(item.orientirCohortId) ?? []
      arr.push(item)
      byCohort.set(item.orientirCohortId, arr)
    } else if (!isOrientirStart(item)) {
      coachEvents.push(item)
    }
  }

  coachEvents.sort((a, b) => a.dateISO.localeCompare(b.dateISO))

  const genderBlocks = [
    { gender: 'M', title: 'Юноши и мужчины' },
    { gender: 'F', title: 'Девушки и женщины' },
  ].map((block) => ({
    ...block,
    cohorts: FEDERATION_CALENDAR_2026.filter((c) => c.gender === block.gender)
      .map((cohort) => ({
        cohort,
        events: (byCohort.get(cohort.id) ?? []).sort(
          (a, b) =>
            stageLadderIndex(a.stage) - stageLadderIndex(b.stage) ||
            a.dateISO.localeCompare(b.dateISO),
        ),
      }))
      .filter((row) => row.events.length > 0),
  })).filter((block) => block.cohorts.length > 0)

  return { coachEvents, genderBlocks }
}
