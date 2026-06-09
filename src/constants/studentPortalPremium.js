/** @typedef {'program' | 'competition'} PortalPremiumGymSectionId */

/** Разделы зала, доступные только в платной версии кабинета. */
export const GYM_HUB_PREMIUM_SECTIONS = /** @type {const} */ (['program', 'competition'])

/**
 * @param {unknown} sectionId
 * @returns {sectionId is PortalPremiumGymSectionId}
 */
export function isGymHubPremiumSection(sectionId) {
  return GYM_HUB_PREMIUM_SECTIONS.includes(sectionId)
}

/**
 * @param {object | null | undefined} student
 */
export function isPortalPremiumActive(student) {
  return Boolean(student?.portalPremiumAt)
}

/** @param {PortalPremiumGymSectionId} sectionId */
export function gymHubPremiumSectionTitle(sectionId) {
  if (sectionId === 'program') return 'Индивидуальная тренировочная программа'
  return 'Подготовка к соревнованиям'
}
