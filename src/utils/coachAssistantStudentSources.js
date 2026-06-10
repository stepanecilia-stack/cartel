import { mergeStudentCardLiveSnapshot } from '../data/studentCardLiveCache.js'

/**
 * Слияние свежих данных ученика для контекста помощника-тренера.
 * Открытая карточка и недавние сохранения важнее устаревшего списка.
 */

/**
 * @param {object[] | null | undefined} students
 * @param {object | null | undefined} freshStudent
 */
export function mergeStudentIntoList(students, freshStudent) {
  if (!freshStudent?.id) return Array.isArray(students) ? students : []
  const merged = mergeStudentCardLiveSnapshot(freshStudent)
  const list = Array.isArray(students) ? [...students] : []
  const id = String(merged.id)
  const idx = list.findIndex((s) => String(s.id) === id)
  if (idx >= 0) {
    list[idx] = mergeStudentCardLiveSnapshot({ ...list[idx], ...merged })
    return list
  }
  list.push(merged)
  return list
}

/**
 * @param {object | null | undefined} student
 * @param {object | null | undefined} focusStudent
 */
export function preferFreshStudent(student, focusStudent) {
  if (!student) return mergeStudentCardLiveSnapshot(focusStudent ?? null)
  if (!focusStudent?.id || String(student.id) !== String(focusStudent.id)) {
    return mergeStudentCardLiveSnapshot(student)
  }
  return mergeStudentCardLiveSnapshot({ ...student, ...focusStudent })
}
