import { MOTOR_SKILL_STAGES } from '../constants/studentPortalOnboarding.js'
import { MARKER_QUIZ_PASS, MARKER_READY_FOR_STAGES } from './personaChatMarkers.js'
import { assessThreeImagesAnswer, threeImagesCorrectionReply } from './portalKnowledgeThreeImages.js'

/**
 * @typedef {{
 *   stagesQuizPassed: boolean,
 *   stagesQuizPassedAt: string | null,
 *   kinesthesiaConfirmed: boolean,
 *   kinesthesiaConfirmedAt: string | null,
 *   kinesthesiaAnswerSnippet: string,
 * }} OnboardingStagesMilestones
 */

/** @returns {OnboardingStagesMilestones} */
export function emptyOnboardingStagesMilestones() {
  return {
    stagesQuizPassed: false,
    stagesQuizPassedAt: null,
    kinesthesiaConfirmed: false,
    kinesthesiaConfirmedAt: null,
    kinesthesiaAnswerSnippet: '',
  }
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {OnboardingStagesMilestones}
 */
export function extractOnboardingStagesMilestones(messages) {
  const empty = emptyOnboardingStagesMilestones()
  if (countStagesQuizPasses(messages) < 2) return empty

  const now = new Date().toISOString()
  let firstPassIdx = -1
  let secondPassIdx = -1

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.role !== 'assistant' || !String(m.content).includes(MARKER_QUIZ_PASS)) continue
    if (firstPassIdx < 0) firstPassIdx = i
    else {
      secondPassIdx = i
      break
    }
  }

  let kinesthesiaConfirmed = false
  let kinesthesiaAnswerSnippet = ''
  const scanEnd = secondPassIdx >= 0 ? secondPassIdx : messages.length

  if (firstPassIdx >= 0) {
    for (let i = firstPassIdx + 1; i < scanEnd; i++) {
      const m = messages[i]
      if (m.role !== 'user' || typeof m.content !== 'string') continue
      const assessment = assessThreeImagesAnswer(m.content)
      if (assessment.pass) {
        kinesthesiaConfirmed = true
        kinesthesiaAnswerSnippet = m.content.trim().slice(0, 200)
        break
      }
    }
  }

  return {
    stagesQuizPassed: true,
    stagesQuizPassedAt: now,
    kinesthesiaConfirmed,
    kinesthesiaConfirmedAt: kinesthesiaConfirmed ? now : null,
    kinesthesiaAnswerSnippet,
  }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 */
export function buildOnboardingStagesOpener(persona) {
  const ladder = MOTOR_SKILL_STAGES.map((stage, index) => {
    const suffix = stage.active ? ' — сейчас здесь, на платформе' : ''
    return `${index + 1}. ${stage.label}${suffix}`
  }).join('\n')

  return `${persona.phrases.stagesIntro}\n\n${ladder}\n\nПервый вопрос: на каком из этих этапов ты сейчас учишься на платформе Cartel?`
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function countStagesQuizPasses(messages) {
  return messages.filter((m) => m.role === 'assistant' && String(m.content).includes(MARKER_QUIZ_PASS)).length
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function stagesQuizQuestionIndex(messages) {
  return Math.min(2, countStagesQuizPasses(messages))
}

/**
 * @param {string} text
 * @param {number} questionIndex 0 = first question, 1 = second
 */
export function evaluateOnboardingStagesAnswer(text, questionIndex) {
  const lower = text.trim().toLowerCase()
  if (!lower || lower.length < 2) return false

  if (questionIndex === 0) {
    return /знан/i.test(lower)
  }

  return assessThreeImagesAnswer(text).pass
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function scriptedOnboardingStagesReply(personaId, userMessage, messages) {
  const qIndex = stagesQuizQuestionIndex(messages)
  const passed = evaluateOnboardingStagesAnswer(userMessage, qIndex)

  if (qIndex === 0) {
    if (passed) {
      if (personaId === 'vasily') {
        return `Верно. «Знание» — образы в голове и в теле, не героизм в зале. ${MARKER_QUIZ_PASS}\n\nВторой вопрос: что нужно для честного «Понял»? Все три образа — логика, зрение и кинестетика, прочувствованная мышцами.`
      }
      if (personaId === 'arkady') {
        return `Точно, друг — «Знание». ${MARKER_QUIZ_PASS}\n\nВторой вопрос: логика, зрение и кинестетика — что должно быть перед «Понял»? Не забудь про ощущение в теле.`
      }
      return `Засчитано: этап «Знание». ${MARKER_QUIZ_PASS}\n\nВторой вопрос: критерий «Понял» — все три образа, включая кинестетический.`
    }
    if (personaId === 'vasily') {
      return 'Мимо. На платформе Cartel мы на «Знании» — образы в голове и теле. Остальное потом, в зале. Ещё раз: какой этап сейчас?'
    }
    if (personaId === 'arkady') {
      return 'Почти. Сейчас мы на «Знании» — строим образы, без зала. Попробуй назвать этап ещё раз.'
    }
    return 'Неверно. Текущий этап на платформе — «Знание». Повторите ответ.'
  }

  if (qIndex === 1) {
    if (passed) {
      if (personaId === 'vasily') {
        return `Нормально. Три образа — и «Понял». ${MARKER_QUIZ_PASS}\n\nМожешь жать «Дальше» — дальше про три образа подробнее.`
      }
      if (personaId === 'arkady') {
        return `Вот так! Логика, зрение, тело — все три. ${MARKER_QUIZ_PASS}\n\nЖми «Дальше», разберём подробнее.`
      }
      return `Критерий принят. ${MARKER_QUIZ_PASS}\n\nМожно перейти дальше — кнопка «Дальше».`
    }
    const assessment = assessThreeImagesAnswer(userMessage)
    return threeImagesCorrectionReply(personaId, assessment.missing, assessment.dismissesKinesthesia)
  }

  return `Оба вопроса закрыты. Жмите «Дальше». ${MARKER_QUIZ_PASS}`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 */
export function scriptedOnboardingGreetingNudge(personaId, userMessage) {
  const lower = userMessage.trim().toLowerCase()
  if (!lower) return null

  if (/^(да|ок|окей|готов|давай|поехали|слушаю|расскаж|инструкт|этап|ступен|хочу знать)/i.test(lower)) {
    if (personaId === 'vasily') {
      return `Ладно. Сейчас объясню четыре ступени — как техника вообще живёт в голове и теле. ${MARKER_READY_FOR_STAGES}\n\nЖми «Дальше» — там разберём по-взрослому.`
    }
    if (personaId === 'arkady') {
      return `Отлично. Дальше покажу четыре этапа — от «Знания» до автоматизации. ${MARKER_READY_FOR_STAGES}\n\nЖми «Дальше», когда будешь готов.`
    }
    return `Принято. Следующий шаг — инструктаж по четырём этапам. ${MARKER_READY_FOR_STAGES}\n\nНажмите «Дальше».`
  }

  return null
}
