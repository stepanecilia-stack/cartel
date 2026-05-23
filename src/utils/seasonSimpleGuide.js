import { PHASE_PLAIN_RU, plainBlockReason } from '../data/coachSimpleLanguage.js'
import { summarizeDaySlots } from '../data/coachGlance.js'
import { formatPrepDateShort } from '../data/juniorPrepTracks.js'
import { buildSeasonCoachView } from './seasonCoachView.js'
import { isOrientirStart } from './plannedCompetitions.js'

/**
 * @param {ReturnType<typeof buildSeasonCoachView>} view
 */
function trainingLinesForToday(view) {
  const day = view.plan.yearDays.find((d) => d.isToday)
  if (!day) return ['Откройте карточку ученика с указанным годом рождения.']

  if (day.inFocusPrep && day.slots?.length) {
    const summary = summarizeDaySlots(day.slots)
    if (summary.length) {
      return summary.slice(0, 4).map((s) => `${s.label}: ${s.line}`)
    }
  }

  const brief = view.todayCoachResolved?.brief
  if (brief?.teach?.length) {
    return brief.teach.slice(0, 3)
  }
  if (brief?.mission) {
    return [brief.mission]
  }

  const phaseId = day.microPhase?.id ?? day.athleteStageId
  if (phaseId && PHASE_PLAIN_RU[phaseId]) {
    return [PHASE_PLAIN_RU[phaseId]]
  }

  return ['Школа бокса, снаряды, лёгкий ОФП — по самочувствию.']
}

/**
 * @param {{
 *   year: number,
 *   ageInt?: number | null,
 *   calendarItems: import('./plannedCompetitions.js').PlannedCompetition[],
 *   focusCompetitionId?: string | null,
 *   selectedISO?: string,
 *   seasonGoal?: import('../data/seasonGoals.js').SeasonGoalId | string | null,
 *   nextSeasonGoal?: import('../data/seasonGoals.js').SeasonGoalId | string | null,
 *   ladderClosed?: boolean,
 *   seasonBlocks?: import('./seasonPlan.js').SeasonBlock[],
 * }} ctx
 */
export function buildSeasonSimpleGuide(ctx) {
  const view = buildSeasonCoachView(ctx)
  const coachStarts = ctx.calendarItems.filter((c) => !isOrientirStart(c) && c.coachEventId)
  const hasOwnStart = coachStarts.length > 0

  const phaseSchedule = view.prepPhases.map((seg) => ({
    id: seg.id,
    plain: PHASE_PLAIN_RU[seg.id] ?? seg.label,
    range: `${formatPrepDateShort(seg.dateStartISO)} – ${formatPrepDateShort(seg.dateEndISO)}`,
    isCurrent: seg.isCurrent,
  }))

  if (!hasOwnStart) {
    return {
      step: 1,
      totalSteps: 3,
      headline: 'Шаг 1 из 3: когда бой?',
      lead: 'Добавьте соревнование ученика с точной датой. Ориентиры федерации — не считаются.',
      action: /** @type {'add_event'} */ ('add_event'),
      actionLabel: 'Добавить соревнование',
      trainingToday: null,
      phaseSchedule,
      view,
    }
  }

  if (!view.hasBlocksForFocus) {
    return {
      step: 2,
      totalSteps: 3,
      headline: 'Шаг 2 из 3: план на календарь',
      lead: view.canApplyCalendar
        ? `Перед «${view.focus?.title || 'стартом'}» приложение само расставит три периода подготовки. Вам останется открывать подсказки перед тренировкой.`
        : plainBlockReason(view.applyBlockedReason),
      action: view.canApplyCalendar ? /** @type {'apply_plan'} */ ('apply_plan') : null,
      actionLabel: view.canApplyCalendar ? 'Расставить подготовку на календаре' : null,
      phaseSchedule,
      trainingToday: null,
      view,
    }
  }

  const currentPhase = view.currentSegment
  const phasePlain = currentPhase ? PHASE_PLAIN_RU[currentPhase.id] : null

  return {
    step: 3,
    totalSteps: 3,
    headline: 'Шаг 3: что делать на тренировках',
    lead:
      view.daysUntil != null && view.daysUntil >= 0
        ? `До «${view.focus?.title || 'старта'}» ${view.daysUntil === 0 ? 'сегодня бой' : `ещё ${view.daysUntil} дн`}.`
        : 'Следуйте подсказкам ниже.',
    subLead: phasePlain
      ? `Сейчас период: ${phasePlain}`
      : view.todayCoachResolved?.brief?.mission ?? null,
    action: null,
    actionLabel: null,
    trainingToday: trainingLinesForToday(view),
    checkToday: view.todayCoachResolved?.brief?.check ?? null,
    phaseSchedule,
    view,
  }
}
