import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import {
  REQUIRED_LEVEL3_COMBO_IDS,
  REQUIRED_LEVEL3_COMBO_TEMPLATES,
} from '../data/requiredLevel3Combos.js'
import { orderTechnicalAtomsForProgram } from './technicalProgramProgress.js'
import {
  resolveProgramLevel2Atoms,
  resolveProgramLevel3Atoms,
} from './technicalProgramAtomsResolved.js'

/**
 * Комбинации уровня 3: произвольные цепочки из атомов уровней 1–2 (хранятся на карточке ученика).
 * @typedef {{ id: string, name: string, steps: string[] }} TechnicalCombination
 */

export { REQUIRED_LEVEL3_COMBO_TEMPLATES, REQUIRED_LEVEL3_COMBO_IDS }

/**
 * Комбо ученика + медиа из каталога (обязательные комбо клуба).
 * @param {unknown} combinations
 * @param {object[]} [catalogLevel3]
 * @param {object[]} [level1Atoms]
 */
export function mapCombinationsToDisplayAtoms(combinations, catalogLevel3, level1Atoms) {
  const catalog =
    Array.isArray(catalogLevel3) && catalogLevel3.length > 0
      ? catalogLevel3
      : resolveProgramLevel3Atoms(undefined, level1Atoms)
  const byId = new Map(catalog.map((a) => [a.id, a]))
  const stepLookup = buildAtomLookupById(level1Atoms)
  const merged = mergeWithRequiredLevel3Combinations(combinations)
  return merged.map((c, index) => {
    const cat = byId.get(c.id)
    const steps = c.steps ?? cat?.steps ?? []
    return {
      ...(cat ?? {}),
      ...c,
      kind: 'combo',
      number: cat?.number ?? index + 1,
      name: c.name ?? cat?.name ?? `Комбо ${index + 1}`,
      steps,
      chainPreview: buildComboChainPreview(steps, stepLookup),
      embedUrl: cat?.embedUrl ?? '',
      videoLink: cat?.videoLink ?? '',
      media: cat?.media ?? { posterSrc: null, webmSrc: null },
      howTo: cat?.howTo ?? '',
      mistakes: cat?.mistakes ?? '',
    }
  })
}

/** База Cartel: ур.1 + ур.2 + 2 обязательные комбинации (19 + 8 + 2 = 29). */
export function buildBaseCartelProgramAtoms(level1Atoms) {
  const l1 = orderTechnicalAtomsForProgram(level1Atoms || [])
  const comboAtoms = REQUIRED_LEVEL3_COMBO_TEMPLATES.map((t) => ({
    id: t.id,
    number: 'III',
    name: t.name,
    kind: 'combo',
  }))
  return [...l1, ...resolveProgramLevel2Atoms(), ...comboAtoms]
}

/** @param {object[]} [level1Atoms] */
export function baseCartelProgramAtomCount(level1Atoms) {
  return buildBaseCartelProgramAtoms(level1Atoms).length
}

export function isRequiredLevel3ComboId(id) {
  return REQUIRED_LEVEL3_COMBO_IDS.includes(String(id ?? ''))
}

/**
 * Всегда добавляет в начало две обязательные комбинации; сохранённые шаги по их id имеют приоритет над шаблоном.
 * @param {unknown} rawList
 * @returns {TechnicalCombination[]}
 */
export function mergeWithRequiredLevel3Combinations(rawList) {
  const normalized = normalizeTechnicalCombinations(Array.isArray(rawList) ? rawList : [])
  const byId = new Map(normalized.map((c) => [c.id, c]))
  const head = REQUIRED_LEVEL3_COMBO_TEMPLATES.map((template) => {
    const saved = byId.get(template.id)
    return {
      id: template.id,
      name: template.name,
      steps: saved?.steps?.length ? [...saved.steps] : [...template.steps],
    }
  })
  const tail = normalized.filter((c) => !isRequiredLevel3ComboId(c.id))
  return [...head, ...tail]
}

/** @param {unknown} raw @returns {TechnicalCombination[]} */
export function normalizeTechnicalCombinations(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const id = String(item.id ?? '').trim()
    const name = String(item.name ?? '').trim()
    const steps = Array.isArray(item.steps) ? item.steps.map(String).filter(Boolean) : []
    if (!id || !name || steps.length === 0) continue
    out.push({ id, name, steps })
  }
  return out
}

/** @param {object[]} level1Atoms */
export function buildAtomLookupById(level1Atoms) {
  const m = new Map()
  for (const a of orderTechnicalAtomsForProgram(level1Atoms || [])) {
    if (a?.id) m.set(a.id, a)
  }
  for (const a of resolveProgramLevel2Atoms()) {
    if (a?.id) m.set(a.id, a)
  }
  return m
}

export function buildComboChainPreview(steps, byId) {
  return (steps || [])
    .map((sid) => {
      const a = byId.get(sid)
      if (!a) return '?'
      if (a.number != null && String(a.number).trim() !== '') return `#${a.number}`
      return String(a.name || '').slice(0, 14)
    })
    .join(' → ')
}

/**
 * Полный перечень для КД, балла «техника» и публичной выгрузки: L1 (канон. порядок) + L2 + виртуальные комбо.
 * @param {object[]} level1Atoms
 * @param {unknown} combinations
 */
export function buildFullTechnicalProgramAtoms(level1Atoms, combinations = []) {
  const l1 = orderTechnicalAtomsForProgram(level1Atoms || [])
  const byId = buildAtomLookupById(level1Atoms)

  const catalogL3 = getTechnicalProgramAtomsCache().level3
  const combos = mapCombinationsToDisplayAtoms(combinations, catalogL3, level1Atoms)
  return [...l1, ...resolveProgramLevel2Atoms(), ...combos]
}
