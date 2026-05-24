import {
  CARTEL_DOCUMENT_DEFS,
  countCartelDocumentsComplete,
  isCartelDocumentComplete,
  normalizeCartelDocuments,
} from '../data/cartelDocuments.js'
import {
  CARTEL_FUNCTIONAL_NORMS_NOTE,
  CARTEL_GATES,
  compareCartelStage,
} from '../data/cartelParticipation.js'
import { countNormMedalsForStudent } from './leaderboardMetrics.js'
import { normalizeMotorQualityWorkLog } from './motorQualityWorkLog.js'
import { isOrientirStart } from './plannedCompetitions.js'

/** Вся программа на «Умение» или выше. */
export function isBaseTechniqueReady(metrics) {
  const total = metrics.totalAtoms ?? 0
  if (total <= 0) return false
  return (metrics.atomsAtSkill ?? 0) >= total
}

/** @param {import('../data/cartelParticipation.js').CartelStageId} confirmed */
export function isBaseStageReady(metrics) {
  const g = CARTEL_GATES.base
  return (
    isBaseTechniqueReady(metrics) &&
    (metrics.norms?.passed ?? 0) >= g.normsPassedMin
  )
}

/** Этап «Функционал»: минимум 3 серебра и 1 бронза (+ качества, спецзачёт). Золото — цель, не порог. */
export function isFunctionalStageReady(metrics) {
  const g = CARTEL_GATES.functional
  const n = metrics.norms ?? { silver: 0, bronze: 0 }
  return (
    (n.silver ?? 0) >= g.normsSilverMin &&
    (n.bronze ?? 0) >= g.normsBronzeMin &&
    metrics.motorQualityPasses >= g.motorQualityPassesMin &&
    (!g.requireSpecialPass || metrics.specialPassDone)
  )
}

/** @param {import('./seasonPlan.js').SeasonCheckpoint[]} checkpoints */
export function countDoneCheckpointsByKind(checkpoints, kind) {
  return checkpoints.filter((c) => c.kind === kind && c.done).length
}

/** Спецзачёт по «Плану подготовки» — ручная отметка в сезоне. */
export function hasCartelSpecialPass(checkpoints) {
  return checkpoints.some(
    (c) =>
      c.done &&
      (/спецзач/i.test(c.title) ||
        /план подготовки/i.test(c.title) ||
        /спец\.?\s*зач/i.test(c.title)),
  )
}

/** @param {unknown} workLog */
export function countMotorQualityPasses(workLog) {
  const log = normalizeMotorQualityWorkLog(workLog)
  let n = 0
  for (const list of Object.values(log)) {
    n += list.length
  }
  return n
}

/**
 * @param {{
 *   student?: Record<string, unknown> | null,
 *   allNorms?: object[],
 *   atomsAtSkill?: number,
 *   totalAtoms?: number,
 *   seasonCheckpoints?: import('./seasonPlan.js').SeasonCheckpoint[],
 *   seasonBlocks?: import('./seasonPlan.js').SeasonBlock[],
 *   calendarItems?: import('./plannedCompetitions.js').PlannedCompetition[],
 * }} input
 */
export function buildCartelMetrics(input) {
  const checkpoints = input.seasonCheckpoints ?? []
  const norms =
    input.student && input.allNorms?.length
      ? countNormMedalsForStudent(input.student, input.allNorms, 'physical')
      : { bronze: 0, gold: 0, silver: 0, passed: 0, filled: 0, applicable: 0 }

  const documents = normalizeCartelDocuments(input.student?.cartelDocuments)
  const documentsComplete = countCartelDocumentsComplete(documents)
  const coachStarts = (input.calendarItems ?? []).filter((c) => !isOrientirStart(c) && c.coachEventId)
  const hasCoachStart = coachStarts.length > 0
  const hasPlanBlocks = (input.seasonBlocks ?? []).length > 0

  return {
    norms,
    atomsAtSkill: input.atomsAtSkill ?? 0,
    totalAtoms: input.totalAtoms ?? 0,
    motorQualityPasses: countMotorQualityPasses(input.student?.motorQualityWorkLog),
    specialPassDone: hasCartelSpecialPass(checkpoints),
    sparringDone: countDoneCheckpointsByKind(checkpoints, 'sparring'),
    matchDone: countDoneCheckpointsByKind(checkpoints, 'match'),
    documents,
    documentsComplete,
    documentsTotal: CARTEL_DOCUMENT_DEFS.length,
    hasCoachStart,
    hasPlanBlocks,
  }
}

/**
 * @param {import('../data/cartelParticipation.js').CartelStageId} confirmed
 * @param {ReturnType<typeof buildCartelMetrics>} metrics
 */
export function computeEligibleCartelStage(confirmed, metrics) {
  const g = CARTEL_GATES
  let eligible = /** @type {import('../data/cartelParticipation.js').CartelStageId} */ ('base')

  if (isBaseStageReady(metrics)) {
    eligible = 'functional'
  }

  if (compareCartelStage(eligible, 'functional') >= 0 && isFunctionalStageReady(metrics)) {
    eligible = 'combat'
  }

  if (
    compareCartelStage(eligible, 'combat') >= 0 &&
    metrics.sparringDone >= g.combat.sparringMin &&
    metrics.matchDone >= g.combat.matchMin
  ) {
    eligible = 'documents'
  }

  if (
    compareCartelStage(eligible, 'documents') >= 0 &&
    metrics.documentsComplete >= CARTEL_DOCUMENT_DEFS.length
  ) {
    eligible = 'competition'
  }

  if (compareCartelStage(eligible, confirmed) < 0) {
    return confirmed
  }
  return eligible
}

/**
 * @param {import('../data/cartelParticipation.js').CartelStageId} stage
 * @param {ReturnType<typeof buildCartelMetrics>} metrics
 */
export function checklistForCartelStage(stage, metrics) {
  const g = CARTEL_GATES
  const n = metrics.norms ?? { passed: 0, gold: 0 }

  switch (stage) {
    case 'base': {
      const total = metrics.totalAtoms ?? 0
      const atSkill = metrics.atomsAtSkill ?? 0
      return [
        {
          label: total > 0 ? `${total} приёмов на «Умение»: ${atSkill}/${total}` : 'Вся программа на «Умение»',
          done: isBaseTechniqueReady(metrics),
        },
        {
          label: `Зачёты по нормативам (бронза и выше): ${n.passed ?? 0}/${g.base.normsPassedMin}`,
          done: (n.passed ?? 0) >= g.base.normsPassedMin,
        },
      ]
    }
    case 'functional':
      return [
        {
          label: `Нормативы (минимум): серебро ${n.silver ?? 0}/${g.functional.normsSilverMin}, бронза ${n.bronze ?? 0}/${g.functional.normsBronzeMin} · золото ${n.gold ?? 0} — в приоритете`,
          hint: CARTEL_FUNCTIONAL_NORMS_NOTE,
          done:
            (n.silver ?? 0) >= g.functional.normsSilverMin &&
            (n.bronze ?? 0) >= g.functional.normsBronzeMin,
        },
        {
          label: `Зачёты по качествам: ${metrics.motorQualityPasses}/${g.functional.motorQualityPassesMin}`,
          done: metrics.motorQualityPasses >= g.functional.motorQualityPassesMin,
        },
        {
          label: 'Спецзачёт (План подготовки)',
          done: metrics.specialPassDone,
        },
      ]
    case 'combat':
      return [
        {
          label: `Спарринги: ${metrics.sparringDone}/${g.combat.sparringMin}`,
          done: metrics.sparringDone >= g.combat.sparringMin,
        },
        {
          label: `Матчевые встречи: ${metrics.matchDone}/${g.combat.matchMin}`,
          done: metrics.matchDone >= g.combat.matchMin,
        },
      ]
    case 'documents':
      return CARTEL_DOCUMENT_DEFS.map((def) => ({
        label: def.hint ? `${def.label} (${def.hint})` : def.label,
        done: isCartelDocumentComplete(metrics.documents, def.key),
      }))
    case 'competition':
      return [
        { label: 'Ближайшие старты выбраны на календаре', done: metrics.hasCoachStart },
        {
          label: 'Подготовка по «Плану подготовки» на календаре',
          done: metrics.hasPlanBlocks,
        },
      ]
    default:
      return []
  }
}
