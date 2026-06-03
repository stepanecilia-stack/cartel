/** @typedef {import('../utils/ksrUtils.js').TechnicalAtom} TechnicalAtom */

/** @type {{ 1?: string | null; 2?: string | null; 3?: string | null }} */
export const EMPTY_TIER_COVERS = { 1: null, 2: null, 3: null }

/** @type {{ level1: TechnicalAtom[]; level2: TechnicalAtom[]; level3: TechnicalAtom[]; tierCovers: typeof EMPTY_TIER_COVERS }} */
let cache = { level1: [], level2: [], level3: [], tierCovers: { ...EMPTY_TIER_COVERS } }

const listeners = new Set()

/** @param {{ level1: TechnicalAtom[]; level2: TechnicalAtom[]; level3?: TechnicalAtom[]; tierCovers?: typeof EMPTY_TIER_COVERS }} next */
export function setTechnicalProgramAtomsCache(next) {
  const covers = next?.tierCovers && typeof next.tierCovers === 'object' ? next.tierCovers : EMPTY_TIER_COVERS
  cache = {
    level1: Array.isArray(next?.level1) ? next.level1 : [],
    level2: Array.isArray(next?.level2) ? next.level2 : [],
    level3: Array.isArray(next?.level3) ? next.level3 : [],
    tierCovers: {
      1: covers[1] ?? covers['1'] ?? null,
      2: covers[2] ?? covers['2'] ?? null,
      3: covers[3] ?? covers['3'] ?? null,
    },
  }
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error('[technicalProgramAtoms] cache listener', e)
    }
  })
}

/** @returns {typeof cache} */
export function getTechnicalProgramAtomsCache() {
  return cache
}

/** @param {() => void} listener */
export function subscribeTechnicalProgramAtomsCache(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Все атомы программы (ур.1 + ур.2 + обязательные комбо ур.3) для расчётов КД. */
export function getAllProgramAtomsFlat() {
  return [...cache.level1, ...cache.level2, ...cache.level3]
}
