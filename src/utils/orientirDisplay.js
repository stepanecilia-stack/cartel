/**
 * @param {string} cohortLabel
 */
export function extractAgeRangeFromCohortLabel(cohortLabel) {
  const m = String(cohortLabel).match(/(\d+–\d+)/)
  return m ? m[1] : cohortLabel
}

/**
 * @param {string[] | undefined} labels
 */
export function formatOrientirAgeLine(labels) {
  if (!labels?.length) return ''
  return labels.join(' · ')
}

/**
 * Короткая подпись для ячейки календаря.
 * @param {string[] | undefined} labels
 */
export function formatOrientirAgeShort(labels) {
  if (!labels?.length) return ''
  const ranges = [...new Set(labels.map(extractAgeRangeFromCohortLabel))]
  if (ranges.length === 1) return ranges[0]
  if (ranges.length === 2) return ranges.join(',')
  return `${ranges[0]} +${ranges.length - 1}`
}

/**
 * Короткая подпись полоски в ячейке календаря.
 * @param {import('./plannedCompetitions.js').PlannedCompetition} item
 * @param {string | undefined} stageShort
 */
export function orientirDayChipLabel(item, stageShort) {
  const age = formatOrientirAgeShort(item.orientirAgeLabels)
  if (age && stageShort) return `${age} ${stageShort}`
  return age || stageShort || '~'
}

/**
 * @param {{ title?: string, orientirAgeLabels?: string[] }} item
 */
export function orientirDisplayTitle(item) {
  const base = item.title?.trim() || 'Соревнование'
  const ages = formatOrientirAgeLine(item.orientirAgeLabels)
  return ages ? `${base} (${ages})` : base
}
