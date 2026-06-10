import { formatStudentCoachBrief, formatStudentCoachSummaryText } from './coachAssistantStudentContext.js'
import { formatStudentSuggestionsBlock } from './studentNameSearch.js'

export { findStudentByNameQuery, findStudentByNameQuery as findStudentInRoster } from './studentNameSearch.js'

/**
 * @param {object[]} students
 * @param {object | null} [focusStudent]
 * @param {object[]} [allNorms]
 * @param {{ level1?: object[], level2?: object[], level3?: object[] } | null} [programAtoms]
 * @param {object | null} [queryResolvedStudent]
 * @param {object[]} [queryStudentSuggestions]
 * @param {string} [queryText]
 * @param {boolean} [includeCodeInSuggestions]
 */
export function buildCoachAssistantRosterBlock(
  students,
  focusStudent = null,
  allNorms = [],
  programAtoms = null,
  queryResolvedStudent = null,
  queryStudentSuggestions = [],
  queryText = '',
  includeCodeInSuggestions = false,
) {
  const list = Array.isArray(students) ? students : []
  const norms = Array.isArray(allNorms) ? allNorms : []
  const lines = []

  lines.push(
    'У каждого ученика в списке — краткая строка. Полные нормативы, кабинет, сенситив — только по отдельному запросу тренера.',
  )
  lines.push('')

  if (queryResolvedStudent?.id) {
    const sameAsFocus = focusStudent?.id === queryResolvedStudent.id
    if (!sameAsFocus) {
      lines.push('## Ученик из запроса тренера (сопоставлено по имени/фамилии)')
      lines.push(formatStudentCoachSummaryText(queryResolvedStudent, norms, programAtoms))
      lines.push(
        'Подробности (все нормативы с порогами, кабинет, сенситив, КСР) — только если тренер спросит отдельно.',
      )
      lines.push('')
    }
  } else if (Array.isArray(queryStudentSuggestions) && queryStudentSuggestions.length > 0) {
    const block = formatStudentSuggestionsBlock(queryStudentSuggestions, queryText, {
      includeCode: includeCodeInSuggestions,
    })
    if (block) {
      lines.push(block)
      lines.push(
        includeCodeInSuggestions
          ? 'Точного совпадения нет — предложи этих учеников с кодом. Не утверждай, что ученика нет в базе.'
          : 'Точного совпадения нет — предложи этих учеников (имя и год рождения, без кода). Не утверждай, что ученика нет в базе.',
      )
      lines.push('')
    }
  }

  if (focusStudent?.id) {
    lines.push('## Открытая карточка (контекст сейчас)')
    lines.push(formatStudentCoachBrief(focusStudent, norms, true, programAtoms))
    lines.push('')
  }

  lines.push(`## Список учеников (${list.length})`)
  if (list.length === 0) {
    lines.push('Пока нет учеников в списке.')
    return lines.join('\n')
  }

  const skipIds = new Set(
    [focusStudent?.id, queryResolvedStudent?.id].filter(Boolean).map(String),
  )

  for (const student of list) {
    if (skipIds.has(String(student.id))) continue
    lines.push(`- ${formatStudentCoachBrief(student, norms, false, programAtoms)}`)
  }

  return lines.join('\n')
}

/** @deprecated используй formatStudentCoachBrief из coachAssistantStudentContext.js */
export { formatStudentCoachBrief as formatStudentCoachLine } from './coachAssistantStudentContext.js'
