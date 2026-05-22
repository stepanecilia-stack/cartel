import { resolveAnnualMacroPeriodForDate } from '../data/annualPrepCycle.js'
import {
  buildAthleteStageDisplay,
  buildAthleteStageTraining,
  resolveAthleteStageIdForDay,
} from '../data/athletePrepStages.js'
import { resolveCoachBriefForDay } from '../data/prepCoachBriefs.js'
import { resolveSeasonMode, seasonModeAllowsMicroPrep } from '../data/seasonGoals.js'
import { buildSeasonRoadmapSummary, daysFromISOUntil } from '../data/seasonRoadmap.js'
import { resolveJuniorAgeBand } from '../data/juniorPrepTracks.js'
import { buildCompetitionPrepPlan } from './competitionPrepPlan.js'
import { daysUntilCompetition } from './competitionDate.js'
import { localDateISO } from './prepCalendarGrid.js'
import {
  competitionDateRange,
  competitionUsesMicroPrep,
  isConfirmedStart,
  resolveFocusCompetition,
  resolvePlanningAnchor,
} from './plannedCompetitions.js'

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
    const cd = new Date(cursor)
    cd.setHours(0, 0, 0, 0)
    days.push({
      dateISO: iso,
      isToday: cd.getTime() === today.getTime(),
      isPast: cd.getTime() < today.getTime(),
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
 *   seasonGoal?: import('../data/seasonGoals.js').SeasonGoalId | string | null,
 *   nextSeasonGoal?: import('../data/seasonGoals.js').SeasonGoalId | string | null,
 *   ladderClosed?: boolean,
 * }} ctx
 */
export function buildAnnualPrepPlan(ctx) {
  const year = ctx.year ?? new Date().getFullYear()
  const ageInt = ctx.ageInt ?? null
  const ageBand = resolveJuniorAgeBand(ageInt)
  const planned = ctx.plannedCompetitions ?? []
  const focus = resolveFocusCompetition(planned, ctx.focusCompetitionId ?? null)
  const ladderClosed = Boolean(ctx.ladderClosed)
  const seasonMode = resolveSeasonMode({
    seasonGoal: ctx.seasonGoal,
    nextSeasonGoal: ctx.nextSeasonGoal,
    ladderClosed,
  })
  const hasAnyStart = planned.length > 0
  const focusNewCycle = Boolean(focus?.newLadderCycle)

  const yearDays = buildYearDateRange(year)
  const planning = resolvePlanningAnchor(focus, planned)
  const seasonAnchor = planning.anchor
  const anchorCertainty = planning.certainty
  const anchorISO = seasonAnchor?.dateISO ?? null
  const anchorIsConfirmed = anchorCertainty === 'confirmed'

  const competitionsByDate = new Map()
  const focusDates = focus ? new Set(competitionDateRange(focus)) : new Set()

  for (const c of planned) {
    for (const iso of competitionDateRange(c)) {
      if (!iso.startsWith(String(year))) continue
      const arr = competitionsByDate.get(iso) ?? []
      arr.push(c)
      competitionsByDate.set(iso, arr)
    }
  }

  for (const day of yearDays) {
    day.competitions = competitionsByDate.get(day.dateISO) ?? []
    day.isTournamentDay = day.competitions.length > 0
    day.isFightDay = day.isTournamentDay
    day.isFocusFightDay = focusDates.has(day.dateISO)
    day.primaryCompetition = day.competitions[0] ?? null
  }

  const todayIso = localDateISO(new Date())
  const roadmap = buildSeasonRoadmapSummary(
    planned,
    todayIso,
    seasonMode,
    seasonAnchor,
    anchorCertainty,
  )

  let focusPrepPlan = null
  if (
    isConfirmedStart(focus) &&
    seasonModeAllowsMicroPrep(seasonMode, { ladderClosed, focusNewCycle }) &&
    ageBand &&
    focus?.dateISO &&
    competitionUsesMicroPrep(focus)
  ) {
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
        day.useMicroPhase = true
        day.microPhase = micro.phase
        day.slots = micro.slots
        day.daysUntilOnDay = micro.daysUntilOnDay
        day.isTransitionDay = micro.isTransitionDay
      }
    }
  }

  const daysUntilFocus = focusPrepPlan?.daysUntil ?? null

  for (const day of yearDays) {
    const daysUntilAnchorRaw =
      anchorISO && daysFromISOUntil(day.dateISO, anchorISO) >= 0
        ? daysFromISOUntil(day.dateISO, anchorISO)
        : null
    const daysFromToday = Math.max(0, daysFromISOUntil(todayIso, day.dateISO))
    const daysUntilForStages =
      anchorIsConfirmed && daysUntilAnchorRaw != null ? daysUntilAnchorRaw : null
    const daysUntilFocusForStages =
      focus && isConfirmedStart(focus) && daysUntilFocus != null ? daysUntilFocus : null

    day.athleteStageId = resolveAthleteStageIdForDay({
      seasonGoal: ctx.seasonGoal,
      nextSeasonGoal: ctx.nextSeasonGoal,
      ladderClosed,
      inFocusPrep: day.inFocusPrep,
      microPhaseId: day.microPhase?.id,
      isTransitionDay: day.isTransitionDay,
      daysUntilFocus: daysUntilFocusForStages,
      daysUntilAnchor: ladderClosed ? daysUntilForStages : daysUntilFocusForStages,
      daysFromToday,
      hasFocusStart: Boolean(focus),
      anchorCertainty,
    })

    const display = buildAthleteStageDisplay(day.athleteStageId, seasonMode)
    day.calendarPeriod = resolveAnnualMacroPeriodForDate(day.dateISO)
    day.annualPeriod = display
    day.annualTraining = buildAthleteStageTraining(day.athleteStageId, seasonMode)

    day.coachResolved = resolveCoachBriefForDay({
      inFocusPrep: day.inFocusPrep,
      microPhaseId: day.microPhase?.id,
      isTransitionDay: day.isTransitionDay,
      athleteStageId: day.athleteStageId,
      daysUntilFocus,
      daysUntilAnchor: anchorIsConfirmed ? daysUntilAnchorRaw : null,
      anchorCertainty,
      orientirDaysUntil: anchorCertainty === 'orientir' ? daysUntilAnchorRaw : null,
      hasFocusStart: Boolean(focus),
      hasAnyStart,
      seasonGoal: ctx.seasonGoal,
      nextSeasonGoal: ctx.nextSeasonGoal,
      ladderClosed,
      focusNewCycle,
    })
  }

  const todayDay = yearDays.find((d) => d.isToday)
  const todayAnnual = todayDay?.annualPeriod ?? buildAthleteStageDisplay('between', seasonMode)

  return {
    year,
    unsupported: !ageBand,
    ageBand,
    seasonMode,
    ladderClosed,
    anchorCertainty,
    plannedCompetitions: planned,
    focusCompetition: focus,
    todayAnnual,
    focusPrepPlan,
    roadmap,
    yearDays,
  }
}

/** @param {string | null} focusDateISO */
export function focusPrepHorizonDays(focusDateISO) {
  return daysUntilCompetition(focusDateISO)
}
