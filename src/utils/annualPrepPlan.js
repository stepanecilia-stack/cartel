import {
  buildAnnualDaySlots,
  resolveAnnualMacroPeriodForDate,
} from '../data/annualPrepCycle.js'
import { resolveJuniorAgeBand } from '../data/juniorPrepTracks.js'
import { buildCompetitionPrepPlan } from './competitionPrepPlan.js'
import { daysUntilCompetition } from './competitionDate.js'
import { localDateISO } from './prepCalendarGrid.js'
import { resolveFocusCompetition } from './plannedCompetitions.js'

/**
 * @param {number} year
 */
function buildYearDateRange(year) {
  const start = new Date(year, 0, 1, 12, 0, 0, 0)
  const end = new Date(year, 11, 31, 12, 0, 0, 0)
  const days = []
  const cursor = new Date(start)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  while (cursor <= end) {
    const iso = localDateISO(cursor)
    const annualPeriod = resolveAnnualMacroPeriodForDate(iso)
    const cd = new Date(cursor)
    cd.setHours(0, 0, 0, 0)
    days.push({
      dateISO: iso,
      isToday: cd.getTime() === today.getTime(),
      isPast: cd.getTime() < today.getTime(),
      annualPeriod,
      annualSlots: buildAnnualDaySlots(annualPeriod),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/**
 * @param {{
 *   year?: number,
 *   ageInt?: number | null,
 *   plannedCompetitions: import('./plannedCompetitions.js').PlannedCompetition[],
 *   focusCompetitionId?: string | null,
 * }} ctx
 */
export function buildAnnualPrepPlan(ctx) {
  const year = ctx.year ?? new Date().getFullYear()
  const ageInt = ctx.ageInt ?? null
  const ageBand = resolveJuniorAgeBand(ageInt)
  const planned = ctx.plannedCompetitions ?? []
  const focus = resolveFocusCompetition(planned, ctx.focusCompetitionId ?? null)

  const yearDays = buildYearDateRange(year)

  const competitionsByDate = new Map()
  for (const c of planned) {
    if (!c.dateISO.startsWith(String(year))) continue
    const arr = competitionsByDate.get(c.dateISO) ?? []
    arr.push(c)
    competitionsByDate.set(c.dateISO, arr)
  }

  for (const day of yearDays) {
    day.competitions = competitionsByDate.get(day.dateISO) ?? []
    day.isFightDay = day.competitions.length > 0
    day.isFocusFightDay = focus?.dateISO === day.dateISO
  }

  const todayIso = localDateISO(new Date())
  const todayAnnual = resolveAnnualMacroPeriodForDate(todayIso)

  let focusPrepPlan = null
  if (ageBand && focus?.dateISO) {
    focusPrepPlan = buildCompetitionPrepPlan({
      ageInt,
      competitionDate: focus.dateISO,
      competitionTitle: focus.title,
    })
  }

  if (focusPrepPlan && !focusPrepPlan.unsupported && focusPrepPlan.calendarDays) {
    const microByIso = new Map(focusPrepPlan.calendarDays.map((d) => [d.dateISO, d]))
    for (const day of yearDays) {
      const micro = microByIso.get(day.dateISO)
      if (micro) {
        day.inFocusPrep = true
        day.microPhase = micro.phase
        day.slots = micro.slots
        day.daysUntilOnDay = micro.daysUntilOnDay
        day.isTransitionDay = micro.isTransitionDay
      }
    }
  }

  return {
    year,
    unsupported: !ageBand,
    ageBand,
    plannedCompetitions: planned,
    focusCompetition: focus,
    todayAnnual,
    focusPrepPlan,
    yearDays,
  }
}

/** @param {string | null} focusDateISO */
export function focusPrepHorizonDays(focusDateISO) {
  return daysUntilCompetition(focusDateISO)
}
