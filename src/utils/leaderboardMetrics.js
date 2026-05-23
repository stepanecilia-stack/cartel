import {
  calculateEffectiveKSR,
  calculateKsrAndKsp,
  calculateKD,
  calculateLegacySectionScores,
  getNormsForAthlete,
  normalizeTechnicalDominanceKey,
} from './ksrUtils.js'
import { buildFullTechnicalProgramAtoms, mergeWithRequiredLevel3Combinations } from './techniqueCatalog.js'
import { getNormValueByTestId } from './normTestsStorage.js'
import { normalizeMotorQualityWorkLog } from './motorQualityWorkLog.js'
import { migrateStudentTests } from './normsCategory.js'
import { studentAthleteShape } from './studentModel.js'

/** @typedef {'motor' | 'physical' | 'technical'} LeaderboardCategoryId */

export const LEADERBOARD_CATEGORIES = [
  {
    id: 'motor',
    label: 'Двигательные качества',
    shortLabel: 'Качества',
    hint: 'Сумма выполнений упражнений в журнале работы по качествам.',
  },
  {
    id: 'physical',
    label: 'Физическая подготовка',
    shortLabel: 'Физика',
    hint: 'Медали по нормативам физики и бега (золото, серебро, бронза) по возрасту и полу.',
  },
  {
    id: 'technical',
    label: 'Техника',
    shortLabel: 'Техника',
    hint: 'Изученные приёмы программы и сила навыка (КД по уровням освоения).',
  },
]

/**
 * @param {unknown} workLog
 */
export function countMotorQualitySquares(workLog) {
  const normalized = normalizeMotorQualityWorkLog(workLog)
  let total = 0
  let sensitive = 0
  for (const entries of Object.values(normalized)) {
    total += entries.length
    sensitive += entries.filter((e) => e.inSensitivePeriod).length
  }
  return { total, sensitive, outside: total - sensitive }
}

/**
 * @param {Record<string, unknown>} student
 * @param {object[]} allNorms
 * @param {'physical' | 'functional'} category
 */
export function countNormMedalsForStudent(student, allNorms, category) {
  const athlete = studentAthleteShape(student)
  const norms = getNormsForAthlete(allNorms, athlete, 'physical')
  const { physical: tests } = migrateStudentTests(student.tests)

  const medals = { gold: 0, silver: 0, bronze: 0, red: 0, filled: 0 }
  for (const norm of norms) {
    const row = getNormValueByTestId(tests, norm.testId)
    if (!row || row.status == null || row.status === 'empty') continue
    if (row.status in medals) medals[row.status] += 1
    if (row.status === 'gold' || row.status === 'silver' || row.status === 'bronze' || row.status === 'red') {
      medals.filled += 1
    }
  }

  const points = medals.gold * 100 + medals.silver * 40 + medals.bronze * 15
  return { ...medals, points, applicable: norms.length }
}

/**
 * @param {Record<string, unknown>} student
 * @param {object[]} technicalAtoms — level 1 CSV atoms
 */
export function computeTechniqueLeaderboardMetrics(student, technicalAtoms) {
  const shape = studentAthleteShape(student)
  const data = student.technicalData && typeof student.technicalData === 'object' ? student.technicalData : {}
  const combinations = mergeWithRequiredLevel3Combinations(student.technicalCombinations)
  const programAtoms = buildFullTechnicalProgramAtoms(technicalAtoms, combinations)
  const kdBundle = calculateKD(programAtoms, data)

  const tests = student.tests && typeof student.tests === 'object' ? student.tests : {}
  const physicalResults = tests.physical && typeof tests.physical === 'object' ? tests.physical : {}
  const functionalResults = tests.functional && typeof tests.functional === 'object' ? tests.functional : {}
  const scores = calculateLegacySectionScores({
    physicalNorms: [],
    functionalNorms: [],
    physicalResults,
    functionalResults,
    technicalData: data,
    technicalProgramAtoms: programAtoms,
  })
  const prevScores = student?.scores && typeof student.scores === 'object' ? student.scores : {}
  const mergedScores = {
    техника: scores.техника,
    физика: Number(prevScores.физика ?? 0) || 0,
    функционал: Number(prevScores.функционал ?? 0) || 0,
  }
  const kspBundle = calculateKsrAndKsp(shape, mergedScores)
  const effective = calculateEffectiveKSR(kspBundle.baseKSR, kdBundle.kd)

  let studiedCount = 0
  let skillSum = 0
  for (const atom of programAtoms) {
    const key = normalizeTechnicalDominanceKey(data[atom.id]?.level)
    if (key !== 'NOT_LEARNED') studiedCount += 1
    skillSum += { NOT_LEARNED: 0, KNOWLEDGE: 1, MOTOR_SKILL_LEVEL_1: 2, MOTOR_SKILL_LEVEL_2: 3, AUTOMATED: 4 }[key] ?? 0
  }

  const totalAtoms = programAtoms.length
  const kdPercent = Math.round((kdBundle.kd ?? 0.25) * 100)

  const sortScore = studiedCount * 10000 + kdPercent * 100 + effective

  return {
    studiedCount,
    totalAtoms,
    automatedCount: kdBundle.automatedCount,
    kd: kdBundle.kd,
    kdPercent,
    automationPercent: kdBundle.automationPercent,
    effectiveKSR: effective,
    skillSum,
    sortScore,
  }
}

/**
 * @param {Record<string, unknown>} student
 * @param {object[]} allNorms
 * @param {object[]} technicalAtoms
 * @param {LeaderboardCategoryId} categoryId
 */
export function buildLeaderboardMetric(student, allNorms, technicalAtoms, categoryId) {
  switch (categoryId) {
    case 'motor': {
      const { total, sensitive, outside } = countMotorQualitySquares(student.motorQualityWorkLog)
      return {
        sortValue: total,
        primaryLabel: `${total}`,
        primarySuffix: total === 1 ? 'выполнение' : total < 5 ? 'выполнения' : 'выполнений',
        secondary: sensitive > 0 ? `в сенситиве: ${sensitive}` : outside > 0 ? `вне окна: ${outside}` : null,
        motor: { total, sensitive, outside },
      }
    }
    case 'physical': {
      const medals = countNormMedalsForStudent(student, allNorms, 'physical')
      return {
        sortValue: medals.points,
        primaryLabel: `${medals.gold}`,
        primarySuffix: 'золото',
        secondary: `🥈 ${medals.silver} · 🥉 ${medals.bronze}`,
        medals,
      }
    }
    case 'technical': {
      const tech = computeTechniqueLeaderboardMetrics(student, technicalAtoms)
      return {
        sortValue: tech.sortScore,
        primaryLabel: `${tech.studiedCount}/${tech.totalAtoms}`,
        primarySuffix: 'приёмов',
        secondary: null,
        tech,
      }
    }
    default:
      return { sortValue: 0, primaryLabel: '—', primarySuffix: '', secondary: null }
  }
}

/**
 * @param {Array<Record<string, unknown>>} students
 * @param {object[]} allNorms
 * @param {object[]} technicalAtoms
 * @param {LeaderboardCategoryId} categoryId
 * @param {(raw: Record<string, unknown>) => string} displayNameFn
 */
export function buildLeaderboardRows(students, allNorms, technicalAtoms, categoryId, displayNameFn) {
  const rows = students.map((raw) => {
    const metric = buildLeaderboardMetric(raw, allNorms, technicalAtoms, categoryId)
    return {
      id: raw.id,
      name: displayNameFn(raw),
      ...metric,
    }
  })

  rows.sort((a, b) => {
    if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue
    return a.name.localeCompare(b.name, 'ru')
  })

  return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}
