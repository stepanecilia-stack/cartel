import { findNormExecutionRuleFromText } from '../data/portalNormExecutionRules.js'
import { migrateStudentTests } from './normsCategory.js'
import { getNormsForAthlete } from './ksrUtils.js'
import { buildPortalNormsSnapshot } from './portalNormsChat.js'
import { formatMinutesToMinuteSecond, isMinuteSecondNorm } from './normTestsStorage.js'
import {
  computeAthleteAgeYears,
  normalizeBirthDateISO,
  normalizeBirthYearNumber,
  normalizeAnthropometryNumber,
  studentAthleteShape,
} from './studentModel.js'

/**
 * @param {object} norm
 * @param {'gold' | 'silver' | 'bronze'} field
 */
function formatThresholdValue(norm, field) {
  const val = norm?.[field]
  if (!Number.isFinite(val)) return '—'
  if (isMinuteSecondNorm(norm)) return formatMinutesToMinuteSecond(val)
  return String(val)
}

/** @param {object} norm */
export function formatNormThresholdsLine(norm) {
  if (!norm) return ''
  const unit = norm.unit ? ` ${norm.unit}` : ''
  return `золото ${formatThresholdValue(norm, 'gold')}${unit}, серебро ${formatThresholdValue(norm, 'silver')}${unit}, бронза ${formatThresholdValue(norm, 'bronze')}${unit}`
}

/**
 * Тот же профиль спортсмена, что на карточке ученика (StudentPage → athleteForNorms).
 * @param {object | null | undefined} student
 */
function resolveAthleteGender(student) {
  const raw =
    student?.gender ??
    student?.sex ??
    student?.anthropometry?.gender ??
    student?.profile?.gender
  if (raw === 'F' || raw === 'Ж' || raw === 'female' || raw === 'женский') return 'F'
  if (raw === 'M' || raw === 'М' || raw === 'male' || raw === 'мужской') return 'M'
  return 'M'
}

export function buildAthleteForNorms(student) {
  if (!student || typeof student !== 'object') {
    return studentAthleteShape(null)
  }
  const birthYear =
    normalizeBirthYearNumber(student.birthYear) ||
    normalizeBirthYearNumber(student.birthYearLabel) ||
    normalizeBirthYearNumber(student.birthDate ? String(student.birthDate).slice(0, 4) : 0)
  const birthDate = normalizeBirthDateISO(student.birthDate)
  return {
    ...student,
    height: normalizeAnthropometryNumber(student.height),
    reach: normalizeAnthropometryNumber(student.reach),
    weight: normalizeAnthropometryNumber(student.weight),
    birthYear,
    birthDate,
    gender: resolveAthleteGender(student),
  }
}

/**
 * Список физических нормативов ученика — как в карточке.
 * Если карточка открыта, в student.physicalNorms лежит точный снимок с экрана.
 * @param {object[]} allNorms
 * @param {object | null | undefined} student
 */
export function getPhysicalNormsForStudent(allNorms, student) {
  const cached = student?.physicalNorms
  if (Array.isArray(cached) && cached.length > 0) {
    return cached
  }
  const athlete = buildAthleteForNorms(student)
  return getNormsForAthlete(allNorms, athlete, 'physical')
}

/**
 * @param {object | null | undefined} student
 * @param {object[]} allNorms
 */
export function describeStudentNormsProfile(student, allNorms) {
  const athlete = buildAthleteForNorms(student)
  const norms = getPhysicalNormsForStudent(allNorms, student)
  const ageYears = computeAthleteAgeYears(athlete.birthYear)
  const ageGroups = [...new Set(norms.map((norm) => String(norm.ageGroup ?? '')).filter(Boolean))]
  const genderLabel = athlete.gender === 'F' ? 'Ж' : 'М'
  const birthLabel = athlete.birthYear ? `${athlete.birthYear} г.р.` : 'г.р. не указан'

  return {
    athlete,
    norms,
    ageYears,
    genderLabel,
    birthLabel,
    ageGroups,
    fromCardSnapshot: Array.isArray(student?.physicalNorms) && student.physicalNorms.length > 0,
  }
}

/**
 * @param {object | null | undefined} student
 * @param {object[]} allNorms
 */
export function formatStudentNormsProfileLine(student, allNorms) {
  const profile = describeStudentNormsProfile(student, allNorms)
  const agePart =
    profile.ageYears != null ? `возраст=${profile.ageYears} лет` : 'возраст не указан'
  const groupsPart =
    profile.ageGroups.length > 0
      ? `нормативные группы ${profile.ageGroups.join(', ')}`
      : 'нормативные группы не определены'
  const sourcePart = profile.fromCardSnapshot ? 'данные с открытой карточки' : 'данные карточки'
  return `нормативный профиль (${sourcePart}): пол=${profile.genderLabel}, ${profile.birthLabel}, ${agePart}, ${groupsPart}`
}

/**
 * @param {object | null | undefined} student
 * @param {object[]} allNorms
 * @param {boolean} [detailed]
 */
/**
 * Кратко: сколько нормативов сдано, без перечня.
 * @param {object | null | undefined} student
 * @param {object[]} allNorms
 */
export function formatStudentNormsCountBrief(student, allNorms) {
  const profile = describeStudentNormsProfile(student, allNorms)
  if (profile.norms.length === 0) {
    return 'нормативы: нет списка для возраста/пола'
  }
  const values = migrateStudentTests(student?.tests).physical
  const snapshot = buildPortalNormsSnapshot(profile.norms, values, student?.portalNormSelfReports)
  return `нормативы: сдано ${snapshot.passed} из ${snapshot.total}`
}

export function formatStudentNormsCardBlock(student, allNorms, detailed = true) {
  const profile = describeStudentNormsProfile(student, allNorms)
  const lines = [formatStudentNormsProfileLine(student, allNorms)]

  if (profile.norms.length === 0) {
    lines.push('нормативы: нет списка для возраста/пола — проверь г.р. и пол в карточке')
    return lines.join('\n')
  }

  const values = migrateStudentTests(student?.tests).physical
  const snapshot = buildPortalNormsSnapshot(profile.norms, values, student?.portalNormSelfReports)
  lines.push(
    `зачётов ${snapshot.passed}/${snapshot.total} (золото ${snapshot.gold}, серебро ${snapshot.silver}, бронза ${snapshot.bronze}, ниже нормы ${snapshot.red}, не сдано ${snapshot.empty})`,
  )

  if (!detailed) return lines.join('\n')

  for (const item of snapshot.items) {
    const normRow = profile.norms.find((n) => String(n.testId ?? '') === String(item.testId ?? ''))
    const thresholds = normRow ? formatNormThresholdsLine(normRow) : `золото ${item.goalGold}`
    const result = item.displayResult
      ? `${item.displayResult}${item.unit ? ` ${item.unit}` : ''}`
      : '—'
    lines.push(`  «${item.testName}» [${normRow?.ageGroup ?? '—'}]: результат ${result}, ${thresholds}`)
  }

  return lines.join('\n')
}

/**
 * Норматив только из программы ученика (как в карточке). Без угадывания по каталогу.
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} testIdOrName
 */
export function resolvePhysicalNormForStudent(allNorms, student, testIdOrName) {
  const key = String(testIdOrName ?? '').trim().toLowerCase()
  if (!key) return null
  const norms = getPhysicalNormsForStudent(allNorms, student)
  return (
    norms.find((norm) => String(norm.testId ?? '').toLowerCase() === key) ??
    norms.find((norm) => String(norm.testName ?? '').toLowerCase() === key) ??
    norms.find((norm) => String(norm.testName ?? '').toLowerCase().includes(key)) ??
    null
  )
}

/**
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} combinedText
 */
export function resolvePhysicalNormFromText(allNorms, student, combinedText) {
  const norms = getPhysicalNormsForStudent(allNorms, student)
  const scopeNames = norms.map((norm) => String(norm.testName ?? ''))
  let hint = findNormExecutionRuleFromText(combinedText, scopeNames.length ? scopeNames : null)
  if (!hint?.testName && !hint?.rule?.id) return null
  const keys = [hint.testName, hint.rule?.id, ...(hint.rule?.testNames ?? [])].filter(Boolean)
  for (const testKey of keys) {
    const norm = resolvePhysicalNormForStudent(allNorms, student, testKey)
    if (norm) return norm
  }
  return null
}
