import { emptyTestsRecord, getNormValueByTestId } from './normTestsStorage.js'

/** Нормативы бега и др. бывшего раздела «Функционал» отображаются и хранятся в «Физике». */
export function normalizeNormCategory(category) {
  return category === 'functional' ? 'physical' : category
}

/** @param {{ category?: string }} norm */
export function isPhysicalNormCategory(norm) {
  const c = norm?.category
  return c === 'physical' || c === 'functional'
}

/**
 * Слить tests.functional → tests.physical (старые карточки).
 * @param {object | null | undefined} tests
 */
export function migrateStudentTests(tests) {
  if (!tests || typeof tests !== 'object') {
    return { physical: {}, functional: {} }
  }
  const physical = { ...emptyTestsRecord(tests.physical) }
  const functional = emptyTestsRecord(tests.functional)
  for (const [testId, row] of Object.entries(functional)) {
    if (!getNormValueByTestId(physical, testId)) {
      physical[testId] = row
    }
  }
  return { physical, functional: {} }
}
