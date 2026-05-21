/**
 * Методическая база вкладки «Старт» в Cartel.
 * Симбиоз: годичный цикл (Филимонов В.И., Степанец И.В.) + рабочий план УТС / комплексы.
 */

export const CARTEL_PREP_AUTHORS = 'Филимонов В.И., Степанец И.В.'

export const CARTEL_PREP_METHODOLOGY = {
  title: 'Подготовка к старту',
  subtitle: 'Сжатый предсоревновательный цикл для юниоров 13–16 лет',
  authors: CARTEL_PREP_AUTHORS,
  sources: [
    'Альманах: спортивная подготовка квалифицированных боксёров-юношей в годичном цикле',
    'Рабочий план подготовки сборной (УТС, комплексы 1–11)',
    'Бокс. Теория и практика (Филимонов В.И., 2021)',
  ],
  principles: [
    'Две тренировки в день (утро + день), раунд 2:15 для 13–16',
    'ОФП → СФП → СТТМ по мере приближения к старту; объём ОФП ↓, спец. работа ↑',
    'Переходные дни для восстановления (аналог переходной недели)',
    'За 2–7 дней до боя — снижение интенсивности (подводка / предстарт)',
  ],
}

/**
 * Соответствие этапов Cartel (дни до боя) ↔ блоку из Альманаха (недели).
 * @type {Array<{ cartelId: string, cartelLabel: string, days: string, almanac: string, planRef: string }>}
 */
export const CARTEL_PREP_PHASE_MAP = [
  {
    cartelId: 'ofp',
    cartelLabel: 'ОФП',
    days: '21+',
    almanac: '1 этап предсоревновательной подготовки (≥2 нед.)',
    planRef: 'Втягивающий микроцикл: кросс, школа бокса, вход на снаряды',
  },
  {
    cartelId: 'sfp',
    cartelLabel: 'СФП',
    days: '14–20',
    almanac: '2 этап (2–3 нед.) + соревновательные отрезки',
    planRef: 'Базовый объём: комплексы 2, 5, 8 — ускорения на снарядах',
  },
  {
    cartelId: 'sttm',
    cartelLabel: 'СТТМ',
    days: '7–13',
    almanac: '3 этап (2–3 нед.) — пик формы',
    planRef: 'СТТМ, спарринги, тактика, комплексы 9–10',
  },
  {
    cartelId: 'taper',
    cartelLabel: 'Подводка',
    days: '4–6',
    almanac: 'Снижение объёма и интенсивности',
    planRef: 'Разгрузка, сауна, короткие раунды',
  },
  {
    cartelId: 'preFight',
    cartelLabel: 'Предстарт',
    days: '1–3',
    almanac: '2–7 дней до соревнований',
    planRef: 'Комплекс 11: скорость, без объёма',
  },
  {
    cartelId: 'fight',
    cartelLabel: 'Бой',
    days: '0',
    almanac: 'День старта',
    planRef: 'Активация по регламенту',
  },
]

/** Границы этапов (дни до боя, включительно снизу для перехода). */
export const PREP_PHASE_BOUNDARY_DAYS = [21, 14, 7, 4, 1, 0]

/**
 * Переходный день (аналог переходной недели Альманаха): граница этапов или 7-й день микроцикла.
 * @param {number} daysUntilOnDay
 * @param {number} dayIndex — 0 = сегодня в ленте
 */
export function isPrepTransitionDay(daysUntilOnDay, dayIndex) {
  if (PREP_PHASE_BOUNDARY_DAYS.includes(daysUntilOnDay)) return true
  return dayIndex > 0 && dayIndex % 7 === 6
}
