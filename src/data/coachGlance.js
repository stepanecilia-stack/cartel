/**
 * Короткие формулировки для тренера (вид «сверху», без простыней текста).
 * @typedef {{ doing: string, leading: string, check?: string }} CoachGlanceLine
 */

/** @type {Record<string, CoachGlanceLine>} */
export const COACH_MICRO_GLANCE = {
  ofp: {
    doing: 'ОФП · школа · снаряды',
    leading: 'База и объём',
    check: '4×2:15 — техника держится',
  },
  sfp: {
    doing: 'Отрезки · снаряды быстро',
    leading: 'Выносливость к бою',
    check: '3 цикла — темп не падает',
  },
  sttm: {
    doing: 'Спарринги · СТТМ · тактика',
    leading: 'Боевая форма',
    check: 'План боя выполняется',
  },
  taper: {
    doing: 'Коротко · сон · тень',
    leading: 'Свежесть к старту',
    check: 'Лёгкие ноги',
  },
  preFight: {
    doing: 'Активация · вес',
    leading: 'Собранность',
    check: 'Готов к регламенту',
  },
  fight: {
    doing: 'Разминка · план боя',
    leading: 'Старт',
    check: 'Разбор после боя',
  },
  transition: {
    doing: 'Лёгко · кросс · тень',
    leading: 'Восстановление',
    check: 'Готов к след. этапу',
  },
}

/** @type {Record<string, CoachGlanceLine>} */
export const COACH_MACRO_GLANCE = {
  gap: { doing: 'Разбор боёв', leading: 'План к отбору', check: '3 слабых места' },
  base: { doing: 'Школа · ОФП · снаряды', leading: 'Фундамент', check: 'Спарринг без обвала' },
  special: { doing: 'Отрезки · СТТМ', leading: 'Боевая выносливость', check: 'Темп держит' },
  'fight-ready': { doing: 'Спарринги · тактика', leading: 'Готовность к отбору', check: 'План в бою' },
  taper: { doing: 'Коротко · режим', leading: 'Пик к дате', check: 'Свежесть' },
  between: { doing: 'Техника · опыт', leading: 'К след. старту', check: 'Старт в фокусе' },
  open: { doing: 'База · нормативы', leading: 'Добавить старт', check: 'Дата в календаре' },
}

/** @param {string | null | undefined} phaseId @param {boolean} [isTransition] */
export function getMicroGlance(phaseId, isTransition = false) {
  if (isTransition) return COACH_MICRO_GLANCE.transition
  return COACH_MICRO_GLANCE[phaseId] ?? COACH_MICRO_GLANCE.ofp
}

/** @param {string | null | undefined} stageId */
export function getMacroGlance(stageId) {
  const key = stageId?.replace(/^micro-/, '') ?? 'open'
  return COACH_MACRO_GLANCE[key] ?? COACH_MACRO_GLANCE.open
}

/** @param {string[]} items @param {number} [max] */
export function summarizeTrainingLine(items, max = 3) {
  if (!items?.length) return '—'
  const slice = items.slice(0, max)
  let line = slice.join(' · ')
  if (items.length > max) line += ' …'
  if (line.length > 72) return `${line.slice(0, 69)}…`
  return line
}

/** @param {Array<{ label: string, items: string[] }>} slots */
export function summarizeDaySlots(slots) {
  if (!slots?.length) return []
  return slots.map((s) => ({
    id: s.id,
    label: s.label,
    line: summarizeTrainingLine(s.items, 4),
  }))
}
