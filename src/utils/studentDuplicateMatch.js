import {
  displayNameFromStudent,
  formatBirthYearRu,
  formatShortIdDisplay,
  normalizeBirthYearNumber,
} from './studentModel.js'

/** Нормализованный ключ ФИО: без регистра, ё→е, токены в алфавитном порядке. */
export function normalizeStudentNameKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ')
}

/**
 * Ученики из списка тренера, похожие на вводимую анкету (то же ФИО ± год рождения).
 * @param {object[]} existingStudents
 * @param {{ fullName?: string, name?: string, birthYear?: number | string }} draft
 */
export function findLikelyDuplicateStudents(existingStudents, draft) {
  const list = Array.isArray(existingStudents) ? existingStudents : []
  const nameKey = normalizeStudentNameKey(draft?.fullName ?? draft?.name ?? '')
  if (!nameKey) return []

  const birthYear = normalizeBirthYearNumber(draft?.birthYear)

  return list.filter((student) => {
    const existingKey = normalizeStudentNameKey(displayNameFromStudent(student))
    if (existingKey !== nameKey) return false
    if (!birthYear) return true
    const studentYear = normalizeBirthYearNumber(student?.birthYear)
    if (!studentYear) return true
    return studentYear === birthYear
  })
}

export function duplicateStudentSummary(student) {
  const name = displayNameFromStudent(student)
  const birth = formatBirthYearRu(student?.birthYear)
  const rawId = student?.short_id
  const code =
    rawId != null && rawId !== '' && Number.isFinite(Number(rawId))
      ? formatShortIdDisplay(Number(rawId))
      : null
  return { name, birth, code }
}
