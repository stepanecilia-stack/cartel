import { formatPortalPersonaName, getPortalPersona } from '../constants/studentPortalPersonas.js'
import { findStudentByNameQuery, resolveStudentNameQuery } from './studentNameSearch.js'
import {
  formatStudentCoachBrief,
  formatStudentLookupReply,
  formatStudentNotFoundReply,
  formatStudentSuggestionsReply,
  isStudentTopicSpecificQuery,
  messageHasStudentNameIntent,
} from './coachAssistantStudentContext.js'
import { isNormConversationThread } from './coachAssistantNormEvaluate.js'
import {
  formatNormEvaluationReply,
  shouldUseDeterministicNormReply,
} from './coachAssistantNormEvaluate.js'

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {{
 *   students?: object[],
 *   focusStudent?: object | null,
 *   coachName?: string,
 *   allNorms?: object[],
 *   programAtoms?: { level1?: object[], level2?: object[], level3?: object[] },
 * }} coachContext
 */
export async function scriptedCoachAssistantReply(personaId, userMessage, coachContext = {}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const text = String(userMessage ?? '').trim()
  const lower = text.toLowerCase()
  const students = coachContext.students ?? []
  const focus = coachContext.focusStudent ?? null
  const answerStudent = focus ?? coachContext.queryResolvedStudent ?? null
  const norms = coachContext.allNorms ?? []
  const programAtoms = coachContext.programAtoms ?? null

  const brief = (student, detailed = true) =>
    formatStudentCoachBrief(student, norms, detailed, programAtoms)

  if (
    coachContext.normEvaluation &&
    shouldUseDeterministicNormReply(
      text,
      coachContext.normEvaluation,
      coachContext,
      coachContext.conversationMessages ?? [],
    )
  ) {
    return formatNormEvaluationReply(coachContext.normEvaluation, persona.id, text)
  }

  if (/привет|здравств|добрый|хай|hello|^(але|эй)\b/.test(lower)) {
    if (persona.id === 'vasily') {
      return `Коллега, на связи. Спроси по ученику — имя, код или «открытый». Норматив внесу после твоего «да».`
    }
    if (persona.id === 'gleb') {
      return `${name}. Готов по вашему списку (${students.length} уч.). Уточните ученика и запрос.`
    }
    return `Коллега, я здесь. Спроси по любому ученику из списка — подскажу по карточке.`
  }

  if (focus && /открыт|текущ|сейчас|эта карточка|этот ученик/.test(lower)) {
    return `Сейчас открыт:\n${brief(focus, true)}\nЧто уточнить?`
  }

  if (/сколько|список|ученик/.test(lower) && students.length > 0) {
    const sample = students
      .slice(0, 5)
      .map((s) => brief(s, false))
      .join('\n')
    return `В списке ${students.length} уч. Например:\n${sample}\nНазови имя или код — разберём подробнее.`
  }

  const resolved = coachContext.queryResolvedStudent
    ? {
        match: coachContext.queryResolvedStudent,
        suggestions: coachContext.queryStudentSuggestions ?? [],
        ambiguous: false,
        significantTokens: [],
      }
    : resolveStudentNameQuery(students, text)

  const normThread = isNormConversationThread(coachContext.conversationMessages ?? [], text)
  if (
    !normThread &&
    !coachContext.normEvaluation &&
    messageHasStudentNameIntent(resolved) &&
    !isStudentTopicSpecificQuery(text)
  ) {
    if (resolved.match?.id && !resolved.ambiguous) {
      return formatStudentLookupReply(resolved.match, persona.id, norms, programAtoms)
    }
    if (resolved.suggestions.length > 0) {
      return formatStudentSuggestionsReply(
        resolved.suggestions,
        persona.id,
        coachContext.includeCodeInSuggestions === true,
      )
    }
    return formatStudentNotFoundReply(persona.id, students.length, resolved.significantTokens ?? [])
  }

  const found = resolved.match ?? findStudentByNameQuery(students, text) ?? answerStudent
  if (found && !normThread && !coachContext.normEvaluation) {
    if (!isStudentTopicSpecificQuery(text)) {
      return formatStudentLookupReply(found, persona.id, norms, programAtoms)
    }
    if (/техник|кабинет|этап|атом|уровен|умение|знание|навык/.test(lower)) {
      return `По технике:\n${brief(found, true)}`
    }
    if (/рост|вес|размах|антроп|физическ|кср|кд\b|архетип/.test(lower)) {
      return `Антропометрия и физика:\n${brief(found, true)}`
    }
    if (/норматив|сдал|зачёт|золот|серебр|бронз/.test(lower)) {
      return `По нормативам:\n${brief(found, true)}`
    }
    if (/сенситив|чувствител|окн[ао].*развит|моторн|качеств.*возраст/.test(lower)) {
      return `По сенситивным периодам:\n${brief(found, true)}`
    }
    return `По карточке:\n${brief(found, true)}\nСпроси конкретнее: нормативы, техника, сенситив.`
  }

  if (/норматив|запиш|внес|приня|сдал/.test(lower)) {
    return `Чтобы записать норматив: ученик (имя/код), название норматива, результат. Переспрошу и после твоего «да» — в карточку.`
  }

  const suggestions = coachContext.queryStudentSuggestions ?? resolved.suggestions ?? []
  if (suggestions.length > 0) {
    return formatStudentSuggestionsReply(
      suggestions,
      persona.id,
      coachContext.includeCodeInSuggestions === true,
    )
  }

  if (persona.id === 'vasily') {
    return `Коллега, уточни ученика и вопрос. В списке ${students.length} — без имени гадать не буду.`
  }
  if (persona.id === 'gleb') {
    return `Уточните ученика (имя или код) и запрос. В списке ${students.length} карточек.`
  }
  return `Коллега, назови ученика из списка — подскажу по карточке.`
}
