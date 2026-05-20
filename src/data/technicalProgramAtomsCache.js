/** @typedef {import('../utils/ksrUtils.js').TechnicalAtom} TechnicalAtom */

/** @type {{ level1: TechnicalAtom[]; level2: TechnicalAtom[] }} */
let cache = { level1: [], level2: [] }

const listeners = new Set()

/** @param {{ level1: TechnicalAtom[]; level2: TechnicalAtom[] }} next */
export function setTechnicalProgramAtomsCache(next) {
  cache = {
    level1: Array.isArray(next?.level1) ? next.level1 : [],
    level2: Array.isArray(next?.level2) ? next.level2 : [],
  }
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error('[technicalProgramAtoms] cache listener', e)
    }
  })
}

/** @returns {{ level1: TechnicalAtom[]; level2: TechnicalAtom[] }} */
export function getTechnicalProgramAtomsCache() {
  return cache
}

/** @param {() => void} listener */
export function subscribeTechnicalProgramAtomsCache(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Все атомы программы (ур.1 + ур.2) для расчётов КД. */
export function getAllProgramAtomsFlat() {
  return [...cache.level1, ...cache.level2]
}
