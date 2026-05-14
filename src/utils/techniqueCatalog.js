import { TECHNIQUE_LEVEL2_ATOMS } from './ksrUtils.js'
import { orderTechnicalAtomsForProgram } from './technicalProgramProgress.js'

/**
 * Комбинации уровня 3: произвольные цепочки из атомов уровней 1–2 (хранятся на карточке ученика).
 * @typedef {{ id: string, name: string, steps: string[] }} TechnicalCombination
 */

/** Две обязательные комбинации программы (id стабильны для Firestore и UI). */
export const REQUIRED_LEVEL3_COMBO_TEMPLATES = [
  {
    id: 'combo_std_double_podashag',
    name: 'Двойка подшаг',
    steps: ['atom_7', 'atom_7'],
  },
  {
    id: 'combo_std_double_tolchok',
    name: 'Двойка толчок',
    steps: ['atom_7', 'atom_11'],
  },
]

export const REQUIRED_LEVEL3_COMBO_IDS = REQUIRED_LEVEL3_COMBO_TEMPLATES.map((t) => t.id)

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
  for (const a of TECHNIQUE_LEVEL2_ATOMS) {
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

  const mergedCombos = mergeWithRequiredLevel3Combinations(combinations)
  const combos = mergedCombos.map((c) => ({
    id: c.id,
    number: 'III',
    name: c.name,
    kind: 'combo',
    steps: c.steps,
    chainPreview: buildComboChainPreview(c.steps, byId),
    embedUrl: '',
    howTo: '',
    whyHowTo: '',
    mistakes: '',
    whyMistakes: '',
    videoLink: '',
  }))
  return [...l1, ...TECHNIQUE_LEVEL2_ATOMS, ...combos]
}
