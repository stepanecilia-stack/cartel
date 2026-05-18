/** Подписи разделов для поля lastUpdatedSection на дашборде. */

export const STUDENT_UPDATE_SECTION = {
  profile: 'Антропометрия и КСР',
  normPhysical: 'Норматив · физика',
  normFunctional: 'Норматив · функционал',
  technique: 'Техника',
  bulkNorms: 'Сдать норматив',
  groupTraining: 'Групповая тренировка',
  publicShare: 'Публичная ссылка',
  motorQualityWork: 'Двигательные качества',
  card: 'Карточка ученика',
}

/**
 * @param {'physical' | 'functional'} category
 * @param {{ testName?: string, testId?: string }} norm
 */
export function normAcceptanceSectionLabel(category, norm) {
  const base = category === 'physical' ? STUDENT_UPDATE_SECTION.normPhysical : STUDENT_UPDATE_SECTION.normFunctional
  const name = typeof norm?.testName === 'string' ? norm.testName.trim() : ''
  return name ? `${base}: ${name}` : base
}

/**
 * @param {object} payload
 * @returns {string}
 */
export function inferUpdateSectionFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return STUDENT_UPDATE_SECTION.card

  const keys = Object.keys(payload)
  if (keys.length === 0) return STUDENT_UPDATE_SECTION.card

  if (keys.length === 1 && keys[0] === 'progressShareToken') {
    return STUDENT_UPDATE_SECTION.publicShare
  }

  const hasTests = payload.tests && typeof payload.tests === 'object'
  const hasTechniqueOnly =
    (payload.technicalData != null || payload.technicalCombinations != null) &&
    !hasTests &&
    payload.height == null &&
    payload.weight == null &&
    payload.scores == null

  if (hasTechniqueOnly) return STUDENT_UPDATE_SECTION.technique

  if (hasTests) {
    const phys = payload.tests.physical
    const func = payload.tests.functional
    const physKeys = phys && typeof phys === 'object' ? Object.keys(phys).length : 0
    const funcKeys = func && typeof func === 'object' ? Object.keys(func).length : 0
    if (physKeys > 0 && funcKeys === 0) return STUDENT_UPDATE_SECTION.normPhysical
    if (funcKeys > 0 && physKeys === 0) return STUDENT_UPDATE_SECTION.normFunctional
    if (physKeys > 0 || funcKeys > 0) return 'Нормативы'
  }

  if (
    payload.height != null ||
    payload.weight != null ||
    payload.reach != null ||
    payload.birthYear != null ||
    payload.birthDate != null ||
    payload.scores != null ||
    payload.effectiveKSR != null
  ) {
    return STUDENT_UPDATE_SECTION.profile
  }

  if (payload.technicalData != null || payload.technicalCombinations != null) {
    return STUDENT_UPDATE_SECTION.technique
  }

  return STUDENT_UPDATE_SECTION.card
}
