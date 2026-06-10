import { mergeStudentCardLiveSnapshot } from '../data/studentCardLiveCache.js'
import { loadNormsOnce } from '../data/normsCache.js'
import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import {
  getCoachProfile,
  getStudentById,
  updateStudentData,
} from './firebaseService.js'
import { applyNormRawInput } from '../utils/normTestsStorage.js'
import {
  getPhysicalNormsForStudent,
  resolvePhysicalNormForStudent,
} from '../utils/studentNormsProfile.js'
import { displayNameFromStudent, isStudentAttachedToCoach } from '../utils/studentModel.js'
import { getNormValueByTestId } from '../utils/normTestsStorage.js'
import {
  buildStudentTestsUpdatePayload,
  getStoredNormRow,
  mergeNormAcceptanceIntoTests,
  mergeStudentTestBuckets,
} from '../utils/studentNormUpdate.js'
import { normAcceptanceSectionLabel } from '../utils/studentUpdateSections.js'

/**
 * @param {{
 *   studentId: string,
 *   testId: string,
 *   resultRaw: string,
 *   coachId: string,
 * }} params
 */
export async function saveCoachAssistantNorm({ studentId, testId, resultRaw, coachId }) {
  if (!studentId || !testId || !resultRaw || !coachId) {
    throw new Error('Не хватает данных для записи норматива.')
  }

  const fetched = await getStudentById(studentId)
  const student = mergeStudentCardLiveSnapshot(fetched)
  if (!student) throw new Error('Ученик не найден.')
  if (!isStudentAttachedToCoach(student, coachId)) {
    throw new Error('Нет доступа к этому ученику.')
  }

  const allNorms = await loadNormsOnce()
  const norm = resolvePhysicalNormForStudent(allNorms, student, testId)
  if (!norm) {
    throw new Error(`Норматив «${testId}» не найден в программе ученика (проверьте пол и г.р. в карточке).`)
  }

  const athleteNorms = getPhysicalNormsForStudent(allNorms, student)
  const inProgram = athleteNorms.some(
    (n) => String(n.testId) === String(norm.testId) || String(n.testName) === String(norm.testName),
  )
  if (!inProgram) {
    throw new Error(`Норматив «${norm.testName}» не в списке карточки ученика.`)
  }

  const parsed = applyNormRawInput(norm, resultRaw)
  if (!parsed || !Number.isFinite(parsed.result)) {
    throw new Error('Не удалось разобрать результат. Укажите число или время (м:сс).')
  }

  const { physical: physicalMerged } = mergeStudentTestBuckets(student, student.tests?.physical ?? {})
  const serverRow = getStoredNormRow(student, 'physical', norm.testId) ?? getNormValueByTestId(physicalMerged, norm.testId)
  const coachProfile = await getCoachProfile(coachId)
  const coachName = [coachProfile?.firstName, coachProfile?.lastName].filter(Boolean).join(' ').trim() || 'Тренер'

  const mergedRow = mergeNormAcceptanceIntoTests({
    testsBucket: physicalMerged,
    serverRow,
    norm,
    category: 'physical',
    evaluated: parsed,
    coachId,
    coachName,
  })
  delete mergedRow.studentSelfReport
  delete mergedRow.studentSelfReportAt
  delete mergedRow.pendingStudentSelfReport
  physicalMerged[norm.testId] = mergedRow

  const atoms = getTechnicalProgramAtomsCache()
  const payload = buildStudentTestsUpdatePayload({
    student,
    allNorms,
    technicalAtoms: atoms.level1,
    physicalMerged,
    functionalMerged: {},
  })

  await updateStudentData(student.id, payload, {
    section: normAcceptanceSectionLabel('physical', norm),
    shortId: student.short_id,
    photoURL: student.photoURL ?? student.photo,
  })

  return {
    studentName: displayNameFromStudent(student),
    normName: norm.testName,
    resultDisplay: parsed.resultRaw ?? String(parsed.result),
    status: parsed.status,
    payload,
  }
}
