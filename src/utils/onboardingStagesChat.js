import { MARKER_QUIZ_PASS, MARKER_READY_FOR_STAGES } from './personaChatMarkers.js'
import { buildStagesQuizStuckHint, stagesQuizShouldHint } from './onboardingStagesHints.js'
import {
  assessThreeImagesAnswer,
  evaluateKinesthesiaImageAnswer,
  evaluateLogicImageAnswer,
  evaluateVisionImageAnswer,
  singleImageCorrectionReply,
} from './portalKnowledgeThreeImages.js'

/** Этап «Знание» + три образа = 4 принятых ответа. */
export const STAGES_QUIZ_QUESTION_COUNT = 4

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

/** @typedef {{ stageName: boolean, logic: boolean, vision: boolean, kinesthesia: boolean }} StagesQuizCriteria */

/** @returns {StagesQuizCriteria} */
function emptyStagesQuizCriteria() {
  return { stageName: false, logic: false, vision: false, kinesthesia: false }
}

/** @param {StagesQuizCriteria} criteria */
function countStagesQuizCriteria(criteria) {
  return [criteria.stageName, criteria.logic, criteria.vision, criteria.kinesthesia].filter(Boolean).length
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {StagesQuizCriteria}
 */
export function collectStagesQuizCriteriaFromUser(messages) {
  const criteria = emptyStagesQuizCriteria()
  for (const m of messages) {
    if (m.role !== 'user' || typeof m.content !== 'string' || !m.content.trim()) continue
    const text = m.content
    if (!criteria.stageName && evaluateOnboardingStagesAnswer(text, 0)) criteria.stageName = true
    if (!criteria.logic && evaluateOnboardingStagesAnswer(text, 1)) criteria.logic = true
    if (!criteria.vision && evaluateOnboardingStagesAnswer(text, 2)) criteria.vision = true
    if (!criteria.kinesthesia && evaluateOnboardingStagesAnswer(text, 3)) criteria.kinesthesia = true
  }
  return criteria
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {StagesQuizCriteria}
 */
export function inferStagesQuizCriteriaFromTrainer(messages) {
  const criteria = emptyStagesQuizCriteria()
  for (const m of messages) {
    if (m.role !== 'assistant' || typeof m.content !== 'string') continue
    const lower = m.content.toLowerCase()

    if (/«знание»|этап.*знан|знан[иея].*(верно|засчит|точно|принят)|засчитан.*знан/i.test(lower)) {
      criteria.stageName = true
    }
    if (/логическ.*(верно|засчит|принят|ок|так|—)/i.test(lower)) {
      criteria.logic = true
    }
    if (/зрительн.*(верно|засчит|принят|ок|так|—)/i.test(lower)) {
      criteria.vision = true
    }
    if (/кинестет.*(верно|засчит|принят|ок|наконец|вот оно)/i.test(lower) || /накец-то/i.test(lower)) {
      criteria.kinesthesia = true
    }
    if (
      /логическ.*зрительн.*кинестет/i.test(lower) ||
      (/три образа/i.test(lower) && /логическ|зрительн|кинестет/i.test(lower))
    ) {
      criteria.logic = true
      criteria.vision = true
      criteria.kinesthesia = true
    }
  }

  if (criteria.logic && criteria.vision && criteria.kinesthesia) {
    const trainerSaysAdvance = messages.some(
      (msg) =>
        msg.role === 'assistant' &&
        typeof msg.content === 'string' &&
        /жми.*дальше|нажми.*дальше/i.test(msg.content.toLowerCase()),
    )
    if (trainerSaysAdvance) criteria.stageName = true
  }

  return criteria
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {StagesQuizCriteria}
 */
export function mergeStagesQuizCriteria(messages) {
  const user = collectStagesQuizCriteriaFromUser(messages)
  const trainer = inferStagesQuizCriteriaFromTrainer(messages)
  return {
    stageName: user.stageName || trainer.stageName,
    logic: user.logic || trainer.logic,
    vision: user.vision || trainer.vision,
    kinesthesia: user.kinesthesia || trainer.kinesthesia,
  }
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {OnboardingStagesMilestones}
 */
export function extractOnboardingStagesMilestones(messages) {
  const empty = emptyOnboardingStagesMilestones()
  if (deriveStagesQuizPassesFromDialog(messages) < STAGES_QUIZ_QUESTION_COUNT) return empty

  const now = new Date().toISOString()
  let kinesthesiaAnswerSnippet = ''

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user' || typeof m.content !== 'string') continue
    if (evaluateKinesthesiaImageAnswer(m.content)) {
      kinesthesiaAnswerSnippet = m.content.trim().slice(0, 200)
      break
    }
  }

  return {
    stagesQuizPassed: true,
    stagesQuizPassedAt: now,
    kinesthesiaConfirmed: Boolean(kinesthesiaAnswerSnippet) || mergeStagesQuizCriteria(messages).kinesthesia,
    kinesthesiaConfirmedAt: now,
    kinesthesiaAnswerSnippet,
  }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 */
const STAGES_LADDER = `1. Знание
2. Умение
3. Навык
4. Автоматизация`

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 */
export function buildOnboardingStagesOpener(persona) {
  if (persona.id === 'vasily') {
    return `Слушай. Любая техника проходит четыре этапа:

${STAGES_LADDER}

Следующий у нас — «Знание». Как называется этот этап?`
  }
  if (persona.id === 'arkady') {
    return `Друг, любой удар растёт по шагам — четыре этапа:

${STAGES_LADDER}

Начинаем со «Знания». Как называется этот этап?`
  }
  return `Четыре этапа формирования навыка:

${STAGES_LADDER}

Следующий — «Знание». Как называется этот этап?`
}

/**
 * Сколько пунктов закрыто: этап «Знание» + три образа.
 * Учитывает ответы ученика в любом порядке и явное принятие тренером.
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function deriveStagesQuizPassesFromDialog(messages) {
  return countStagesQuizCriteria(mergeStagesQuizCriteria(messages))
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function countStagesQuizPasses(messages) {
  return deriveStagesQuizPassesFromDialog(messages)
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function stagesQuizQuestionIndex(messages) {
  const criteria = mergeStagesQuizCriteria(messages)
  if (!criteria.stageName) return 0
  if (!criteria.logic) return 1
  if (!criteria.vision) return 2
  if (!criteria.kinesthesia) return 3
  return STAGES_QUIZ_QUESTION_COUNT
}

/**
 * AI иногда не ставит ||QUIZ_PASS|| — дописываем, если ответ ученика уже принят по критерию.
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function enrichOnboardingStagesReply(personaId, userMessage, messages, rawReply) {
  const before = deriveStagesQuizPassesFromDialog(messages.slice(0, -1))
  let reply = String(rawReply ?? '').trim()
  if (!reply) return reply

  const withReply = [...messages, { role: 'assistant', content: reply }]
  const after = deriveStagesQuizPassesFromDialog(withReply)

  if (after > before && !reply.includes(MARKER_QUIZ_PASS)) {
    reply = `${reply} ${MARKER_QUIZ_PASS}`
  }

  if (after >= STAGES_QUIZ_QUESTION_COUNT && !/жми|нажми|дальше|закрыт|все четыре|все 4/i.test(reply)) {
    const tail =
      personaId === 'vasily'
        ? ' Все четыре пункта закрыты — жми зелёную «Дальше» внизу.'
        : personaId === 'arkady'
          ? ' Друг, все четыре ответа приняты — жми «Дальше» внизу.'
          : ' Четыре пункта закрыты. Кнопка «Дальше» внизу.'
    if (!reply.includes(MARKER_QUIZ_PASS)) reply = `${reply} ${MARKER_QUIZ_PASS}`
    return `${reply}${tail}`
  }

  return reply
}

/**
 * @param {string} text
 * @param {number} questionIndex 0..3
 */
export function evaluateOnboardingStagesAnswer(text, questionIndex) {
  const lower = text.trim().toLowerCase()
  if (!lower || lower.length < 2) return false

  if (questionIndex === 0) return /знан/i.test(lower)
  if (questionIndex === 1) return evaluateLogicImageAnswer(text)
  if (questionIndex === 2) return evaluateVisionImageAnswer(text)
  if (questionIndex === 3) return evaluateKinesthesiaImageAnswer(text)

  return false
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} nextQuestionIndex 1..3
 */
function nextStagesQuizQuestion(personaId, nextQuestionIndex) {
  if (nextQuestionIndex === 1) {
    if (personaId === 'vasily') {
      return 'Вопрос 2 из 4: что такое логический образ «Знания»?'
    }
    if (personaId === 'arkady') {
      return 'Вопрос 2 из 4: что такое логический образ «Знания»?'
    }
    return 'Вопрос 2 из 4: логический образ «Знания» — что это?'
  }
  if (nextQuestionIndex === 2) {
    if (personaId === 'vasily') {
      return 'Вопрос 3 из 4: зрительный образ — что это?'
    }
    if (personaId === 'arkady') {
      return 'Вопрос 3 из 4: зрительный образ — сформулируй.'
    }
    return 'Вопрос 3 из 4: зрительный образ — определение.'
  }
  if (personaId === 'vasily') {
    return 'Вопрос 4 из 4: кинестетический образ — что это?'
  }
  if (personaId === 'arkady') {
    return 'Вопрос 4 из 4: кинестетический образ — своими словами.'
  }
  return 'Вопрос 4 из 4: кинестетический образ — определение.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} questionIndex
 */
function stagesQuizPassAck(personaId, questionIndex) {
  if (questionIndex === 0) {
    if (personaId === 'vasily') return 'Верно — «Знание».'
    if (personaId === 'arkady') return 'Точно, друг — «Знание».'
    return 'Засчитано: «Знание».'
  }
  if (questionIndex === 1) {
    if (personaId === 'vasily') return 'Логический — засчитан.'
    if (personaId === 'arkady') return 'Логический образ — верно.'
    return 'Логический образ — засчитано.'
  }
  if (questionIndex === 2) {
    if (personaId === 'vasily') return 'Зрительный — ок.'
    if (personaId === 'arkady') return 'Зрительный — так и есть.'
    return 'Зрительный образ — засчитано.'
  }
  if (personaId === 'vasily') {
    return 'Кинестетика — принята. Все четыре пункта закрыты.'
  }
  if (personaId === 'arkady') {
    return 'Кинестетика — верно. Все четыре пункта на месте.'
  }
  return 'Кинестетика — засчитано. Все четыре пункта закрыты.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function scriptedOnboardingStagesReply(personaId, userMessage, messages) {
  const qIndex = stagesQuizQuestionIndex(messages)
  const lower = userMessage.trim().toLowerCase()

  if (/не горит|не актив|кнопк.*не|не могу нажать|не нажима/i.test(lower)) {
    if (qIndex >= STAGES_QUIZ_QUESTION_COUNT) {
      if (personaId === 'vasily') return 'Все четыре пункта закрыты — «Дальше» внизу должна быть зелёной. Жми.'
      if (personaId === 'arkady') return 'Друг, все четыре ответа приняты — жми зелёную «Дальше» внизу.'
      return 'Четыре пункта засчитаны. Кнопка «Дальше» активна.'
    }
    const left = STAGES_QUIZ_QUESTION_COUNT - qIndex
    if (personaId === 'vasily') {
      return `«Дальше» загорится после четырёх ответов. Сейчас ${qIndex} из 4 — осталось ${left}. ${qIndex === 0 ? 'Как называется следующий этап?' : nextStagesQuizQuestion(personaId, qIndex)}`
    }
    if (personaId === 'arkady') {
      return `Друг, кнопка откроется после всех четырёх ответов. Сейчас ${qIndex} из 4. ${qIndex === 0 ? 'Как называется этап?' : nextStagesQuizQuestion(personaId, qIndex)}`
    }
    return `Принято ${qIndex} из 4. ${qIndex === 0 ? 'Назови следующий этап.' : nextStagesQuizQuestion(personaId, qIndex)}`
  }

  const passed = evaluateOnboardingStagesAnswer(userMessage, qIndex)

  if (qIndex >= STAGES_QUIZ_QUESTION_COUNT) {
    if (personaId === 'vasily') {
      return 'Всё засчитано. Жми зелёную «Дальше» внизу — не размазываем.'
    }
    if (personaId === 'arkady') {
      return 'Друг, все четыре ответа приняты. Жми «Дальше» внизу.'
    }
    return 'Четыре пункта закрыты. Кнопка «Дальше» внизу.'
  }

  if (passed) {
    const ack = stagesQuizPassAck(personaId, qIndex)
    if (qIndex === STAGES_QUIZ_QUESTION_COUNT - 1) {
      return `${ack} ${MARKER_QUIZ_PASS}\n\nЖми зелёную «Дальше» внизу.`
    }
    return `${ack} ${MARKER_QUIZ_PASS}\n\n${nextStagesQuizQuestion(personaId, qIndex + 1)}`
  }

  if (stagesQuizShouldHint(messages)) {
    return buildStagesQuizStuckHint(personaId, qIndex, userMessage, messages)
  }

  if (qIndex === 0) {
    if (personaId === 'vasily') {
      return 'Мимо. Следующий этап после схемы — «Знание». Как называется?'
    }
    if (personaId === 'arkady') {
      return 'Почти. Начинаем со «Знания». Как называется этап?'
    }
    return 'Неверно. Следующий этап — «Знание». Повтори.'
  }

  if (qIndex === 1) return singleImageCorrectionReply(personaId, 'logic')
  if (qIndex === 2) return singleImageCorrectionReply(personaId, 'vision')
  if (qIndex === 3) return singleImageCorrectionReply(personaId, 'kinesthesia')

  return singleImageCorrectionReply(personaId, 'logic')
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
    return `Принято. Следующий шаг — инструктаж по четырём этапам. ${MARKER_READY_FOR_STAGES}\n\nЖми «Дальше».`
  }

  return null
}
