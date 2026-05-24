import { competitionDateRange } from '../data/competitionLevels.js'
import { isOrientirStart } from './plannedCompetitions.js'
import { localDateISO, monthDateRange } from './prepCalendarGrid.js'
import { buildPrepCalendarWeeks } from './prepCalendarGrid.js'

/**
 * @param {string} a
 * @param {string} b
 */
export function normalizeIsoRange(a, b) {
  const startISO = a <= b ? a : b
  const dateEndISO = a <= b ? b : a
  return { dateISO: startISO, dateEndISO }
}

/**
 * @param {string} iso
 * @param {string} startISO
 * @param {string} endISO
 */
export function isIsoInInclusiveRange(iso, startISO, endISO) {
  return iso >= startISO && iso <= endISO
}

/** @typedef {'idle' | 'end' | 'form'} AssignPickPhase */

/** @typedef {{ phase: AssignPickPhase, range: { startISO: string, endISO: string } | null }} AssignPickState */

/**
 * Следующее состояние выбора периода по клику на день.
 * @param {AssignPickState} state
 * @param {string} iso
 * @returns {AssignPickState}
 */
export function advanceAssignPickOnDay(state, iso) {
  if (state.phase === 'form') return state
  if (state.phase === 'idle') {
    return { phase: 'end', range: { startISO: iso, endISO: iso } }
  }
  if (state.phase === 'end' && state.range) {
    const norm = normalizeIsoRange(state.range.startISO, iso)
    return {
      phase: 'form',
      range: { startISO: norm.dateISO, endISO: norm.dateEndISO },
    }
  }
  return state
}

/** @param {string} iso */
export function formatShortDateRu(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

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
    const competitions = [...(byIso.get(iso) ?? [])].sort((a, b) => {
      const aCoach = isOrientirStart(a) ? 1 : 0
      const bCoach = isOrientirStart(b) ? 1 : 0
      if (aCoach !== bCoach) return aCoach - bCoach
      const ac = a.orientirCohortId ?? ''
      const bc = b.orientirCohortId ?? ''
      if (ac !== bc) return ac.localeCompare(bc)
      return (a.title ?? '').localeCompare(b.title ?? '')
    })
    const primary = competitions.find((c) => !isOrientirStart(c)) ?? competitions[0] ?? null
    days.push({
      dateISO: iso,
      isToday: iso === todayIso,
      competitions,
      primaryCompetition: primary,
      isFocusDay: Boolean(
        focusId &&
          competitions.some(
            (c) => c.id === focusId || c.anchorOrientirId === focusId,
          ),
      ),
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
