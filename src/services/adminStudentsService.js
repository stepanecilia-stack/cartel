import {
  attachCoachToStudent,
  deleteStudentDoc,
  detachCoachFromStudent,
  getAllCoaches,
  getStudentById,
  updateStudentData,
} from './firebaseService.js'
import { buildMergedStudentUpdate } from '../utils/studentMergeUtils.js'

/**
 * Слияние дубликатов: данные → основная карточка, остальные документы удаляются.
 * @param {{ primaryId: string, secondaryIds: string[], allNorms?: object[], technicalAtoms?: object[] }} params
 */
export async function adminMergeStudentCards({ primaryId, secondaryIds, allNorms, technicalAtoms }) {
  const secondaryUnique = [...new Set(secondaryIds)].filter((id) => id && id !== primaryId)
  if (!primaryId || secondaryUnique.length === 0) {
    throw new Error('Выберите основную карточку и хотя бы один дубликат для слияния.')
  }

  const primary = await getStudentById(primaryId)
  if (!primary) throw new Error('Основная карточка не найдена.')

  const secondaries = await Promise.all(secondaryUnique.map((id) => getStudentById(id)))
  const missing = secondaryUnique.filter((id, i) => !secondaries[i])
  if (missing.length) {
    throw new Error(`Не найдены карточки: ${missing.join(', ')}`)
  }

  const payload = buildMergedStudentUpdate(primary, secondaries, { allNorms, technicalAtoms })
  await updateStudentData(primaryId, payload, { section: 'Слияние карточек (админ)' })

  const deleteErrors = []
  for (const id of secondaryUnique) {
    try {
      await deleteStudentDoc(id)
    } catch (e) {
      console.error('[adminMergeStudentCards] delete', id, e)
      deleteErrors.push(id)
    }
  }

  if (deleteErrors.length) {
    throw new Error(
      `Основная карточка обновлена, но не удалось удалить: ${deleteErrors.join(', ')}. Проверьте правила Firestore (админ → delete).`,
    )
  }

  return { primaryId, mergedCount: secondaryUnique.length }
}

export { getAllCoaches, attachCoachToStudent, detachCoachFromStudent, getStudentById }
