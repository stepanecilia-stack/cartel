import { mapCombinationsToDisplayAtoms, mergeWithRequiredLevel3Combinations } from './techniqueCatalog.js'
import { resolveProgramLevel3Atoms } from './technicalProgramAtomsResolved.js'
import { countLeadingMasteredAtoms } from './studentTechnicalUpdate.js'
import { normalizeStudentTechnicalData } from './technicalProgramProgress.js'

function resolveTierPassed(orderedAtoms, technicalData, sessionValue) {
  const baseline = countLeadingMasteredAtoms(orderedAtoms, technicalData)
  if (typeof sessionValue === 'number' && Number.isFinite(sessionValue)) {
    return Math.min(orderedAtoms.length, Math.max(baseline, sessionValue))
  }
  return baseline
}

/**
 * Полный каталог приёмов для справочного блока тренера (все шаги программы, без фильтра по прогрессу).
 */
export function buildCoachPracticeCatalogByTier({ students, orderedL1, orderedL2, orderedL3Catalog }) {
  const catalogL3 = orderedL3Catalog ?? resolveProgramLevel3Atoms(undefined, orderedL1)
  const level3ById = new Map()
  for (const student of students ?? []) {
    const combos = mapCombinationsToDisplayAtoms(student.technicalCombinations, catalogL3, orderedL1)
    combos.forEach((combo) => {
      if (!combo?.id || level3ById.has(combo.id)) return
      level3ById.set(combo.id, combo)
    })
  }
  return {
    level1: orderedL1 ?? [],
    level2: orderedL2 ?? [],
    level3: [...level3ById.values()],
  }
}

/**
 * Приёмы для блока «Отработка»: только то, что хотя бы один ученик группы уже прошёл.
 * @deprecated Используйте buildCoachPracticeCatalogByTier для справочника тренера.
 */
export function buildGroupPracticeAtomsByTier({
  students,
  orderedL1,
  orderedL2,
  slidersByStudentId = {},
  getTechnicalData,
}) {
  if (!Array.isArray(students) || students.length === 0) {
    return { level1: [], level2: [], level3: [] }
  }

  let maxL1 = 0
  let maxL2 = 0
  const level3ById = new Map()

  for (const student of students) {
    const technicalData =
      typeof getTechnicalData === 'function'
        ? getTechnicalData(student)
        : normalizeStudentTechnicalData(student.technicalData)
    const tiers = slidersByStudentId[student.id] ?? {}

    maxL1 = Math.max(maxL1, resolveTierPassed(orderedL1, technicalData, tiers.l1))

    maxL2 = Math.max(maxL2, resolveTierPassed(orderedL2, technicalData, tiers.l2))

    const combos = mergeWithRequiredLevel3Combinations(student.technicalCombinations)
    const comboAtoms = combos.map((c) => ({ id: c.id }))
    const passedL3 = resolveTierPassed(comboAtoms, technicalData, tiers.l3)
    for (let i = 0; i < passedL3 && i < combos.length; i += 1) {
      const combo = combos[i]
      if (!combo?.id || level3ById.has(combo.id)) continue
      level3ById.set(combo.id, {
        ...combo,
        kind: 'combo',
        number: combo.number ?? i + 1,
        name: combo.name ?? `Комбо ${i + 1}`,
      })
    }
  }

  return {
    level1: orderedL1.slice(0, maxL1),
    level2: orderedL2.slice(0, maxL2),
    level3: [...level3ById.values()],
  }
}

function atomIndexInOrdered(atomId, orderedAtoms) {
  const index = orderedAtoms.findIndex((a) => a.id === atomId)
  return index >= 0 ? index : null
}

/** Ученик уже прошёл этот приём (префикс программы / комбо). */
export function isAtomMasteredByStudent(student, atomId, { orderedL1, orderedL2, slidersByStudentId, getTechnicalData }) {
  const technicalData =
    typeof getTechnicalData === 'function'
      ? getTechnicalData(student)
      : normalizeStudentTechnicalData(student.technicalData)
  const tiers = slidersByStudentId[student.id] ?? {}

  const i1 = atomIndexInOrdered(atomId, orderedL1)
  if (i1 !== null) {
    return i1 < resolveTierPassed(orderedL1, technicalData, tiers.l1)
  }

  const i2 = atomIndexInOrdered(atomId, orderedL2)
  if (i2 !== null) {
    return i2 < resolveTierPassed(orderedL2, technicalData, tiers.l2)
  }

  const combos = mergeWithRequiredLevel3Combinations(student.technicalCombinations)
  const comboAtoms = combos.map((c) => ({ id: c.id }))
  const i3 = atomIndexInOrdered(atomId, comboAtoms)
  if (i3 !== null) {
    return i3 < resolveTierPassed(comboAtoms, technicalData, tiers.l3)
  }

  return false
}
