import { buildFederationOrientirCompetitions } from '../data/federationCalendar2026.js'
import { competitionDateToInputString } from './competitionDate.js'
import {
  competitionDateRange,
  formatCompetitionRange,
  getCompetitionMeta,
  guessCompetitionFromTitle,
  normalizeCompetitionRange,
  normalizeCompetitionTrackStage,
} from '../data/competitionLevels.js'

/**
 * @typedef {import('../data/competitionLevels.js').CompetitionTrackId} CompetitionTrackId
 * @typedef {import('../data/competitionLevels.js').CompetitionStageId} CompetitionStageId
 * @typedef {{
 *   id: string,
 *   dateISO: string,
 *   dateEndISO: string,
 *   title: string,
 *   track: CompetitionTrackId,
 *   stage: CompetitionStageId | null,
 *   newLadderCycle?: boolean,
 *   dateStatus?: CompetitionDateStatus,
 * }} PlannedCompetition
 */

/** @typedef {'confirmed' | 'orientir'} CompetitionDateStatus */

/** @param {unknown} raw */
export function normalizeDateStatus(raw) {
  return raw === 'orientir' ? 'orientir' : 'confirmed'
}

/** @param {PlannedCompetition | null | undefined} c */
export function isConfirmedStart(c) {
  if (!c) return false
  return normalizeDateStatus(c.dateStatus) === 'confirmed'
}

/** @param {PlannedCompetition | null | undefined} c */
export function isOrientirStart(c) {
  if (!c) return false
  return normalizeDateStatus(c.dateStatus) === 'orientir'
}

export { formatCompetitionRange, competitionDateRange, getCompetitionMeta }

/** @param {PlannedCompetition} c */
export function formatStartWithStatus(c) {
  const range = formatCompetitionRange(c)
  return isOrientirStart(c) ? `${range} · ориентир` : range
}

/** @param {{ dateISO: string, dateEndISO?: string, track?: string, stage?: string | null }} c */
export function competitionIdentityKey(c) {
  const end = c.dateEndISO || c.dateISO
  return `${c.dateISO}|${end}|${c.track ?? ''}|${c.stage ?? ''}`
}

/** @param {PlannedCompetition[]} list */
export function dedupePlannedCompetitions(list) {
  const seen = new Set()
  const out = []
  for (const c of list) {
    const key = competitionIdentityKey(c)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  out.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  return out
}

/**
 * Старты, сохранённые тренером в карточке (без подстановки календаря 2026).
 * @param {object | null | undefined} student
 * @returns {PlannedCompetition[]}
 */
export function normalizeSavedPlannedCompetitions(student) {
  const list = []

  if (Array.isArray(student?.plannedCompetitions)) {
    for (const raw of student.plannedCompetitions) {
      if (!raw || typeof raw !== 'object') continue
      const dateISO = competitionDateToInputString(raw.dateISO ?? raw.date)
      if (!dateISO) continue
      const dateEndISO =
        competitionDateToInputString(raw.dateEndISO ?? raw.dateEnd) || dateISO
      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `pc-${dateISO}`
      const title = typeof raw.title === 'string' ? raw.title.trim() : ''

      let track = raw.track
      let stage = raw.stage ?? null
      if (!track) {
        const guessed = guessCompetitionFromTitle(title, raw.level)
        track = guessed.track
        stage = guessed.stage
      } else {
        const norm = normalizeCompetitionTrackStage({ track, stage, level: raw.level })
        track = norm.track
        stage = norm.stage === 'city' ? 'pmo' : norm.stage
      }

      const range = normalizeCompetitionRange(dateISO, dateEndISO)
      list.push({
        id,
        dateISO: range.dateISO,
        dateEndISO: range.dateEndISO,
        title,
        track,
        stage,
        newLadderCycle: Boolean(raw.newLadderCycle),
        dateStatus: normalizeDateStatus(raw.dateStatus),
      })
    }
  }

  const deduped = dedupePlannedCompetitions(list)
  if (deduped.length > 0) return deduped

  const legacy = competitionDateToInputString(student?.competitionDate)
  if (!legacy) return []

  const title = typeof student?.competitionTitle === 'string' ? student.competitionTitle.trim() : ''
  const guessed = guessCompetitionFromTitle(title)
  return [
    {
      id: `legacy-${legacy}`,
      dateISO: legacy,
      dateEndISO: legacy,
      title,
      track: guessed.track,
      stage: guessed.stage,
      newLadderCycle: false,
      dateStatus: 'confirmed',
    },
  ]
}

/** Тренер явно сохранил свой список стартов (иначе — типовой календарь 2026). */
export function usesCustomSeasonCalendar(student) {
  return student?.seasonCalendarCustomized === true
}

/** @param {object | null | undefined} student */
export function coachHasSavedPlannedList(student) {
  return usesCustomSeasonCalendar(student)
}

/**
 * Типовой календарь 2026 по возрасту и полу (ПМО/ЧМО → край → зона → Россия).
 * @param {number | null | undefined} ageInt
 * @param {'M' | 'F' | string | null | undefined} gender
 */
export function resolveTypicalSeasonCalendar(ageInt, gender) {
  return dedupePlannedCompetitions(buildFederationOrientirCompetitions(ageInt, gender))
}

/**
 * Для UI: у всех — типовой календарь, пока тренер не нажал «Сохранить» со своим списком.
 * @param {object | null | undefined} student
 * @param {number | null | undefined} ageInt
 * @param {'M' | 'F' | string | null | undefined} gender
 */
export function resolvePlannedCompetitionsForDisplay(student, ageInt, gender) {
  const template = resolveTypicalSeasonCalendar(ageInt, gender)
  if (!usesCustomSeasonCalendar(student)) return template

  const saved = normalizeSavedPlannedCompetitions(student)
  return saved.length > 0 ? saved : template
}

/** @param {object | null | undefined} student */
export function isShowingFederationOrientirDefaults(student) {
  return !usesCustomSeasonCalendar(student)
}

/**
 * @param {object | null | undefined} student
 * @returns {PlannedCompetition[]}
 * @deprecated Используйте resolvePlannedCompetitionsForDisplay(student, ageInt, gender)
 */
export function normalizePlannedCompetitions(student) {
  return normalizeSavedPlannedCompetitions(student)
}

/**
 * Якорь для плана: подтверждённый приоритетнее ориентира.
 * @param {PlannedCompetition[]} planned
 */
export function pickNextSeasonAnchor(planned) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const scored = []

  for (const c of planned) {
    if (!competitionStillRelevant(c)) continue
    const start = new Date(c.dateISO + 'T12:00:00')
    start.setHours(0, 0, 0, 0)
    if (start.getTime() < today.getTime()) continue

    let score = start.getTime()
    if (isConfirmedStart(c)) score -= 2e16
    if (c.newLadderCycle) score -= 1e15
    if (c.track === 'federation' && (c.stage === 'pmo' || c.stage === 'chmo' || c.stage === 'city'))
      score -= 5e14
    else if (c.track === 'federation') score -= 1e14
    if (isOrientirStart(c)) score += 1e12

    scored.push({ c, score })
  }

  scored.sort((a, b) => a.score - b.score)
  return scored[0]?.c ?? null
}

/**
 * @param {PlannedCompetition | null} focus
 * @param {PlannedCompetition[]} planned
 */
export function resolvePlanningAnchor(focus, planned) {
  if (focus && competitionStillRelevant(focus)) {
    return {
      anchor: focus,
      certainty: normalizeDateStatus(focus.dateStatus),
    }
  }
  const anchor = pickNextSeasonAnchor(planned)
  if (!anchor) return { anchor: null, certainty: /** @type {CompetitionDateStatus | 'none'} */ ('none') }
  return { anchor, certainty: normalizeDateStatus(anchor.dateStatus) }
}

/** @param {PlannedCompetition} c */
export function competitionStillRelevant(c) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date((c.dateEndISO || c.dateISO) + 'T12:00:00')
  end.setHours(0, 0, 0, 0)
  return end.getTime() >= today.getTime()
}

/** @param {PlannedCompetition[]} list — @deprecated duplicate, use pickNextSeasonAnchor for ladder */
export function pickNearestFutureCompetition(list) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let best = null
  let bestStart = Infinity
  for (const c of list) {
    if (!competitionStillRelevant(c)) continue
    const start = new Date(c.dateISO + 'T12:00:00')
    start.setHours(0, 0, 0, 0)
    const diff = start.getTime() - today.getTime()
    if (diff >= 0 && diff < bestStart) {
      bestStart = diff
      best = c
    } else if (diff < 0) {
      const end = new Date((c.dateEndISO || c.dateISO) + 'T12:00:00')
      end.setHours(0, 0, 0, 0)
      if (end.getTime() >= today.getTime() && (!best || bestStart > 0)) {
        best = c
        bestStart = diff
      }
    }
  }
  return best ?? list[list.length - 1] ?? null
}

/** @param {PlannedCompetition[]} list @param {string | null} focusId */
export function resolveFocusCompetition(list, focusId) {
  if (!list.length) return null
  if (focusId) {
    const found = list.find((c) => c.id === focusId)
    if (found) return found
  }
  return pickNearestFutureCompetition(list) ?? list[list.length - 1]
}

/** @param {string} dateISO */
export function newPlannedCompetitionId(dateISO) {
  return `pc-${dateISO}-${Date.now().toString(36)}`
}

/** @param {PlannedCompetition} c */
export function competitionUsesMicroPrep(c) {
  return getCompetitionMeta(c).microPrep
}

/** @param {PlannedCompetition[]} list */
export function plannedCompetitionsToPayload(list) {
  return dedupePlannedCompetitions(list).map((c) => ({
    id: c.id,
    dateISO: c.dateISO,
    dateEndISO: c.dateEndISO || c.dateISO,
    title: c.title.trim() || null,
    track: c.track,
    stage: c.stage,
    level: c.stage ?? c.track,
    newLadderCycle: Boolean(c.newLadderCycle),
    dateStatus: normalizeDateStatus(c.dateStatus),
  }))
}
