import { competitionDateRange } from '../data/competitionLevels.js'
import { localDateISO, monthDateRange } from './prepCalendarGrid.js'
import { buildPrepCalendarWeeks } from './prepCalendarGrid.js'

/**
 * @param {number} year
 * @param {number} month 0–11
 * @param {import('./plannedCompetitions.js').PlannedCompetition[]} planned
 */
export function countCompetitionsInMonth(year, month, planned) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const ids = new Set()
  for (const c of planned) {
    for (const iso of competitionDateRange(c)) {
      if (iso.startsWith(prefix)) ids.add(c.id)
    }
  }
  return ids.size
}

/**
 * @param {number} year
 * @param {number} month
 * @param {import('./plannedCompetitions.js').PlannedCompetition[]} planned
 * @param {string | null} focusId
 * @param {string} todayIso
 */
export function buildSeasonMonthDays(year, month, planned, focusId, todayIso) {
  const { start, end } = monthDateRange(year, month)
  const byIso = new Map()

  for (const c of planned) {
    for (const iso of competitionDateRange(c)) {
      if (!iso.startsWith(String(year))) continue
      const arr = byIso.get(iso) ?? []
      arr.push(c)
      byIso.set(iso, arr)
    }
  }

  const days = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const iso = localDateISO(cursor)
    const competitions = byIso.get(iso) ?? []
    const primary = competitions[0] ?? null
    days.push({
      dateISO: iso,
      isToday: iso === todayIso,
      competitions,
      primaryCompetition: primary,
      isFocusDay: Boolean(focusId && competitions.some((c) => c.id === focusId)),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/**
 * @param {ReturnType<typeof buildSeasonMonthDays>} monthDays
 */
export function seasonMonthToCalendarCells(monthDays) {
  return monthDays.map((d) => ({
    dateISO: d.dateISO,
    isToday: d.isToday,
    isFightDay: d.competitions.length > 0,
    isFocusFightDay: d.isFocusDay,
    competitions: d.competitions,
    primaryCompetition: d.primaryCompetition,
  }))
}

/**
 * @param {ReturnType<typeof buildSeasonMonthDays>} monthDays
 */
export function buildSeasonMonthWeeks(monthDays) {
  const cells = seasonMonthToCalendarCells(monthDays)
  return buildPrepCalendarWeeks(cells)
}
