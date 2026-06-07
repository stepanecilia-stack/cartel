/** Подписи разделов для поля lastUpdatedSection на дашборде. */

export const STUDENT_UPDATE_SECTION = {
  profile: 'Антропометрия и КСР',
  normPhysical: 'Норматив · физика',
  technique: 'Техника',
  bulkNorms: 'Сдать норматив',
  groupTraining: 'Групповая тренировка',
  publicShare: 'Публичная ссылка',
  motorQualityWork: 'Двигательные качества',
  competitionPrep: 'Сезон и старты',
  card: 'Карточка ученика',
  studentPortal: 'Кабинет ученика',
}

/**
 * @param {'physical' | 'functional'} category
 * @param {{ testName?: string, testId?: string }} norm
 */
export function normAcceptanceSectionLabel(category, norm) {
  const base = STUDENT_UPDATE_SECTION.normPhysical
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

  if (keys.length === 1 && keys[0] === 'atomReinforcement') {
    return STUDENT_UPDATE_SECTION.groupTraining
  }

  const hasTests = payload.tests && typeof payload.tests === 'object'
  const hasTechniqueOnly =
    (payload.technicalData != null || payload.technicalCombinations != null) &&
    !hasTests &&
    payload.height == null &&
    payload.weight == null &&
    payload.scores == null

  if (keys.length === 1 && keys[0] === 'portalLastActivityAt') {
    return STUDENT_UPDATE_SECTION.studentPortal
  }

  if (
    keys.every((k) =>
      [
        'portalKnowledgeData',
        'portalLastActivityAt',
        'portalConsentAt',
        'portalConsentVersion',
        'portalLastLoginAt',
      ].includes(k),
    ) &&
    payload.portalKnowledgeData != null
  ) {
    return STUDENT_UPDATE_SECTION.studentPortal
  }

  if (hasTechniqueOnly) return STUDENT_UPDATE_SECTION.technique

  if (hasTests) {
    const phys = payload.tests.physical
    const func = payload.tests.functional
    const physKeys = phys && typeof phys === 'object' ? Object.keys(phys).length : 0
    const funcKeys = func && typeof func === 'object' ? Object.keys(func).length : 0
    if (physKeys > 0 || funcKeys > 0) return STUDENT_UPDATE_SECTION.normPhysical
  }

  if (
    payload.plannedCompetitions != null ||
    payload.seasonCalendarCustomized != null ||
    payload.competitionDate != null ||
    payload.competitionTitle != null ||
    payload.seasonGoal != null ||
    payload.nextSeasonGoal != null ||
    payload.ladderClosed != null ||
    payload.seasonTasks != null ||
    payload.seasonTasksSessionsPerWeek != null ||
    payload.seasonBlocks != null ||
    payload.seasonCheckpoints != null ||
    payload.cartelStage != null ||
    payload.cartelEarlyAccess != null ||
    payload.cartelStageNote != null ||
    payload.cartelDocuments != null
  ) {
    return STUDENT_UPDATE_SECTION.competitionPrep
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
