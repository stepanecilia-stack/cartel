import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'

/** @typedef {1 | 2 | 3} ProgramTier */

export const PROGRAM_TIER_COVER_DOC_IDS = {
  1: 'tier_cover_1',
  2: 'tier_cover_2',
  3: 'tier_cover_3',
}

/** @param {object | null | undefined} atom */
export function inferProgramTier(atom) {
  const t = Number(atom?.techniqueTier)
  if (t === 2 || t === 3) return t
  if (atom?.kind === 'combo' || String(atom?.id ?? '').startsWith('combo_')) return 3
  if (String(atom?.id ?? '').startsWith('lvl2_')) return 2
  return 1
}

/** @param {ProgramTier} tier */
export function getProgramTierCoverSrc(tier) {
  const covers = getTechnicalProgramAtomsCache().tierCovers
  if (!covers || typeof covers !== 'object') return null
  const src = covers[tier] ?? covers[String(tier)]
  return typeof src === 'string' && src.trim() ? src.trim() : null
}

/** @param {object | null | undefined} atom */
export function getProgramTierCoverSrcForAtom(atom) {
  return getProgramTierCoverSrc(inferProgramTier(atom))
}
