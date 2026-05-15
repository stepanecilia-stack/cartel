/**
 * Справочник сенситивных периодов (13 качеств; рост не включён — на него не влияем).
 * Границы — возраст от даты рождения: { years, months } включительно.
 * Меняйте только этот файл, чтобы обновить окна в таймере.
 */

/** @typedef {{ years: number, months: number }} AgePoint */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   start: AgePoint,
 *   end: AgePoint,
 * }} SensitivePeriodDefinition
 */

/** @type {SensitivePeriodDefinition[]} */
export const SENSITIVE_PERIOD_CATALOG = [
  { id: 'ravnovesie', title: 'Равновесие', start: { years: 7, months: 0 }, end: { years: 14, months: 11 } },
  { id: 'tochnost', title: 'Точность', start: { years: 7, months: 0 }, end: { years: 16, months: 11 } },
  { id: 'gibkost', title: 'Гибкость', start: { years: 7, months: 0 }, end: { years: 14, months: 11 } },
  {
    id: 'vyinoslivost',
    title: 'Выносливость (аэробные возможности)',
    start: { years: 8, months: 0 },
    end: { years: 18, months: 11 },
  },
  {
    id: 'koordinaciya',
    title: 'Координационные способности',
    start: { years: 8, months: 0 },
    end: { years: 16, months: 11 },
  },
  { id: 'bystrota', title: 'Быстрота', start: { years: 9, months: 0 }, end: { years: 14, months: 11 } },
  {
    id: 'anaerob',
    title: 'Анаэробные возможности',
    start: { years: 9, months: 0 },
    end: { years: 18, months: 11 },
  },
  { id: 'myshechnaya-massa', title: 'Мышечная масса', start: { years: 11, months: 0 }, end: { years: 15, months: 11 } },
  {
    id: 'skorostno-silovye',
    title: 'Скоростно-силовые качества',
    start: { years: 11, months: 0 },
    end: { years: 15, months: 11 },
  },
  { id: 'sila', title: 'Сила', start: { years: 12, months: 0 }, end: { years: 18, months: 11 } },
  { id: 'skorostnaya-sila', title: 'Скоростная сила', start: { years: 13, months: 0 }, end: { years: 18, months: 11 } },
  { id: 'staticheskaya-sila', title: 'Статическая сила', start: { years: 14, months: 0 }, end: { years: 18, months: 11 } },
  { id: 'dinamicheskaya-sila', title: 'Динамическая сила', start: { years: 14, months: 0 }, end: { years: 18, months: 11 } },
]
