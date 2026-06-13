import {
  normalizePortalKnowledgeData,
  STUDENT_PORTAL_LEVEL,
} from './portalKnowledgeData.js'
import {
  isTechnicalLevelUnlockedForNext,
  normalizeStudentTechnicalData,
  rankTechnicalLevel,
  TECH_LEVEL_RANK,
} from './technicalProgramProgress.js'

/**
 * Для интерфейса тренера: technicalData + «Знание» из кабинета ученика.
 * Уровни тренера (Умение и выше) важнее; кабинет заполняет пробелы до «Знания».
 */
export function mergeCoachTechnicalWithPortalKnowledge(technicalData, portalKnowledgeData) {
  const tech = normalizeStudentTechnicalData(technicalData)
  const portal = normalizePortalKnowledgeData(portalKnowledgeData)
  const out = { ...tech }

  for (const [atomId, portalRow] of Object.entries(portal)) {
    if (portalRow?.level !== STUDENT_PORTAL_LEVEL) continue
    const techRank = rankTechnicalLevel(tech[atomId]?.level)
    if (techRank < TECH_LEVEL_RANK.KNOWLEDGE) {
      out[atomId] = { ...(out[atomId] ?? {}), level: 'KNOWLEDGE' }
    }
  }

  return out
}

/** Атом отмечен в кабинете, но тренер ещё не выставил уровень в карточке. */
export function isPortalOnlyKnowledgeAtom(technicalData, portalKnowledgeData, atomId) {
  if (!atomId) return false
  const tech = normalizeStudentTechnicalData(technicalData)
  const portal = normalizePortalKnowledgeData(portalKnowledgeData)
  if (portal[atomId]?.level !== STUDENT_PORTAL_LEVEL) return false
  return rankTechnicalLevel(tech[atomId]?.level) < TECH_LEVEL_RANK.KNOWLEDGE
}

/**
 * Блокировки по программе: «Умение»+ у тренера или «Знание» из кабинета открывает следующий шаг.
 */
export function buildCoachTechnicalLocksById(orderedAtoms, technicalData, portalKnowledgeData) {
  const portal = normalizePortalKnowledgeData(portalKnowledgeData)
  const locks = {}
  let previousUnlocked = true

  for (const atom of orderedAtoms) {
    if (!atom?.id) continue
    locks[atom.id] = !previousUnlocked

    const coachLevel = normalizeStudentTechnicalData(technicalData)[atom.id]?.level
    const portalKnowledge = portal[atom.id]?.level === STUDENT_PORTAL_LEVEL
    const completesStep = isTechnicalLevelUnlockedForNext(coachLevel) || portalKnowledge
    previousUnlocked = previousUnlocked && completesStep
  }

  return locks
}
