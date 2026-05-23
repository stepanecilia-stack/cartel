import { normalizeNormCategory } from './normsCategory.js'

/** @param {object} norm */
export function legacyNormDocId(norm) {
  const safe = (value) =>
    String(value ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80)
  return `${safe(norm.category)}__${safe(norm.testId)}__${safe(norm.ageGroup)}__${safe(norm.gender)}`
}

/** @param {Record<string, unknown>} data */
export function legacyNormFromFirestore(data) {
  const gold = Number(data.gold)
  const silver = Number(data.silver)
  const bronze = Number(data.bronze)
  return {
    category: normalizeNormCategory(String(data.category ?? '').trim()),
    testId: String(data.testId ?? '').trim(),
    testName: String(data.testName ?? '').trim(),
    description: String(data.description ?? '').trim(),
    ageGroup: String(data.ageGroup ?? '').trim(),
    gender: String(data.gender ?? '').trim(),
    unit: String(data.unit ?? '').trim(),
    gold: Number.isFinite(gold) ? gold : NaN,
    silver: Number.isFinite(silver) ? silver : NaN,
    bronze: Number.isFinite(bronze) ? bronze : NaN,
    measureType: String(data.measureType ?? '').trim(),
  }
}

/** @param {object} norm */
export function legacyNormToFirestore(norm) {
  return {
    category: norm.category,
    testId: norm.testId,
    testName: norm.testName,
    description: norm.description ?? '',
    ageGroup: norm.ageGroup,
    gender: norm.gender,
    unit: norm.unit ?? '',
    gold: norm.gold,
    silver: norm.silver,
    bronze: norm.bronze,
    measureType: norm.measureType ?? '',
  }
}

/** @param {object[]} norms */
export function sortLegacyNorms(norms) {
  return [...norms].sort((a, b) => {
    const cat = a.category.localeCompare(b.category, 'ru')
    if (cat !== 0) return cat
    const test = a.testId.localeCompare(b.testId, 'ru')
    if (test !== 0) return test
    const age = a.ageGroup.localeCompare(b.ageGroup, 'ru')
    if (age !== 0) return age
    return a.gender.localeCompare(b.gender, 'ru')
  })
}
