import { SENSITIVE_PERIOD_CATALOG } from '../data/sensitivePeriodCatalog.js'

const MS_DAY = 86400000

/** @typedef {'active' | 'missed' | 'future'} SensitivePeriodStatus */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   status: SensitivePeriodStatus,
 *   startDate: Date,
 *   endDate: Date,
 *   sortKey: number,
 *   progressPercent: number,
 *   counterLabel: string,
 *   windowLabel: string,
 * }} SensitivePeriodTimerItem
 */

/**
 * @typedef {{
 *   ready: boolean,
 *   reason?: 'no_birth_date',
 *   birthDate?: Date,
 *   now?: Date,
 *   ageLabel?: string,
 *   items?: SensitivePeriodTimerItem[],
 *   activeCount?: number,
 * }} SensitivePeriodTimerResult
 */

/** @param {AgePoint} point */
export function agePointToMonths(point) {
  return point.years * 12 + point.months
}

/**
 * @param {{ birthDate?: Date | string | null, birthYear?: number | string | null }} input
 * @returns {Date | null}
 */
export function resolveAthleteBirthDate({ birthDate, birthYear }) {
  if (birthDate) {
    const d = birthDate instanceof Date ? birthDate : new Date(birthDate)
    if (!Number.isNaN(d.getTime())) return d
  }
  const y = Number(birthYear)
  if (Number.isFinite(y) && y >= 1900 && y <= 2100) {
    /** Середина года, если известен только год рождения */
    return new Date(y, 6, 1, 0, 0, 0, 0)
  }
  return null
}

/** @param {Date} birth @param {AgePoint} point */
export function dateAtAge(birth, point) {
  const d = new Date(birth.getTime())
  d.setHours(0, 0, 0, 0)
  d.setFullYear(d.getFullYear() + point.years)
  d.setMonth(d.getMonth() + point.months, 1)
  return d
}

/** Последний день месяца конца окна (включительно). */
export function windowEndDate(birth, end) {
  const d = new Date(birth.getTime())
  d.setFullYear(d.getFullYear() + end.years)
  d.setMonth(d.getMonth() + end.months + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

/** @param {Date} a @param {Date} b */
export function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY)
}

/**
 * @param {number} days
 * @returns {string}
 */
export function formatDurationRu(days) {
  const abs = Math.abs(days)
  if (abs === 0) return 'сегодня'
  if (abs < 45) {
    const n = abs
    const mod10 = n % 10
    const mod100 = n % 100
    let word = 'дней'
    if (mod10 === 1 && mod100 !== 11) word = 'день'
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'дня'
    return `${n} ${word}`
  }
  if (abs < 365) {
    const months = Math.max(1, Math.round(abs / 30.44))
    return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`
  }
  const years = Math.floor(abs / 365.25)
  const months = Math.max(0, Math.round((abs - years * 365.25) / 30.44))
  if (months === 0) {
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`
  }
  return `${years} ${years === 1 ? 'год' : 'года'} ${months} мес.`
}

/** @param {Date} birth @param {Date} now */
export function formatAthleteAgeLabel(birth, now) {
  const totalDays = Math.max(0, daysBetween(birth, now))
  const years = Math.floor(totalDays / 365.25)
  const afterYears = new Date(birth.getTime())
  afterYears.setFullYear(afterYears.getFullYear() + years)
  const months = Math.max(0, Math.floor(daysBetween(afterYears, now) / 30.44))
  const afterMonths = new Date(afterYears.getTime())
  afterMonths.setMonth(afterMonths.getMonth() + months)
  const days = Math.max(0, daysBetween(afterMonths, now))
  const parts = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`)
  if (months > 0) parts.push(`${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`)
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`)
  return parts.join(' ')
}

function formatWindowLabel(start, end) {
  const fmt = (p) => `${p.years} г. ${p.months > 0 ? `${p.months} мес.` : ''}`.trim()
  return `${fmt(start)} — ${fmt(end)}`
}

/**
 * @param {Date} now
 * @param {Date} start
 * @param {Date} end
 * @returns {SensitivePeriodStatus}
 */
export function classifyPeriod(now, start, end) {
  if (now < start) return 'future'
  if (now > end) return 'missed'
  return 'active'
}

/**
 * @param {SensitivePeriodStatus} status
 * @param {Date} now
 * @param {Date} start
 * @param {Date} end
 */
function buildCounterLabel(status, now, start, end) {
  if (status === 'active') {
    const left = daysBetween(now, end)
    return `Осталось: ${formatDurationRu(left)} до закрытия окна`
  }
  if (status === 'future') {
    const until = daysBetween(now, start)
    return `Начнётся через: ${formatDurationRu(until)}`
  }
  const ago = daysBetween(end, now)
  return `Окно закрыто ${formatDurationRu(ago)} назад`
}

/**
 * @param {{
 *   birthDate?: Date | string | null,
 *   birthYear?: number | string | null,
 *   now?: Date,
 *   catalog?: import('../data/sensitivePeriodCatalog.js').SensitivePeriodDefinition[],
 * }} options
 * @returns {SensitivePeriodTimerResult}
 */
export function buildSensitivePeriodTimer({
  birthDate,
  birthYear,
  now = new Date(),
  catalog = SENSITIVE_PERIOD_CATALOG,
}) {
  const birth = resolveAthleteBirthDate({ birthDate, birthYear })
  if (!birth) {
    return { ready: false, reason: 'no_birth_date' }
  }

  const items = catalog.map((def) => {
    const startDate = dateAtAge(birth, def.start)
    const endDate = windowEndDate(birth, def.end)
    const status = classifyPeriod(now, startDate, endDate)
    const spanDays = Math.max(1, daysBetween(startDate, endDate))
    const elapsedDays = daysBetween(startDate, now)
    const progressPercent =
      status === 'active' ? Math.min(100, Math.max(0, Math.round((elapsedDays / spanDays) * 100))) : 0

    return {
      id: def.id,
      title: def.title,
      status,
      startDate,
      endDate,
      sortKey: agePointToMonths(def.start),
      progressPercent,
      counterLabel: buildCounterLabel(status, now, startDate, endDate),
      windowLabel: formatWindowLabel(def.start, def.end),
    }
  })

  items.sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title, 'ru'))

  return {
    ready: true,
    birthDate: birth,
    now,
    ageLabel: formatAthleteAgeLabel(birth, now),
    items,
    activeCount: items.filter((i) => i.status === 'active').length,
  }
}
