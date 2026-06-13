import { displayNameFromStudent, studentIdentityFieldsFromStudent } from './studentModel.js'
import { formatWeekRangeLabel, nextCalendarWeek } from './studentTrainingWeekPlan.js'

/**
 * @typedef {'training_frequency' | 'wellbeing' | 'custom'} CoachBridgeRequestType
 */

/**
 * @param {object} student
 */
function studentFirstName(student) {
  const { firstName } = studentIdentityFieldsFromStudent(student)
  if (firstName) return firstName
  const display = displayNameFromStudent(student)
  return display.split(/\s+/).filter(Boolean)[0] || 'друг'
}

/**
 * @param {object} student
 * @param {CoachBridgeRequestType} type
 */
export function buildCoachBridgeRequestMessage(student, type) {
  const first = studentFirstName(student)
  if (type === 'training_frequency') {
    const week = nextCalendarWeek()
    const range = formatWeekRangeLabel(week.weekStartISO, week.weekEndISO)
    return {
      type,
      text: `${first}, привет! Отметь в календаре дни, когда будешь на тренировках на следующей неделе (${range}). Можно выбрать от 1 до 6 дней — минимум один день отдыха обязателен.`,
      reason: 'Уточнить график для плана',
      scheduleWeek: { weekStartISO: week.weekStartISO, weekEndISO: week.weekEndISO },
    }
  }
  if (type === 'wellbeing') {
    return {
      type,
      text: `${first}, привет! Как самочувствие после последних тренировок? Если что-то беспокоит — напиши здесь.`,
      reason: 'Уточнить самочувствие',
    }
  }
  return {
    type: 'custom',
    text: `${first}, привет! `,
    reason: 'Сообщение для кабинета',
  }
}

/** @type {{ id: CoachBridgeRequestType, label: string }[]} */
export const COACH_BRIDGE_QUICK_REQUESTS = [
  { id: 'training_frequency', label: 'График тренировок' },
  { id: 'wellbeing', label: 'Самочувствие' },
  { id: 'custom', label: 'Своё сообщение' },
]

/**
 * @param {string} text
 */
export function detectBridgeRequestType(text) {
  const t = String(text ?? '').toLowerCase().replace(/ё/g, 'е')
  if (/\b(сколько\s+раз|раз\s+в\s+недел|раз\s+недел|календар|график|следующей\s+недел)\b/.test(t)) return 'training_frequency'
  if (/\b(самочувств|болит|беспокоит|здоров|после\s+тренир)\b/.test(t)) return 'wellbeing'
  return 'custom'
}

/**
 * @param {import('./coachBridgeModel.js').CoachBridgeMessage[]} messages
 */
export function deriveCoachBridgeStatus(messages) {
  const list = Array.isArray(messages) ? messages : []
  const lastTo = [...list].reverse().find((m) => m.dir === 'to_student')
  const lastFrom = [...list].reverse().find((m) => m.dir === 'from_student')
  if (!lastTo) return { phase: 'idle', lastTo: null, lastFrom: null }
  const awaiting =
    !lastFrom || new Date(lastFrom.at).getTime() < new Date(lastTo.at).getTime()
  if (awaiting) {
    return {
      phase: 'awaiting',
      lastTo,
      lastFrom,
      requestType: lastTo.requestType ?? detectBridgeRequestType(lastTo.text),
    }
  }
  if (lastFrom && (!lastTo || new Date(lastFrom.at).getTime() >= new Date(lastTo.at).getTime())) {
    const unread = !lastFrom.readByCoachAt
    return {
      phase: unread ? 'answered' : 'idle',
      lastTo,
      lastFrom,
      requestType: detectBridgeRequestType(lastTo?.text ?? lastFrom.text),
    }
  }
  return { phase: 'idle', lastTo, lastFrom }
}
