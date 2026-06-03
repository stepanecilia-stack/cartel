import { dominanceRank, normalizeTechnicalDominanceKey } from './ksrUtils.js'
import { normalizeStudentTechnicalData } from './technicalProgramProgress.js'

export const STUDENT_PORTAL_LEVEL = 'KNOWLEDGE'
const MIN_RANK = dominanceRank(STUDENT_PORTAL_LEVEL)

/**
 * Сколько первых атомов подряд уже на «Знание» или выше (в т.ч. уровень тренера).
 */
export function countLeadingKnowledgeAtoms(orderedAtoms, technicalData) {
  const data = normalizeStudentTechnicalData(technicalData)
  if (!Array.isArray(orderedAtoms) || orderedAtoms.length === 0) return 0
  let count = 0
  for (const atom of orderedAtoms) {
    const rank = dominanceRank(data[atom?.id]?.level)
    if (rank >= MIN_RANK) count += 1
    else break
  }
  return count
}

export function countAtomsAtKnowledgeOrAbove(orderedAtoms, technicalData) {
  const data = normalizeStudentTechnicalData(technicalData)
  if (!Array.isArray(orderedAtoms)) return 0
  let n = 0
  for (const atom of orderedAtoms) {
    if (atom?.id && dominanceRank(data[atom.id]?.level) >= MIN_RANK) n += 1
  }
  return n
}

export function isTierCompleteForStudentPortal(orderedAtoms, technicalData) {
  const total = orderedAtoms?.length ?? 0
  if (total === 0) return true
  return countAtomsAtKnowledgeOrAbove(orderedAtoms, technicalData) >= total
}

/** Индекс текущего шага: первый не на «Знание»+ в цепочке. */
export function resolveStudentPortalFocusIndex(orderedAtoms, technicalData) {
  const passed = countLeadingKnowledgeAtoms(orderedAtoms, technicalData)
  const total = orderedAtoms?.length ?? 0
  if (passed >= total) return Math.max(0, total - 1)
  return passed
}

export function canStudentMarkKnowledge(orderedAtoms, technicalData, atomId) {
  const idx = orderedAtoms.findIndex((a) => a.id === atomId)
  if (idx < 0) return false
  const focusIdx = resolveStudentPortalFocusIndex(orderedAtoms, technicalData)
  if (idx !== focusIdx) return false
  const data = normalizeStudentTechnicalData(technicalData)
  const rank = dominanceRank(data[atomId]?.level)
  return rank < MIN_RANK
}

/**
 * Отметить текущий атом «Знание» (не понижает уровни тренера выше «Знание»).
 */
export function applyStudentKnowledgeMark(technicalData, atomId, orderedAtoms) {
  if (!canStudentMarkKnowledge(orderedAtoms, technicalData, atomId)) {
    return { ok: false, next: normalizeStudentTechnicalData(technicalData) }
  }
  const data = normalizeStudentTechnicalData(technicalData)
  const prev = data[atomId] ?? {}
  const rank = dominanceRank(prev.level)
  const level = rank >= MIN_RANK ? normalizeTechnicalDominanceKey(prev.level) : STUDENT_PORTAL_LEVEL
  return {
    ok: true,
    next: {
      ...data,
      [atomId]: { ...prev, level },
    },
  }
}
