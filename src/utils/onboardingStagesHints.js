import {
  deriveStagesQuizPassesFromDialog,
  stagesQuizQuestionIndex,
} from './onboardingStagesChat.js'

/** После стольких ответов на текущий вопрос — подсказка вместо сухого «неверно». */
export const STAGES_QUIZ_STUCK_AFTER_ATTEMPTS = 10

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function countUserAttemptsOnCurrentStagesQuestion(messages) {
  let sliceFrom = 0
  let prevPasses = 0

  for (let i = 0; i < messages.length; i++) {
    const passes = deriveStagesQuizPassesFromDialog(messages.slice(0, i + 1))
    if (passes > prevPasses) {
      prevPasses = passes
      sliceFrom = i + 1
    }
  }

  return messages
    .slice(sliceFrom)
    .filter((m) => m.role === 'user' && typeof m.content === 'string' && m.content.trim()).length
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function stagesQuizShouldHint(messages) {
  return countUserAttemptsOnCurrentStagesQuestion(messages) >= STAGES_QUIZ_STUCK_AFTER_ATTEMPTS
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} attempt
 */
function hintKnowledgeStageName(personaId, attempt) {
  if (personaId === 'vasily') {
    if (attempt >= 15) {
      return 'Ладно, сдаюсь. Ответ — «Знание». Пиши одним словом, и пойдём дальше.'
    }
    return 'Печально. Подсказка: этап на «з», только что на схеме был первым. Как называется?'
  }
  if (personaId === 'arkady') {
    if (attempt >= 15) {
      return 'Друг, не мучайся — ответ «Знание». Напиши, и пойдём к образам.'
    }
    return 'Друг, подсказка: первый из четырёх этапов — начинается на «зн»…'
  }
  if (attempt >= 15) {
    return 'Подсказка: ответ — «Знание». Зафиксируй.'
  }
  return 'Подсказка: следующий этап на «з», корень «знан».'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {'logic' | 'vision' | 'kinesthesia'} part
 * @param {number} attempt
 */
function hintSingleImage(personaId, part, attempt) {
  if (part === 'logic') {
    if (personaId === 'vasily') {
      return attempt >= 15
        ? 'Ответ: логический образ — понимание, почему и как.'
        : 'Подсказка: «логический» — на «лог», почему так делаем.'
    }
    if (personaId === 'arkady') {
      return attempt >= 15
        ? 'Друг, ответ — логический образ: понимание шагов.'
        : 'Подсказка: логический — понимание, зачем каждый шаг.'
    }
    return attempt >= 15 ? 'Логический образ — понимание элемента.' : 'Подсказка: «логический» образ.'
  }
  if (part === 'vision') {
    if (personaId === 'vasily') {
      return attempt >= 15
        ? 'Ответ: зрительный образ — как выглядит правильно.'
        : 'Подсказка: «зрительный» — на «зр», картинка в голове.'
    }
    if (personaId === 'arkady') {
      return attempt >= 15
        ? 'Друг, зрительный — как выглядит удачное выполнение.'
        : 'Подсказка: зрительный — эталон формы.'
    }
    return attempt >= 15 ? 'Зрительный образ — эталон формы.' : 'Подсказка: «зрительный» образ.'
  }
  if (personaId === 'vasily') {
    return attempt >= 15
      ? 'Ответ: кинестетика — ощущение в мышцах.'
      : 'Подсказка: кинестетика — на «мыш»… «цах», тело.'
  }
  if (personaId === 'arkady') {
    return attempt >= 15
      ? 'Друг, кинестетика — прочувствовать в мышцах.'
      : 'Друг, подсказка: внутри слова «мышц» — что чувствует тело.'
  }
  return attempt >= 15 ? 'Кинестетика — ощущение в мышцах.' : 'Подсказка: кинестетический образ — тело.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} questionIndex
 * @param {string} _userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function buildStagesQuizStuckHint(personaId, questionIndex, _userMessage, messages) {
  const attempt = countUserAttemptsOnCurrentStagesQuestion(messages)

  if (questionIndex === 0) {
    return hintKnowledgeStageName(personaId, attempt)
  }
  if (questionIndex === 1) return hintSingleImage(personaId, 'logic', attempt)
  if (questionIndex === 2) return hintSingleImage(personaId, 'vision', attempt)
  return hintSingleImage(personaId, 'kinesthesia', attempt)
}
