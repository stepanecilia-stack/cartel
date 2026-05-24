import {
  calculateEffectiveKSR,
  calculateKD,
  calculateKsrAndKsp,
  calculateLegacySectionScores,
  countProgramAtomsAtOrAboveSkill,
  getWeights,
  normalizeTechnicalDominanceKey,
} from './ksrUtils.js'
import { studentAthleteShape } from './studentModel.js'
import {
  buildBaseCartelProgramAtoms,
  buildFullTechnicalProgramAtoms,
  mergeWithRequiredLevel3Combinations,
} from './techniqueCatalog.js'

/**
 * Нормализация technicalData к виду, который ждёт Firestore.
 * Совпадает по поведению с emptyTechnicalRecord в StudentPage.
 */
export function normalizeTechnicalDataForSave(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue
    out[key] = { ...value, level: normalizeTechnicalDominanceKey(value.level) }
  }
  return out
}

/**
 * Сколько первых атомов программы (в каноническом порядке) уже на «Умение»+.
 * Используется для стартового положения ползунка прогресса по программе.
 */
/** Все 29 элементов базы Cartel (ур.1 + ур.2 + 2 комбо) на «Умение» или выше. */
export function isBaseCartelProgramComplete(level1Atoms, technicalData) {
  const atoms = buildBaseCartelProgramAtoms(level1Atoms)
  const { count, total } = countProgramAtomsAtOrAboveSkill(atoms, technicalData)
  return total > 0 && count >= total
}

/** @deprecated используйте isBaseCartelProgramComplete */
export function isLevel1BaseProgramComplete(level1Atoms, technicalData) {
  return isBaseCartelProgramComplete(level1Atoms, technicalData)
}

export function countLeadingMasteredAtoms(orderedAtoms, technicalData) {
  if (!Array.isArray(orderedAtoms) || orderedAtoms.length === 0) return 0
  const data = technicalData && typeof technicalData === 'object' ? technicalData : {}
  let count = 0
  for (const atom of orderedAtoms) {
    const level = normalizeTechnicalDominanceKey(data[atom?.id]?.level)
    if (
      level === 'MOTOR_SKILL_LEVEL_1' ||
      level === 'MOTOR_SKILL_LEVEL_2' ||
      level === 'AUTOMATED'
    ) {
      count += 1
    } else {
      break
    }
  }
  return count
}

const PROGRESS_TARGET_LEVEL = 'MOTOR_SKILL_LEVEL_1'
const PROGRESS_TARGET_RANK = 2

const RANK = {
  NOT_LEARNED: 0,
  KNOWLEDGE: 1,
  MOTOR_SKILL_LEVEL_1: 2,
  MOTOR_SKILL_LEVEL_2: 3,
  AUTOMATED: 4,
}

/**
 * Применяет ползунок прогресса к technicalData: первые sliderValue атомов будут на «Умение»+
 * (более высокие уровни сохраняются), остальные — «Не изучен».
 *
 * Внимание: уровни выше «Умение» в правой части ползунка сбрасываются к «Не изучен» —
 * это компромисс ради простой и предсказуемой связи «позиция = граница освоения».
 */
export function applyProgressSliderToTechnicalData(orderedAtoms, existingTechnicalData, sliderValue) {
  const data = normalizeTechnicalDataForSave(existingTechnicalData)
  const next = { ...data }
  const total = Array.isArray(orderedAtoms) ? orderedAtoms.length : 0
  const value = Math.min(Math.max(Number(sliderValue) || 0, 0), total)
  for (let i = 0; i < total; i += 1) {
    const atom = orderedAtoms[i]
    if (!atom?.id) continue
    const current = next[atom.id] ?? {}
    const currentLevel = normalizeTechnicalDominanceKey(current.level)
    const currentRank = RANK[currentLevel] ?? 0
    if (i < value) {
      const nextLevel = currentRank >= PROGRESS_TARGET_RANK ? currentLevel : PROGRESS_TARGET_LEVEL
      next[atom.id] = { ...current, level: nextLevel }
    } else {
      next[atom.id] = { ...current, level: 'NOT_LEARNED' }
    }
  }
  return next
}

/**
 * Собирает Firestore-патч: technicalData + пересчитанные технические производные (баллы, КД, KSR).
 * Антропометрия, физика и функционал берутся из загруженной карточки ученика без изменений.
 */
export function buildTechnicalOnlyUpdatePayload(student, technicalAtoms, newTechnicalData) {
  const shape = studentAthleteShape(student)
  const tests = student?.tests && typeof student.tests === 'object' ? student.tests : {}
  const physicalResults = tests.physical && typeof tests.physical === 'object' ? tests.physical : {}
  const functionalResults = tests.functional && typeof tests.functional === 'object' ? tests.functional : {}
  const technicalNormalized = normalizeTechnicalDataForSave(newTechnicalData)
  const combos = mergeWithRequiredLevel3Combinations(student?.technicalCombinations)
  const programAtoms = buildFullTechnicalProgramAtoms(technicalAtoms, combos)

  const baseScores = calculateLegacySectionScores({
    physicalNorms: [],
    functionalNorms: [],
    physicalResults,
    functionalResults,
    technicalData: technicalNormalized,
    technicalProgramAtoms: programAtoms,
  })
  const prevScores = student?.scores && typeof student.scores === 'object' ? student.scores : {}
  const scores = {
    техника: baseScores.техника,
    физика: Number(prevScores.физика ?? 0) || 0,
    функционал: Number(prevScores.функционал ?? 0) || 0,
  }

  const w = getWeights(shape)
  const kspBundle = calculateKsrAndKsp(shape, scores)
  const kdStats = calculateKD(programAtoms, technicalNormalized)
  const effective = calculateEffectiveKSR(kspBundle.baseKSR, kdStats.kd)
  const technicalScore = scores.техника / 100

  return {
    technicalData: technicalNormalized,
    scores,
    archetype: w.archetype,
    archetypeSmart: w.archetypeSmart,
    archetypeFull: w.archetypeFull ?? null,
    apeIndex: w.apeIndex,
    baseKSR: kspBundle.baseKSR,
    ksp: kspBundle.ksp,
    kspZ: kspBundle.kspZ,
    kspH: kspBundle.kspH,
    kspIdealHeight: kspBundle.kspIdealHeight ?? null,
    technicalScore,
    trainingProgress: kspBundle.trainingProgress,
    kd: kdStats.kd,
    kdAtomCount: kdStats.atomCount,
    kdAutomationPercent: kdStats.automationPercent,
    effectiveKSR: effective,
  }
}
