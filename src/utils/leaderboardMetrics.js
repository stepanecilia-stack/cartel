import {
  calculateEffectiveKSR,
  calculateKsrAndKsp,
  calculateKD,
  calculateLegacySectionScores,
  countProgramAtomsAtOrAboveSkill,
  getNormsForAthlete,
  normalizeTechnicalDominanceKey,
} from './ksrUtils.js'
import { buildFullTechnicalProgramAtoms, mergeWithRequiredLevel3Combinations } from './techniqueCatalog.js'
import { getNormValueByTestId, resolveNormRowStatus } from './normTestsStorage.js'
import { normalizeMotorQualityWorkLog } from './motorQualityWorkLog.js'
import { migrateStudentTests } from './normsCategory.js'
import { sumReinforceableProgramPractices } from './atomReinforcement.js'
import { studentAthleteShape } from './studentModel.js'

/** Доля КД в нормализованной технике сводного топа (остальное — отработки в зале). */
const OVERALL_TECH_KD_WEIGHT = 0.9

/** @typedef {'overall' | 'motor' | 'physical' | 'technical'} LeaderboardCategoryId */

export const LEADERBOARD_CATEGORIES = [
  {
    id: 'overall',
    label: 'Сводный топ',
    shortLabel: 'Топ',
    hint: 'Рейтинг по совокупности: техника (КД и отработки в зале), физика (медали), качества (зачёты). Балл 0–100 — среднее по трём направлениям в группе.',
  },
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
    hint: 'Изученные приёмы, КД по уровням освоения и отработки на групповых тренировках.',
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
    const status = resolveNormRowStatus(norm, row)
    if (status === 'empty') continue
    if (status in medals) medals[status] += 1
    if (status === 'gold' || status === 'silver' || status === 'bronze' || status === 'red') {
      medals.filled += 1
    }
  }

  const points = medals.gold * 100 + medals.silver * 40 + medals.bronze * 15
  const passed = medals.gold + medals.silver + medals.bronze
  return { ...medals, passed, points, applicable: norms.length }
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

  const { count: atomsAtSkill } = countProgramAtomsAtOrAboveSkill(programAtoms, data)
  const totalAtoms = programAtoms.length
  const kdPercent = Math.round((kdBundle.kd ?? 0.25) * 100)
  const reinforcementTotal = sumReinforceableProgramPractices(student.atomReinforcement, programAtoms)

  const sortScore = studiedCount * 10000 + kdPercent * 100 + effective + reinforcementTotal

  return {
    studiedCount,
    atomsAtSkill,
    totalAtoms,
    automatedCount: kdBundle.automatedCount,
    kd: kdBundle.kd,
    kdPercent,
    automationPercent: kdBundle.automationPercent,
    effectiveKSR: effective,
    skillSum,
    reinforcementTotal,
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
        secondary:
          tech.reinforcementTotal > 0
            ? `КД ${tech.kdPercent}% · зал ×${tech.reinforcementTotal}`
            : `КД ${tech.kdPercent}%`,
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
 * @param {(raw: Record<string, unknown>) => string} displayNameFn
 */
export function buildOverallLeaderboardRows(students, allNorms, technicalAtoms, displayNameFn) {
  const items = students.map((raw) => {
    const motor = countMotorQualitySquares(raw.motorQualityWorkLog)
    const medals = countNormMedalsForStudent(raw, allNorms, 'physical')
    const tech = computeTechniqueLeaderboardMetrics(raw, technicalAtoms)
    return { raw, motor, medals, tech }
  })

  const maxMotor = Math.max(1, ...items.map((i) => i.motor.total))
  const maxPhysical = Math.max(1, ...items.map((i) => i.medals.points))
  const maxKd = Math.max(1, ...items.map((i) => i.tech.kdPercent))
  const maxReinforcement = Math.max(1, ...items.map((i) => i.tech.reinforcementTotal))

  const rows = items.map(({ raw, motor, medals, tech }) => {
    const motorNorm = (motor.total / maxMotor) * 100
    const physicalNorm = (medals.points / maxPhysical) * 100
    const kdNorm = (tech.kdPercent / maxKd) * 100 * OVERALL_TECH_KD_WEIGHT
    const practiceNorm =
      (tech.reinforcementTotal / maxReinforcement) * 100 * (1 - OVERALL_TECH_KD_WEIGHT)
    const technicalNorm = kdNorm + practiceNorm
    const combinedScore = Math.round((motorNorm + physicalNorm + technicalNorm) / 3)

    const practiceHint =
      tech.reinforcementTotal > 0 ? ` · зал ×${tech.reinforcementTotal}` : ''

    return {
      id: raw.id,
      name: displayNameFn(raw),
      sortValue: combinedScore * 1000 + tech.kdPercent + Math.min(tech.reinforcementTotal, 999),
      primaryLabel: String(combinedScore),
      primarySuffix: 'сводный',
      secondary: `Т ${tech.kdPercent}%${practiceHint} · Ф ${medals.gold}🥇 · К ${motor.total}`,
      motor,
      medals,
      tech,
      overall: {
        combinedScore,
        kdPercent: tech.kdPercent,
        studiedLabel: `${tech.studiedCount}/${tech.totalAtoms}`,
        motorTotal: motor.total,
        physicalPoints: medals.points,
      },
    }
  })

  rows.sort((a, b) => {
    if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue
    return a.name.localeCompare(b.name, 'ru')
  })

  return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}

/**
 * @param {Array<Record<string, unknown>>} students
 * @param {object[]} allNorms
 * @param {object[]} technicalAtoms
 * @param {LeaderboardCategoryId} categoryId
 * @param {(raw: Record<string, unknown>) => string} displayNameFn
 */
export function buildLeaderboardRows(students, allNorms, technicalAtoms, categoryId, displayNameFn) {
  if (categoryId === 'overall') {
    return buildOverallLeaderboardRows(students, allNorms, technicalAtoms, displayNameFn)
  }

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
