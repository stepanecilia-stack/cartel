import { getNormsForAthlete } from './ksrUtils.js'
import { isPhysicalNormCategory } from './normsCategory.js'
import { normalizeLegacyTestId } from './normTestsStorage.js'
import { studentAthleteShape } from './studentModel.js'

/** Уникальные нормативы категории для выпадающего списка. */
export function listNormCatalogOptions(allNorms, category) {
  if (category === 'functional') return []
  const map = new Map()
  for (const norm of allNorms) {
    if (category === 'physical') {
      if (!isPhysicalNormCategory(norm)) continue
    } else if (norm.category !== category) {
      continue
    }
    if (!norm.testId) continue
    const key = normalizeLegacyTestId(norm.testId)
    if (!key || map.has(key)) continue
    map.set(key, {
      testId: norm.testId,
      testName: norm.testName,
      description: norm.description,
      unit: norm.unit,
      category: norm.category,
    })
  }
  return [...map.values()].sort((a, b) =>
    String(a.testName || '').localeCompare(String(b.testName || ''), 'ru'),
  )
}

/** Норматив этой категории для конкретного спортсмена (с учётом возраста и пола). */
export function getAthleteNormForTest(allNorms, student, category, testId) {
  const shape = studentAthleteShape(student)
  const norms = getNormsForAthlete(allNorms, shape, category)
  const target = normalizeLegacyTestId(testId)
  return norms.find((n) => normalizeLegacyTestId(n.testId) === target) ?? null
}

export function filterAthletesWithNorm(students, allNorms, category, testId) {
  if (!testId) return []
  return students.filter((s) => getAthleteNormForTest(allNorms, s, category, testId))
}
