import { isMotorQualitySensitiveForAge } from './sensitivePeriods.js'
import {
  computeAthleteAgeYears,
  displayNameFromStudent,
  formatBirthYearRu,
  studentAthleteShape,
} from './studentModel.js'

/**
 * @param {object[]} students — документы Firestore
 * @param {string} qualityTitle
 */
export function pickStudentsInSensitivePeriodForQuality(students, qualityTitle) {
  if (!qualityTitle || !Array.isArray(students)) return []

  const rows = []
  for (const raw of students) {
    if (!raw?.id) continue
    const shaped = studentAthleteShape(raw)
    const age = computeAthleteAgeYears(shaped.birthYear)
    if (!isMotorQualitySensitiveForAge(qualityTitle, age)) continue
    rows.push({
      ...raw,
      name: displayNameFromStudent(raw),
      ageInt: Math.floor(age),
      birthYearLabel: formatBirthYearRu(shaped.birthYear) || null,
    })
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return rows
}
