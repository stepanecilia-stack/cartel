import { normalizePortalPersonaId } from '../constants/studentPortalPersonas.js'

/** Универсальная сцена зоны сдачи нормативов (секундомер и блокнот на табурете). */
export const STUDENT_PORTAL_NORMS = {
  stationSceneSrc: '/student-portal/gym-norms-station.png',
}

/** @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId */
export function buildPortalNormsStationCaption(personaId) {
  const id = normalizePortalPersonaId(personaId)
  if (id === 'vasily') {
    return 'Зона зачёта. Секундомер и блокнот — всё по-честному. Готовься показать цифру.'
  }
  if (id === 'gleb') {
    return 'Контрольная зона. Фиксирую время и результат по протоколу — без догадок.'
  }
  return 'Здесь сдаём нормативы. Запишу результат — спокойно, шаг за шагом.'
}
