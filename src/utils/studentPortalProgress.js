import { normalizePortalKnowledgeData, STUDENT_PORTAL_LEVEL } from './portalKnowledgeData.js'

export { STUDENT_PORTAL_LEVEL }

/**
 * Сколько первых атомов подряд отмечено «Знание» в кабинете ученика.
 */
export function countLeadingPortalKnowledgeAtoms(orderedAtoms, portalKnowledgeData) {
  const data = normalizePortalKnowledgeData(portalKnowledgeData)
  if (!Array.isArray(orderedAtoms) || orderedAtoms.length === 0) return 0
  let count = 0
  for (const atom of orderedAtoms) {
    if (data[atom?.id]?.level === STUDENT_PORTAL_LEVEL) count += 1
    else break
  }
  return count
}

export function countPortalKnowledgeAtoms(orderedAtoms, portalKnowledgeData) {
  const data = normalizePortalKnowledgeData(portalKnowledgeData)
  if (!Array.isArray(orderedAtoms)) return 0
  let n = 0
  for (const atom of orderedAtoms) {
    if (atom?.id && data[atom.id]?.level === STUDENT_PORTAL_LEVEL) n += 1
  }
  return n
}

export function hasStudentPortalKnowledgeProgress(orderedL1, orderedL2, orderedL3, portalKnowledgeData) {
  for (const list of [orderedL1, orderedL2, orderedL3]) {
    if (countPortalKnowledgeAtoms(list, portalKnowledgeData) > 0) return true
  }
  return false
}

/** На каком этапе программы продолжать самостоятельное обучение. */
export function resolveStudentPortalResumeTier(orderedL1, orderedL2, orderedL3, portalKnowledgeData) {
  if (orderedL1.length > 0 && !isTierCompleteForStudentPortal(orderedL1, portalKnowledgeData)) return 1
  if (orderedL2.length > 0 && !isTierCompleteForStudentPortal(orderedL2, portalKnowledgeData)) return 2
  if (orderedL3.length > 0) return 3
  if (orderedL2.length > 0) return 2
  return 1
}

export function isTierCompleteForStudentPortal(orderedAtoms, portalKnowledgeData) {
  const total = orderedAtoms?.length ?? 0
  if (total === 0) return true
  return countPortalKnowledgeAtoms(orderedAtoms, portalKnowledgeData) >= total
}

/** Индекс текущего шага: первый не отмеченный в кабинете. */
export function resolveStudentPortalFocusIndex(orderedAtoms, portalKnowledgeData) {
  const passed = countLeadingPortalKnowledgeAtoms(orderedAtoms, portalKnowledgeData)
  const total = orderedAtoms?.length ?? 0
  if (passed >= total) return Math.max(0, total - 1)
  return passed
}

/** До какого индекса можно листать (включая пройденные для повторения). */
export function resolveStudentPortalBrowseMaxIndex(orderedAtoms, portalKnowledgeData) {
  const total = orderedAtoms?.length ?? 0
  if (total === 0) return 0
  if (isTierCompleteForStudentPortal(orderedAtoms, portalKnowledgeData)) {
    return total - 1
  }
  return resolveStudentPortalFocusIndex(orderedAtoms, portalKnowledgeData)
}

export function isAtomMarkedKnowledge(portalKnowledgeData, atomId) {
  const data = normalizePortalKnowledgeData(portalKnowledgeData)
  return data[atomId]?.level === STUDENT_PORTAL_LEVEL
}

export function canStudentMarkKnowledge(orderedAtoms, portalKnowledgeData, atomId) {
  const idx = orderedAtoms.findIndex((a) => a.id === atomId)
  if (idx < 0) return false
  const focusIdx = resolveStudentPortalFocusIndex(orderedAtoms, portalKnowledgeData)
  if (idx !== focusIdx) return false
  return !isAtomMarkedKnowledge(portalKnowledgeData, atomId)
}

/** Отметить текущий атом «Знание» в ветке самостоятельного обучения. */
export function applyStudentKnowledgeMark(portalKnowledgeData, atomId, orderedAtoms) {
  if (!canStudentMarkKnowledge(orderedAtoms, portalKnowledgeData, atomId)) {
    return { ok: false, next: normalizePortalKnowledgeData(portalKnowledgeData) }
  }
  const data = normalizePortalKnowledgeData(portalKnowledgeData)
  return {
    ok: true,
    next: {
      ...data,
      [atomId]: { level: STUDENT_PORTAL_LEVEL },
    },
  }
}

/** Сводка для панели тренера. */
export function summarizeStudentPortalProgress(orderedL1, orderedL2, orderedL3, portalKnowledgeData) {
  const tiers = [
    { id: 1, label: 'Программа', atoms: orderedL1 },
    { id: 2, label: 'Ур. 2', atoms: orderedL2 },
    { id: 3, label: 'Комбо', atoms: orderedL3 },
  ].filter((t) => t.atoms.length > 0)

  const items = tiers.map((t) => ({
    ...t,
    done: countPortalKnowledgeAtoms(t.atoms, portalKnowledgeData),
    total: t.atoms.length,
    complete: isTierCompleteForStudentPortal(t.atoms, portalKnowledgeData),
  }))

  const started = hasStudentPortalKnowledgeProgress(orderedL1, orderedL2, orderedL3, portalKnowledgeData)
  const activeTier = resolveStudentPortalResumeTier(orderedL1, orderedL2, orderedL3, portalKnowledgeData)
  const activeAtoms = activeTier === 3 ? orderedL3 : activeTier === 2 ? orderedL2 : orderedL1
  const focusIndex = resolveStudentPortalFocusIndex(activeAtoms, portalKnowledgeData)
  const focusAtom = activeAtoms[focusIndex] ?? null

  return { started, items, activeTier, focusAtom }
}

// Совместимость со старыми импортами (теперь только portalKnowledgeData).
export const countLeadingKnowledgeAtoms = countLeadingPortalKnowledgeAtoms
export const countAtomsAtKnowledgeOrAbove = countPortalKnowledgeAtoms
