import { formatAthleteWeightCategory } from './athleteWeightCategory.js'
import {
  displayNameFromStudent,
  formatBirthYearRu,
  normalizeAnthropometryNumber,
  studentAthleteShape,
} from './studentModel.js'

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   birthYearLabel: string,
 *   weightLabel: string,
 *   weightCategoryLabel: string,
 * }} CoachEventStudentOption
 */

/** @param {number} kg */
function formatWeightKgLabel(kg) {
  if (!kg || kg <= 0) return ''
  if (Math.abs(kg - Math.round(kg)) < 1e-6) return `${Math.round(kg)} кг`
  return `${kg} кг`
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {CoachEventStudentOption}
 */
export function toCoachEventStudentOption(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      name: 'Без имени',
      birthYearLabel: '—',
      weightLabel: '—',
      weightCategoryLabel: '—',
    }
  }
  const shaped = studentAthleteShape(raw)
  const birthYearLabel = formatBirthYearRu(shaped.birthYear) || '—'
  const weightKg = normalizeAnthropometryNumber(raw.weight ?? shaped.weight)
  const weightLabel = formatWeightKgLabel(weightKg) || '—'
  const weightCategoryLabel = formatAthleteWeightCategory(shaped) || '—'
  return {
    id: String(raw.id ?? ''),
    name: displayNameFromStudent(raw),
    birthYearLabel,
    weightLabel,
    weightCategoryLabel,
  }
}

/** @param {Pick<CoachEventStudentOption, 'birthYearLabel' | 'weightLabel' | 'weightCategoryLabel'>} opt */
export function formatCoachEventParticipantMeta(opt) {
  const year = opt.birthYearLabel?.trim() || '—'
  const weight = opt.weightLabel?.trim() || '—'
  const category = opt.weightCategoryLabel?.trim() || '—'
  return `${year} · ВК ${category} · ${weight}`
}
