import {
  buildNormAcceptanceHistoryEntry,
  mergeNormAcceptanceHistory,
} from './normAcceptanceHistory.js'
import {
  calculateEffectiveKSR,
  calculateKD,
  calculateKsrAndKsp,
  calculateLegacySectionScores,
  getNormsForAthlete,
  getWeights,
} from './ksrUtils.js'
import { emptyTestsRecord, getNormValueByTestId } from './normTestsStorage.js'
import { formatBirthYearRu, studentAthleteShape } from './studentModel.js'
import { normalizeTechnicalDataForSave } from './studentTechnicalUpdate.js'
import {
  buildFullTechnicalProgramAtoms,
  mergeWithRequiredLevel3Combinations,
  normalizeTechnicalCombinations,
} from './techniqueCatalog.js'

/**
 * Принять норматив: обновить bucket и историю принятия.
 */
export function mergeNormAcceptanceIntoTests({
  testsBucket,
  serverRow,
  norm,
  category,
  evaluated,
  coachId,
  coachName,
}) {
  const entry = buildNormAcceptanceHistoryEntry({
    norm,
    category,
    coachId,
    coachName,
    evaluated: {
      result: evaluated.result,
      resultRaw: evaluated.resultRaw,
      normalizedScore: evaluated.normalizedScore,
      status: evaluated.status,
    },
  })
  return {
    ...evaluated,
    acceptedAt: entry.recordedAt,
    acceptedByCoachId: coachId,
    acceptedByCoachName: coachName,
    acceptanceHistory: mergeNormAcceptanceHistory(serverRow?.acceptanceHistory, entry),
  }
}

/**
 * Пересчёт scores / KSR после обновления нормативов (остальные поля карточки без изменений).
 */
export function buildStudentTestsUpdatePayload({
  student,
  allNorms,
  technicalAtoms,
  physicalMerged,
  functionalMerged,
}) {
  const shape = studentAthleteShape(student)
  const physicalNorms = getNormsForAthlete(allNorms, shape, 'physical')
  const functionalNorms = getNormsForAthlete(allNorms, shape, 'functional')
  const technicalData = normalizeTechnicalDataForSave(student?.technicalData)
  const combinations = normalizeTechnicalCombinations(
    mergeWithRequiredLevel3Combinations(student?.technicalCombinations),
  )
  const programAtoms = buildFullTechnicalProgramAtoms(technicalAtoms, combinations)

  const nextScores = calculateLegacySectionScores({
    physicalNorms,
    functionalNorms,
    physicalResults: physicalMerged,
    functionalResults: functionalMerged,
    technicalData,
    technicalProgramAtoms: programAtoms,
  })

  const w = getWeights(shape)
  const kspBundle = calculateKsrAndKsp(shape, nextScores)
  const kdStats = calculateKD(programAtoms, technicalData)
  const effective = calculateEffectiveKSR(kspBundle.baseKSR, kdStats.kd)
  const technicalScore = nextScores.техника / 100
  const birthYear = shape.birthYear

  return {
    tests: {
      physical: physicalMerged,
      functional: functionalMerged,
    },
    scores: nextScores,
    archetype: w.archetype,
    archetypeSmart: w.archetypeSmart,
    archetypeFull: w.archetypeFull ?? null,
    apeIndex: w.apeIndex,
    baseKSR: kspBundle.baseKSR,
    ksp: kspBundle.ksp,
    kspZ: kspBundle.kspZ,
    kspH: kspBundle.kspH,
    kspIdealHeight: kspBundle.kspIdealHeight ?? null,
    birthYear,
    birthYearLabel: formatBirthYearRu(birthYear),
    technicalScore,
    trainingProgress: kspBundle.trainingProgress,
    kd: kdStats.kd,
    kdAtomCount: kdStats.atomCount,
    kdAutomationPercent: kdStats.automationPercent,
    effectiveKSR: effective,
  }
}

/** Слить сохранённые тесты ученика с облака и локальным черновиком. */
export function mergeStudentTestBuckets(student, physicalDraft, functionalDraft) {
  const tests = student?.tests && typeof student.tests === 'object' ? student.tests : {}
  return {
    physical: {
      ...emptyTestsRecord(tests.physical),
      ...emptyTestsRecord(physicalDraft),
    },
    functional: {
      ...emptyTestsRecord(tests.functional),
      ...emptyTestsRecord(functionalDraft),
    },
  }
}

export function getStoredNormRow(student, category, testId) {
  const tests = student?.tests && typeof student.tests === 'object' ? student.tests : {}
  const bucket = category === 'physical' ? tests.physical : tests.functional
  return getNormValueByTestId(emptyTestsRecord(bucket), testId)
}
