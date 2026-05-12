import { getMotorQualityExercisesBySlug } from '../data/motorQualityExercises.js'
import { getMotorQualitySlug } from '../data/motorQualitiesCatalog.js'

function fisherYatesShuffle(array, random) {
  const rng = typeof random === 'function' ? random : Math.random
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Сколько упражнений показывать на одно качество в блоке развития (объём под возраст). */
export function developmentExerciseSlotCountForAge(ageInt) {
  if (ageInt == null || !Number.isFinite(ageInt)) return 2
  if (ageInt <= 9) return 2
  if (ageInt <= 13) return 2
  return 3
}

function filterExercisesByOptionalAgeBounds(exercises, ageInt) {
  return exercises.filter((ex) => {
    const min = ex.minAge
    const max = ex.maxAge
    if (ageInt == null || !Number.isFinite(ageInt)) return true
    if (min != null && Number.isFinite(min) && ageInt < min) return false
    if (max != null && Number.isFinite(max) && ageInt > max) return false
    return true
  })
}

/**
 * Случайная подвыборка упражнений каталога качества с учётом возраста (лимит + опциональные minAge/maxAge в данных).
 * @param {string} slug
 * @param {number | null} ageInt
 * @param {() => number} [rng]
 */
export function pickMotorQualityExercisesForAge(slug, ageInt, rng = Math.random) {
  const all = getMotorQualityExercisesBySlug(slug)
  const filtered = filterExercisesByOptionalAgeBounds(all, ageInt)
  const max = developmentExerciseSlotCountForAge(ageInt)
  const shuffled = fisherYatesShuffle(filtered, rng)
  return shuffled.slice(0, Math.min(max, shuffled.length))
}

/**
 * @param {object} row — строка sessionFormula из buildCoachRecommendations
 * @returns {string[]} подписи качеств из каталога
 */
export function extractDevelopmentQualityTitlesFromSessionRow(row) {
  if (!row || row.kind !== 'plain') return []
  if (Array.isArray(row.linkableQuotedQualities) && row.linkableQuotedQualities.length > 0) {
    return row.linkableQuotedQualities.map((t) => String(t).trim()).filter(Boolean)
  }
  if (row.key === 'greenFallback' && Array.isArray(row.hintLinkTitles) && row.hintLinkTitles.length > 0) {
    return row.hintLinkTitles.map((t) => String(t).trim()).filter(Boolean)
  }
  return []
}

export function isSessionRowDevelopmentBlock(row) {
  return extractDevelopmentQualityTitlesFromSessionRow(row).length > 0
}

/**
 * По строкам предложенной тренировки собирает упражнения для этапов «Упражнения на развитие …».
 * @param {object[]} sessionFormulaRows
 * @param {number | null} ageInt
 * @param {() => number} [rng]
 * @returns {{ rowKey: string, qualities: { title: string, slug: string, exercises: ReturnType<typeof pickMotorQualityExercisesForAge> }[] }[]}
 */
export function buildCoachDevelopmentExercisePlan(sessionFormulaRows, ageInt, rng = Math.random) {
  const rows = Array.isArray(sessionFormulaRows) ? sessionFormulaRows : []
  const blocks = []
  for (const row of rows) {
    if (!isSessionRowDevelopmentBlock(row)) continue
    const titles = extractDevelopmentQualityTitlesFromSessionRow(row)
    const qualities = []
    for (const title of titles) {
      const slug = getMotorQualitySlug(title)
      if (!slug) continue
      const exercises = pickMotorQualityExercisesForAge(slug, ageInt, rng)
      if (exercises.length) qualities.push({ title, slug, exercises })
    }
    if (qualities.length > 0) blocks.push({ rowKey: row.key, qualities })
  }
  return blocks
}
