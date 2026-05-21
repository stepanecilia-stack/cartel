import { competitionDateToInputString } from './competitionDate.js'

/**
 * @typedef {{ id: string, dateISO: string, title: string }} PlannedCompetition
 */

/**
 * @param {object | null | undefined} student
 * @returns {PlannedCompetition[]}
 */
export function normalizePlannedCompetitions(student) {
  const list = []
  const seen = new Set()

  if (Array.isArray(student?.plannedCompetitions)) {
    for (const raw of student.plannedCompetitions) {
      if (!raw || typeof raw !== 'object') continue
      const dateISO = competitionDateToInputString(raw.dateISO ?? raw.date)
      if (!dateISO || seen.has(dateISO)) continue
      seen.add(dateISO)
      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `pc-${dateISO}`
      list.push({
        id,
        dateISO,
        title: typeof raw.title === 'string' ? raw.title.trim() : '',
      })
    }
  }

  const legacy = competitionDateToInputString(student?.competitionDate)
  if (legacy && !seen.has(legacy)) {
    list.push({
      id: `legacy-${legacy}`,
      dateISO: legacy,
      title: typeof student?.competitionTitle === 'string' ? student.competitionTitle.trim() : '',
    })
  }

  list.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  return list
}

/**
 * @param {PlannedCompetition[]} list
 * @returns {PlannedCompetition | null}
 */
export function pickNearestFutureCompetition(list) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let best = null
  let bestDiff = Infinity
  for (const c of list) {
    const d = new Date(c.dateISO + 'T12:00:00')
    d.setHours(0, 0, 0, 0)
    const diff = d.getTime() - today.getTime()
    if (diff >= 0 && diff < bestDiff) {
      bestDiff = diff
      best = c
    }
  }
  return best
}

/**
 * @param {PlannedCompetition[]} list
 * @param {string | null} focusId
 */
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
