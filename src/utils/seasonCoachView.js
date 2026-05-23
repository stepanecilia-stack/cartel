import { buildAnnualPrepPlan } from './annualPrepPlan.js'
import { daysUntilCompetition } from './competitionDate.js'
import {
  buildMicroCycleSegments,
  MICRO_PREP_DAILY_HORIZON_DAYS,
} from '../data/juniorPrepTracks.js'
import { seasonModeAllowsMicroPrep } from '../data/seasonGoals.js'
import { getSeasonGoalOptionLabel } from '../data/seasonGoals.js'
import {
  competitionUsesMicroPrep,
  isConfirmedStart,
  isOrientirStart,
} from './plannedCompetitions.js'

/**
 * @param {{
 *   year?: number,
 *   ageInt?: number | null,
 *   plannedCompetitions: import('./plannedCompetitions.js').PlannedCompetition[],
 *   focusCompetitionId?: string | null,
 *   selectedISO?: string,
 *   seasonGoal?: import('../data/seasonGoals.js').SeasonGoalId | string | null,
 *   nextSeasonGoal?: import('../data/seasonGoals.js').SeasonGoalId | string | null,
 *   ladderClosed?: boolean,
 *   seasonBlocks?: import('./seasonPlan.js').SeasonBlock[],
 * }} ctx
 */
export function buildSeasonCoachView(ctx) {
  const year = ctx.year ?? new Date().getFullYear()
  const todayIso = new Date().toISOString().slice(0, 10)
  const selectedISO = ctx.selectedISO ?? todayIso
  const blocks = ctx.seasonBlocks ?? []
  const ladderClosed = Boolean(ctx.ladderClosed)

  const plan = buildAnnualPrepPlan({
    year,
    ageInt: ctx.ageInt,
    plannedCompetitions: ctx.plannedCompetitions,
    focusCompetitionId: ctx.focusCompetitionId,
    seasonGoal: ctx.seasonGoal,
    nextSeasonGoal: ctx.nextSeasonGoal,
    ladderClosed,
  })

  const seasonMode = plan.seasonMode
  const goalLabel = getSeasonGoalOptionLabel(seasonMode, { ladderClosed })
  const focus = plan.focusCompetition
  const focusAnchorId = focus ? focus.coachEventId ?? focus.id : null
  const prepPlan = plan.focusPrepPlan
  const daysUntil = focus?.dateISO ? daysUntilCompetition(focus.dateISO) : null

  const selectedDay =
    plan.yearDays.find((d) => d.dateISO === selectedISO) ??
    plan.yearDays.find((d) => d.isToday) ??
    null

  const segments =
    focus?.dateISO && prepPlan && !prepPlan.unsupported && competitionUsesMicroPrep(focus)
      ? buildMicroCycleSegments(focus.dateISO, todayIso)
      : []

  const prepPhases = segments.filter((s) => ['ofp', 'sfp', 'sttm'].includes(s.id))
  const currentSegment = segments.find((s) => s.isCurrent) ?? null

  const hasBlocksForFocus = Boolean(
    focusAnchorId && blocks.some((b) => b.anchorEventId === focusAnchorId),
  )

  const microAllowed = seasonModeAllowsMicroPrep(seasonMode, {
    ladderClosed,
    focusNewCycle: Boolean(focus?.newLadderCycle),
  })

  const canApplyCalendar = Boolean(
    focus &&
    !isOrientirStart(focus) &&
    isConfirmedStart(focus) &&
    competitionUsesMicroPrep(focus) &&
    microAllowed &&
    prepPlan &&
    !prepPlan.unsupported &&
    daysUntil != null &&
    daysUntil <= MICRO_PREP_DAILY_HORIZON_DAYS,
  )

  let applyBlockedReason = null
  if (!focus) {
    applyBlockedReason = 'Добавьте соревнование ученика на календарь — от его даты посчитаем этапы.'
  } else if (isOrientirStart(focus)) {
    applyBlockedReason =
      'Это ориентир Минспорта без точной даты. Создайте своё событие с подтверждённой датой старта.'
  } else if (!isConfirmedStart(focus)) {
    applyBlockedReason = 'Подтвердите дату старта в карточке события.'
  } else if (!competitionUsesMicroPrep(focus)) {
    applyBlockedReason =
      'Для этого уровня турнира в приложении пока только общий сезонный режим — без разбивки ОФП→СТТМ.'
  } else if (!microAllowed) {
    applyBlockedReason =
      seasonMode === 'foundation'
        ? 'При цели «База» не режем год на пик к одной дате — наращиваем фундамент по месяцу (см. подсказку ниже).'
        : 'Сейчас сезон закрыт или микроцикл к этому старту не активен — смените задачу сезона или отметьте новый цикл.'
  } else if (prepPlan?.unsupported) {
    applyBlockedReason = prepPlan.message ?? 'Укажите год рождения на вкладке «Карта» (13–16 лет).'
  } else if (daysUntil != null && daysUntil > MICRO_PREP_DAILY_HORIZON_DAYS) {
    applyBlockedReason = `До старта больше ${MICRO_PREP_DAILY_HORIZON_DAYS} дней — рано ставить этапы на календарь. Следуйте сезонной подсказке; ближе к дате нажмите «Поставить этапы».`
  }

  return {
    plan,
    selectedDay,
    seasonMode,
    goalLabel,
    focus,
    focusAnchorId,
    prepPlan,
    daysUntil,
    segments,
    prepPhases,
    currentSegment,
    hasBlocksForFocus,
    canApplyCalendar,
    applyBlockedReason,
    todayCoachResolved: selectedDay?.coachResolved ?? null,
  }
}
