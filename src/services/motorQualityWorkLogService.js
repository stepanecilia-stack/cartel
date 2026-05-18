import {
  appendMotorQualityWorkEntry,
  normalizeMotorQualityWorkLog,
  removeLastTodayMotorQualityWorkEntry,
} from '../utils/motorQualityWorkLog.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'
import {
  getCurrentCoachId,
  getStudentById,
  resolveCurrentCoachAuditFields,
  updateStudentData,
} from './firebaseService.js'

/**
 * @param {string} studentId
 * @param {{
 *   qualitySlug: string,
 *   exerciseId: string,
 *   exerciseTitle: string,
 *   doseText?: string | null,
 *   inSensitivePeriod: boolean,
 * }} params
 */
export async function recordMotorQualityWorkCompletion(studentId, params) {
  const { qualitySlug, exerciseId, exerciseTitle, doseText, inSensitivePeriod } = params
  if (!studentId || !qualitySlug || !exerciseId) {
    throw new Error('Не указан ученик или упражнение')
  }

  const fresh = await getStudentById(studentId)
  if (!fresh) throw new Error('Ученик не найден')

  const audit = await resolveCurrentCoachAuditFields()
  const entry = {
    id: `${Date.now()}_${exerciseId}`,
    exerciseId,
    exerciseTitle: exerciseTitle ?? '',
    doseText: doseText?.trim() || null,
    completedAt: new Date().toISOString(),
    inSensitivePeriod: Boolean(inSensitivePeriod),
    coachId: getCurrentCoachId() ?? audit.lastUpdatedByCoachId ?? null,
    coachName: audit.lastUpdatedByCoachName ?? null,
  }

  const nextLog = appendMotorQualityWorkEntry(fresh.motorQualityWorkLog, qualitySlug, entry)
  await updateStudentData(
    studentId,
    { motorQualityWorkLog: nextLog },
    { section: STUDENT_UPDATE_SECTION.motorQualityWork },
  )
  return nextLog
}

/**
 * Снять последнюю отметку за сегодня (качество + упражнение).
 * @param {string} studentId
 * @param {string} qualitySlug
 * @param {string} exerciseId
 */
export async function clearTodayMotorQualityWorkCompletion(studentId, qualitySlug, exerciseId) {
  if (!studentId || !qualitySlug || !exerciseId) return null

  const fresh = await getStudentById(studentId)
  if (!fresh) throw new Error('Ученик не найден')

  const nextLog = removeLastTodayMotorQualityWorkEntry(
    normalizeMotorQualityWorkLog(fresh.motorQualityWorkLog),
    qualitySlug,
    exerciseId,
  )
  await updateStudentData(
    studentId,
    { motorQualityWorkLog: nextLog },
    { section: STUDENT_UPDATE_SECTION.motorQualityWork },
  )
  return nextLog
}
