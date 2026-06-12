/**
 * Подбор нормативов для Telegram — та же логика, что в src/utils/ksrUtils.js (getNormsForAthlete).
 */

/** @param {unknown} raw */
function normalizeBirthYearNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'string') {
    const m = raw.match(/\d{4}/)
    if (m) return Number(m[0])
  }
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 1900 && n <= 2100) return Math.floor(n)
  return 0
}

/** @param {number | string | undefined} birthYear */
function computeAthleteAgeYears(birthYear) {
  const y = normalizeBirthYearNumber(birthYear)
  if (!y) return null
  return new Date().getFullYear() - y
}

/** @param {{ category?: string }} norm */
function isPhysicalNormCategory(norm) {
  const c = norm?.category
  return c === 'physical' || c === 'functional'
}

/**
 * @param {string | undefined} ageGroup например «13-14»
 * @returns {[number, number] | null}
 */
function parseAgeGroupSpan(ageGroup) {
  const parts = String(ageGroup ?? '')
    .split('-')
    .map((x) => Number(String(x).trim()))
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null
  }
  return [parts[0], parts[1]]
}

/**
 * @param {object} student
 */
export function athleteShapeFromStudent(student) {
  const birthYear =
    normalizeBirthYearNumber(student?.birthYear) ||
    normalizeBirthYearNumber(student?.birthYearLabel) ||
    (student?.birthDate
      ? normalizeBirthYearNumber(String(student.birthDate).slice(0, 4))
      : 0)
  const gender =
    student?.gender === 'F' || student?.gender === 'Ж' ? 'F' : 'M'
  return {
    height: Number(student?.height) || 0,
    reach: Number(student?.reach) || 0,
    weight: Number(student?.weight) || 0,
    birthYear,
    gender,
  }
}

/**
 * @param {object[]} allNorms
 * @param {{ birthYear?: number | string, gender?: string }} athlete
 */
export function getNormsForAthlete(allNorms, athlete) {
  const list = Array.isArray(allNorms) ? allNorms : []
  const gender = athlete?.gender === 'F' ? 'F' : 'M'
  const age = computeAthleteAgeYears(athlete?.birthYear) ?? 0

  return list.filter((norm) => {
    if (!isPhysicalNormCategory(norm)) return false
    if (norm.gender !== gender) return false
    const span = parseAgeGroupSpan(norm.ageGroup)
    if (!span) return false
    const [minAge, maxAge] = span
    return age >= minAge && age <= maxAge
  })
}
