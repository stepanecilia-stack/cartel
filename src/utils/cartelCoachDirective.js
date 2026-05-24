import {
  CARTEL_RULE_TEXT,
  cartelStageMeta,
  compareCartelStage,
  defaultTrainingForStage,
  normalizeCartelStage,
} from '../data/cartelParticipation.js'
import {
  buildCartelMetrics,
  checklistForCartelStage,
  computeEligibleCartelStage,
} from './cartelMetrics.js'
import { buildSeasonCoachView } from './seasonCoachView.js'
import { summarizeDaySlots } from '../data/coachGlance.js'

/**
 * @typedef {'open_technical' | 'open_physical' | 'open_motor' | 'add_sparring' | 'add_match' | 'toggle_special_pass' | 'add_event' | 'apply_plan' | null} CartelActionType
 */

/**
 * @typedef {{
 *   type: CartelActionType,
 *   label: string,
 * }} CartelAction
 */

/**
 * @param {ReturnType<typeof buildSeasonCoachView>} seasonView
 */
function trainingFromSeasonView(seasonView) {
  const day = seasonView.plan.yearDays.find((d) => d.isToday)
  if (!day) return null

  if (day.inFocusPrep && day.slots?.length) {
    const lines = summarizeDaySlots(day.slots)
    if (lines.length) {
      return lines.slice(0, 4).map((s) => `${s.label}: ${s.line}`)
    }
  }

  const brief = day.coachResolved?.brief
  if (brief?.teach?.length) return brief.teach.slice(0, 3)
  return null
}

/**
 * @param {{
 *   student?: Record<string, unknown> | null,
 *   allNorms?: object[],
 *   confirmedStage?: string | null,
 *   kd?: number,
 *   techniquePercent?: number,
 *   atomsAtSkill?: number,
 *   totalAtoms?: number,
 *   effectiveKsr?: number,
 *   seasonCheckpoints?: import('./seasonPlan.js').SeasonCheckpoint[],
 *   seasonBlocks?: import('./seasonPlan.js').SeasonBlock[],
 *   calendarItems?: import('./plannedCompetitions.js').PlannedCompetition[],
 *   year?: number,
 *   ageInt?: number | null,
 *   focusCompetitionId?: string | null,
 *   selectedISO?: string,
 * }} ctx
 */
export function buildCartelCoachDirective(ctx) {
  const confirmed = normalizeCartelStage(ctx.student?.cartelStage ?? ctx.confirmedStage)
  const metrics = buildCartelMetrics(ctx)
  const eligible = computeEligibleCartelStage(confirmed, metrics)
  const working = confirmed
  const earlyAccess = Boolean(ctx.student?.cartelEarlyAccess)
  const stageNote = typeof ctx.student?.cartelStageNote === 'string' ? ctx.student.cartelStageNote : ''

  const seasonView = buildSeasonCoachView({
    year: ctx.year ?? new Date().getFullYear(),
    ageInt: ctx.ageInt,
    plannedCompetitions: ctx.calendarItems ?? [],
    focusCompetitionId: ctx.focusCompetitionId,
    selectedISO: ctx.selectedISO,
    seasonGoal: working === 'competition' ? 'advance' : 'foundation',
    nextSeasonGoal: working === 'competition' ? 'advance' : 'foundation',
    ladderClosed: false,
    seasonBlocks: ctx.seasonBlocks,
  })

  const stageDefaults = defaultTrainingForStage(working)
  const trainingToday =
    working === 'competition' && trainingFromSeasonView(seasonView)
      ? trainingFromSeasonView(seasonView)
      : stageDefaults.training

  const meta = cartelStageMeta(working)
  const checklist = checklistForCartelStage(working, metrics)

  /** @type {CartelAction | null} */
  let primaryAction = null
  /** @type {CartelAction | null} */
  let secondaryAction = null

  let lead = stageDefaults.focus
  let calendarLocked = working !== 'competition'
  let calendarLockReason = calendarLocked
    ? 'Календарь стартов откроет тренер на этапе «Соревнования» (кнопки доступа внизу).'
    : null

  switch (working) {
    case 'base':
      primaryAction = { type: 'open_technical', label: 'Открыть технику' }
      secondaryAction = { type: 'open_physical', label: 'Сдать норматив' }
      break
    case 'functional':
      primaryAction = { type: 'open_physical', label: 'Нормативы (мин., золото — цель)' }
      secondaryAction = { type: 'open_motor', label: 'Зачёты по качествам' }
      if (!metrics.specialPassDone) {
        secondaryAction = { type: 'toggle_special_pass', label: 'Отметить спецзачёт' }
      }
      break
    case 'combat':
      primaryAction = { type: 'add_sparring', label: '+ Спарринг' }
      secondaryAction = { type: 'add_match', label: '+ Матчевая встреча' }
      break
    case 'documents':
      lead = 'Отметьте документы ниже — с датами для МРТ и УМО.'
      primaryAction = { type: 'open_physical', label: 'К списку ученика' }
      break
    case 'competition':
      calendarLocked = false
      calendarLockReason = null
      lead = 'Выберите старты и расставьте подготовку по плану.'
      if (!metrics.hasCoachStart) {
        primaryAction = { type: 'add_event', label: 'Добавить ближайший старт' }
      } else if (!metrics.hasPlanBlocks && seasonView.canApplyCalendar) {
        primaryAction = { type: 'apply_plan', label: 'Расставить подготовку к старту' }
      } else {
        primaryAction = { type: 'open_technical', label: 'Тренировка по плану' }
      }
      break
    default:
      break
  }

  const checkToday = seasonView.todayCoachResolved?.brief?.check ?? null

  return {
    cartelRule: CARTEL_RULE_TEXT,
    confirmedStage: working,
    eligibleStage: eligible,
    stageTitle: meta.title,
    stageSubtitle: meta.subtitle,
    headline: 'Что делать дальше',
    lead,
    trainingToday,
    checkToday: working === 'competition' ? checkToday : null,
    checklist,
    cartelMetrics: metrics,
    primaryAction,
    secondaryAction,
    coachMetricsHint:
      compareCartelStage(eligible, working) > 0
        ? `По цифрам карточки ориентир — этап «${cartelStageMeta(eligible).title}». Открывает только тренер.`
        : null,
    earlyAccess,
    stageNote,
    calendarLocked,
    calendarLockReason,
    seasonView,
  }
}
