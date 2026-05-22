/**
 * Уникальный цвет на возрастную группу ориентира (без повторов в календаре 2026).
 * @typedef {{ bar: string, chip: string, short: string }} OrientirCohortStyle
 */

/** @type {Record<string, OrientirCohortStyle>} */
export const ORIENTIR_COHORT_STYLES = {
  'M-13-14': { bar: 'bg-violet-500', chip: 'bg-violet-100 border-violet-400 text-violet-950', short: '13–14 М' },
  'F-13-14': { bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-950', short: '13–14 Ж' },
  'M-15-16': { bar: 'bg-sky-500', chip: 'bg-sky-100 border-sky-400 text-sky-950', short: '15–16 М' },
  'F-15-16': { bar: 'bg-cyan-500', chip: 'bg-cyan-100 border-cyan-400 text-cyan-950', short: '15–16 Ж' },
  'M-17-18': { bar: 'bg-emerald-500', chip: 'bg-emerald-100 border-emerald-400 text-emerald-950', short: '17–18 М' },
  'F-17-18': { bar: 'bg-teal-500', chip: 'bg-teal-100 border-teal-400 text-teal-950', short: '17–18 Ж' },
  'M-19-22': { bar: 'bg-amber-500', chip: 'bg-amber-100 border-amber-400 text-amber-950', short: '19–22 М' },
  'F-19-22': { bar: 'bg-orange-500', chip: 'bg-orange-100 border-orange-400 text-orange-950', short: '19–22 Ж' },
  'M-19-40': { bar: 'bg-rose-500', chip: 'bg-rose-100 border-rose-400 text-rose-950', short: '19–40 М' },
  'F-19-40': { bar: 'bg-pink-500', chip: 'bg-pink-100 border-pink-400 text-pink-950', short: '19–40 Ж' },
}

/**
 * @param {string | undefined} cohortId
 * @returns {OrientirCohortStyle | null}
 */
export function getOrientirCohortStyle(cohortId) {
  if (!cohortId) return null
  return ORIENTIR_COHORT_STYLES[cohortId] ?? null
}
