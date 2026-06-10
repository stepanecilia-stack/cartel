import { mergeStudentCardLiveSnapshot } from '../data/studentCardLiveCache.js'
import { pickCoachAssistantStudentLookupText } from './coachAssistantConfirmText.js'
import { resolveStudentNameQuery } from './studentNameSearch.js'

/**
 * Слияние свежих данных ученика для контекста помощника-тренера.
 * Открытая карточка и недавние сохранения важнее устаревшего списка.
 */

/**
 * Снимок открытой карточки (форма на экране) поверх списка учеников.
 * @param {object | null | undefined} focusStudent
 */
export function hydrateCoachAssistantFocusStudent(focusStudent) {
  if (!focusStudent?.id) return null
  return mergeStudentCardLiveSnapshot(focusStudent)
}

/**
 * Кого считать учеником запроса: открытая карточка важнее старой переписки.
 * Другой ученик — только если его явно назвали в текущем сообщении.
 * @param {{
 *   students: object[],
 *   focusStudent?: object | null,
 *   userMessage?: string,
 *   conversationText?: string,
 *   threadText?: string,
 *   presetResolvedStudent?: object | null,
 *   presetSuggestions?: object[],
 * }} params
 */
export function resolveCoachAssistantStudentTargets({
  students,
  focusStudent = null,
  userMessage = '',
  conversationText = '',
  threadText = '',
  presetResolvedStudent = null,
  presetSuggestions = null,
}) {
  const list = Array.isArray(students) ? students : []
  const hydratedFocus = hydrateCoachAssistantFocusStudent(focusStudent)
  const lookupText = pickCoachAssistantStudentLookupText({ userMessage, conversationText, threadText })

  if (presetResolvedStudent?.id) {
    return {
      focusStudent: hydratedFocus,
      queryResolvedStudent: preferFreshStudent(presetResolvedStudent, hydratedFocus),
      queryStudentSuggestions: Array.isArray(presetSuggestions) ? presetSuggestions : [],
    }
  }

  const currentQuery = resolveStudentNameQuery(list, lookupText)

  if (hydratedFocus?.id) {
    const explicitOther =
      currentQuery.match?.id && String(currentQuery.match.id) !== String(hydratedFocus.id)
    if (explicitOther) {
      return {
        focusStudent: hydratedFocus,
        queryResolvedStudent: preferFreshStudent(currentQuery.match, hydratedFocus),
        queryStudentSuggestions: currentQuery.suggestions ?? [],
      }
    }
    return {
      focusStudent: hydratedFocus,
      queryResolvedStudent: preferFreshStudent(hydratedFocus, hydratedFocus),
      queryStudentSuggestions: (currentQuery.suggestions ?? []).filter(
        (s) => String(s.id) !== String(hydratedFocus.id),
      ),
    }
  }

  const conversationQuery = resolveStudentNameQuery(list, lookupText)
  return {
    focusStudent: null,
    queryResolvedStudent: preferFreshStudent(conversationQuery.match, null),
    queryStudentSuggestions: conversationQuery.suggestions ?? [],
  }
}

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
