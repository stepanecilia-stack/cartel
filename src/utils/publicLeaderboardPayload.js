import { groupMotorQualityWorkLogForDisplay } from './motorQualityWorkLog.js'
import {
  LEADERBOARD_CATEGORIES,
  buildLeaderboardRows,
} from './leaderboardMetrics.js'
import { displayNameFromStudent } from './studentModel.js'

export function isValidLeaderboardShareToken(t) {
  if (typeof t !== 'string' || t.length < 32 || t.length > 80) return false
  return /^[a-f0-9]+$/i.test(t)
}

/**
 * @param {unknown} workLog
 * @returns {{ sensitive: boolean }[]}
 */
export function serializeMotorSquaresForShare(workLog) {
  const groups = groupMotorQualityWorkLogForDisplay(workLog)
  return groups.flatMap((g) =>
    g.entries.map((e) => ({ sensitive: Boolean(e.inSensitivePeriod) })),
  )
}

/**
 * @param {object} row
 * @param {Record<string, unknown> | undefined} raw
 * @param {string} categoryId
 */
function rowToPublicRow(row, raw, categoryId) {
  const out = {
    rank: row.rank,
    displayName: row.name,
    primaryLabel: row.primaryLabel,
    primarySuffix: row.primarySuffix,
    secondary: row.secondary ?? null,
  }
  if (categoryId === 'physical' || categoryId === 'functional') {
    if (row.medals) {
      out.medals = {
        gold: row.medals.gold,
        silver: row.medals.silver,
        bronze: row.medals.bronze,
        red: row.medals.red,
      }
    }
  }
  if (categoryId === 'technical' && row.tech) {
    out.tech = {
      kdPercent: row.tech.kdPercent,
      automatedCount: row.tech.automatedCount,
      effectiveKSR: row.tech.effectiveKSR,
      studiedCount: row.tech.studiedCount,
      totalAtoms: row.tech.totalAtoms,
    }
  }
  if (categoryId === 'motor' && raw) {
    out.motorSquares = serializeMotorSquaresForShare(raw.motorQualityWorkLog)
  }
  return out
}

/**
 * @param {{
 *   coachDisplayName: string,
 *   students: Array<Record<string, unknown>>,
 *   allNorms: object[],
 *   technicalAtoms: object[],
 *   defaultCategoryId?: string,
 * }} args
 */
export function buildPublicLeaderboardPayload({
  coachDisplayName,
  students,
  allNorms,
  technicalAtoms,
  defaultCategoryId = 'motor',
}) {
  const rawById = new Map(students.map((s) => [s.id, s]))
  const categories = {}

  for (const cat of LEADERBOARD_CATEGORIES) {
    const rows = buildLeaderboardRows(students, allNorms, technicalAtoms, cat.id, displayNameFromStudent)
    categories[cat.id] = {
      label: cat.label,
      shortLabel: cat.shortLabel,
      hint: cat.hint,
      rows: rows.map((row) => rowToPublicRow(row, rawById.get(row.id), cat.id)),
    }
  }

  return {
    v: 1,
    coachDisplayName: coachDisplayName || 'Тренер',
    defaultCategoryId,
    categories,
  }
}
