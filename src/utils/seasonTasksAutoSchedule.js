import { resolveAnnualMacroPeriodForDate } from '../data/annualPrepCycle.js'
import { localDateISO } from './prepCalendarGrid.js'
import { newSeasonTaskId, normalizeSeasonTasks } from './seasonTasks.js'

/** @typedef {import('./seasonTasks.js').SeasonTask} SeasonTask */
/** @typedef {import('./seasonTasks.js').SeasonTaskCategory} SeasonTaskCategory */

/** Дни недели (0 = пн … 6 = вс) для N занятий. */
const WEEKDAY_PATTERNS = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
}

const TRANSITION_PERIOD_IDS = new Set(['transition-aug', 'transition-feb'])

export const SESSIONS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6]

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeSessionsPerWeek(raw) {
  const n = Math.round(Number(raw))
  if (SESSIONS_PER_WEEK_OPTIONS.includes(n)) return n
  return 3
}

/**
 * @param {Date} date
 * @returns {number} 0 = пн … 6 = вс
 */
function mondayWeekdayIndex(date) {
  return (date.getDay() + 6) % 7
}

/**
 * @param {number} sessionsPerWeek
 * @param {string} periodId
 * @returns {number[]}
 */
export function weekdayPatternForSchedule(sessionsPerWeek, periodId) {
  const base = WEEKDAY_PATTERNS[normalizeSessionsPerWeek(sessionsPerWeek)] ?? WEEKDAY_PATTERNS[3]
  if (!TRANSITION_PERIOD_IDS.has(periodId)) return base
  return base.slice(0, Math.min(2, base.length))
}

/**
 * @param {SeasonTaskCategory} category
 * @param {import('../data/annualPrepCycle.js').AnnualMacroPeriod | undefined} period
 */
function pickSessionTitle(category, period) {
  const rows = period?.tasks ?? []
  if (category === 'technical') {
    const row =
      rows.find((t) => /техник|сттм|связк|тактик|снаряд/i.test(t.task)) ?? rows[1] ?? rows[0]
    if (!row) return 'Техника · СТТМ, снаряды'
    return row.via ? `${row.task} · ${row.via}` : row.task
  }
  const row =
    rows.find((t) => /офп|физик|кросс|норматив|восстанов|медосмотр|объём|поддерж/i.test(t.task)) ??
    rows[0]
  if (!row) return 'Физика · ОФП, школа'
  return row.via ? `${row.task} · ${row.via}` : row.task
}

/**
 * @param {number} year
 * @param {string} [fromISO]
 */
export function defaultScheduleStartISO(year, fromISO) {
  const today = localDateISO(new Date())
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const currentYear = Number(today.slice(0, 4))

  if (year < currentYear) return yearEnd
  if (year > currentYear) return yearStart

  const candidate = fromISO && fromISO >= yearStart ? fromISO : today
  if (candidate < yearStart) return yearStart
  if (candidate > yearEnd) return yearEnd
  return candidate
}

/**
 * @param {{
 *   year: number,
 *   sessionsPerWeek: number,
 *   fromISO?: string,
 *   existingTasks?: SeasonTask[],
 *   mode?: 'replace' | 'merge',
 * }} options
 * @returns {SeasonTask[]}
 */
export function generateSeasonTasksSchedule(options) {
  const { year, sessionsPerWeek, existingTasks = [], mode = 'replace' } = options
  const today = localDateISO(new Date())
  if (year < Number(today.slice(0, 4))) return normalizeSeasonTasks(existingTasks)

  const sessions = normalizeSessionsPerWeek(sessionsPerWeek)
  const startISO = defaultScheduleStartISO(year, options.fromISO)
  const endISO = `${year}-12-31`
  if (startISO > endISO) {
    return mode === 'replace'
      ? normalizeSeasonTasks(existingTasks.filter((t) => t.dateISO < startISO || t.dateISO > endISO))
      : normalizeSeasonTasks(existingTasks)
  }

  const existingOnDay = new Set(
    existingTasks.flatMap((t) => {
      if (t.dateISO < startISO || t.dateISO > endISO) return []
      return [t.dateISO]
    }),
  )

  const generated = []
  let sessionIndex = 0
  const cursor = new Date(startISO + 'T12:00:00')
  const end = new Date(endISO + 'T12:00:00')

  while (cursor <= end) {
    const iso = localDateISO(cursor)
    const period = resolveAnnualMacroPeriodForDate(iso)
    const pattern = weekdayPatternForSchedule(sessions, period?.id ?? '')
    const weekday = mondayWeekdayIndex(cursor)

    if (pattern.includes(weekday)) {
      const category = /** @type {SeasonTaskCategory} */ (sessionIndex % 2 === 0 ? 'technical' : 'physical')
      sessionIndex += 1
      const skipForMerge = mode === 'merge' && existingOnDay.has(iso)
      if (!skipForMerge) {
        generated.push({
          id: newSeasonTaskId('auto'),
          title: pickSessionTitle(category, period),
          category,
          dateISO: iso,
          dateEndISO: iso,
          progress: 0,
        })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (mode === 'merge') {
    const outsideOrKept = existingTasks.filter((t) => {
      if (t.dateISO < startISO || t.dateISO > endISO) return true
      return existingOnDay.has(t.dateISO)
    })
    return normalizeSeasonTasks([...outsideOrKept, ...generated])
  }

  const before = existingTasks.filter((t) => t.dateISO < startISO)
  const after = existingTasks.filter((t) => t.dateISO > endISO)
  return normalizeSeasonTasks([...before, ...generated, ...after])
}

/**
 * @param {number} year
 * @param {number} sessionsPerWeek
 * @param {string} [fromISO]
 */
export function estimateGeneratedTaskCount(year, sessionsPerWeek, fromISO) {
  const startISO = defaultScheduleStartISO(year, fromISO)
  const endISO = `${year}-12-31`
  if (startISO > endISO) return 0
  const tasks = generateSeasonTasksSchedule({
    year,
    sessionsPerWeek,
    fromISO,
    existingTasks: [],
    mode: 'replace',
  })
  return tasks.filter((t) => t.dateISO >= startISO && t.dateISO <= endISO).length
}
