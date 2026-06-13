import { localDateISO } from './prepCalendarGrid.js'

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

const MONTH_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

/**
 * @typedef {{
 *   dateISO: string,
 *   dayNum: number,
 *   weekdayShort: string,
 * }} TrainingWeekDay
 */

/**
 * @typedef {{
 *   weekStartISO: string,
 *   weekEndISO: string,
 *   days: TrainingWeekDay[],
 * }} TrainingWeek
 */

/**
 * @typedef {{
 *   weekStartISO: string,
 *   weekEndISO: string,
 *   trainingDays: string[],
 *   submittedAt: string | null,
 *   coachId: string | null,
 *   bridgeMessageId?: string | null,
 * }} StudentTrainingWeekPlan
 */

/**
 * @param {string} weekStartISO
 * @returns {TrainingWeek}
 */
export function buildWeekFromStartISO(weekStartISO) {
  const start = new Date(`${weekStartISO}T12:00:00`)
  /** @type {TrainingWeekDay[]} */
  const days = []
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateISO = localDateISO(d)
    days.push({
      dateISO,
      dayNum: d.getDate(),
      weekdayShort: WEEKDAY_SHORT[d.getDay()],
    })
  }
  return {
    weekStartISO: days[0].dateISO,
    weekEndISO: days[6].dateISO,
    days,
  }
}

/**
 * Следующая календарная неделя (пн–вс), не текущая.
 * @param {Date} [from]
 * @returns {TrainingWeek}
 */
export function nextCalendarWeek(from = new Date()) {
  const anchor = new Date(from)
  anchor.setHours(12, 0, 0, 0)
  const dow = anchor.getDay()
  const isoWeekday = dow === 0 ? 7 : dow
  const daysToNextMonday = 8 - isoWeekday
  const weekStart = new Date(anchor)
  weekStart.setDate(weekStart.getDate() + daysToNextMonday)
  return buildWeekFromStartISO(localDateISO(weekStart))
}

/**
 * @param {string} weekStartISO
 * @param {string} weekEndISO
 */
export function formatWeekRangeLabel(weekStartISO, weekEndISO) {
  const start = new Date(`${weekStartISO}T12:00:00`)
  const end = new Date(`${weekEndISO}T12:00:00`)
  const sm = start.getMonth()
  const em = end.getMonth()
  if (sm === em) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_GENITIVE[sm]}`
  }
  return `${start.getDate()} ${MONTH_GENITIVE[sm]} – ${end.getDate()} ${MONTH_GENITIVE[em]}`
}

/**
 * @param {unknown} raw
 * @returns {StudentTrainingWeekPlan | null}
 */
export function normalizeStudentTrainingWeekPlan(raw) {
  if (!raw || typeof raw !== 'object') return null
  const weekStartISO = typeof raw.weekStartISO === 'string' ? raw.weekStartISO.trim() : null
  const weekEndISO = typeof raw.weekEndISO === 'string' ? raw.weekEndISO.trim() : null
  const trainingDays = Array.isArray(raw.trainingDays)
    ? raw.trainingDays
        .filter((d) => typeof d === 'string')
        .map((d) => d.trim())
        .filter(Boolean)
    : []
  if (!weekStartISO || trainingDays.length === 0) return null
  return {
    weekStartISO,
    weekEndISO: weekEndISO || weekStartISO,
    trainingDays: [...new Set(trainingDays)].sort(),
    submittedAt: typeof raw.submittedAt === 'string' ? raw.submittedAt : null,
    coachId: typeof raw.coachId === 'string' ? raw.coachId : null,
    bridgeMessageId: typeof raw.bridgeMessageId === 'string' ? raw.bridgeMessageId : null,
  }
}

/**
 * @param {TrainingWeek} week
 * @param {string[]} trainingDays
 */
export function validateTrainingDaySelection(week, trainingDays) {
  const unique = [...new Set(trainingDays)]
  const allowed = new Set(week.days.map((d) => d.dateISO))
  if (unique.some((iso) => !allowed.has(iso))) {
    return { ok: false, error: 'Выберите дни только из предложенной недели.' }
  }
  const count = unique.length
  if (count < 1) return { ok: false, error: 'Выберите хотя бы один тренировочный день.' }
  if (count > 6) return { ok: false, error: 'Максимум 6 тренировок — нужен хотя бы один день отдыха.' }
  return { ok: true, trainingDays: unique.sort() }
}

/**
 * @param {TrainingWeek} week
 * @param {string[]} trainingDays
 */
export function formatTrainingWeekReply(week, trainingDays) {
  const set = new Set(trainingDays)
  const picked = week.days.filter((d) => set.has(d.dateISO))
  const labels = picked.map((d) => `${d.weekdayShort} ${d.dayNum}`)
  const range = formatWeekRangeLabel(week.weekStartISO, week.weekEndISO)
  return `График ${range}: ${labels.join(', ')} (${picked.length} трен.)`
}

/**
 * @param {{ scheduleWeek?: { weekStartISO?: string, weekEndISO?: string } | null } | null | undefined} message
 * @param {Date} [from]
 * @returns {TrainingWeek}
 */
export function resolveScheduleWeekForMessage(message, from = new Date()) {
  const start = message?.scheduleWeek?.weekStartISO
  if (typeof start === 'string' && start.trim()) {
    return buildWeekFromStartISO(start.trim())
  }
  return nextCalendarWeek(from)
}

/**
 * @param {Array<{ dateISO: string }>} monthDays
 * @param {unknown} planRaw
 */
export function applyTrainingWeekToMonthDays(monthDays, planRaw) {
  const plan = normalizeStudentTrainingWeekPlan(planRaw)
  if (!plan) return monthDays
  const set = new Set(plan.trainingDays)
  return monthDays.map((d) => ({
    ...d,
    isStudentTrainingDay: set.has(d.dateISO),
  }))
}

/**
 * @param {StudentTrainingWeekPlan} plan
 */
export function formatStudentTrainingPlanSummary(plan) {
  const week = buildWeekFromStartISO(plan.weekStartISO)
  return formatTrainingWeekReply(week, plan.trainingDays)
}
