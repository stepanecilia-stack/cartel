import { MARKER_QUIZ_PASS, MARKER_READY_FOR_STAGES } from './personaChatMarkers.js'
import { buildOnboardingSkipAllowReply, detectOnboardingSkipIntent } from './onboardingSkipIntent.js'
import {
  formatOnboardingStagesTheoryPrompt,
  findOnboardingStagesTheoryOption,
  getOnboardingStagesTheoryQuestion,
  isOnboardingStagesHelpMessage,
  isOnboardingStagesUiMetaMessage,
  isOnboardingStagesTheoryAnswerCorrect,
  ONBOARDING_STAGES_THEORY_QUESTIONS,
} from '../constants/onboardingTheoryQuiz.js'
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

/** @param {StagesQuizCriteria} criteria */
export function stagesQuizQuestionIndexFromCriteria(criteria) {
  if (!criteria.stageName) return 0
  if (!criteria.logic) return 1
  if (!criteria.vision) return 2
  if (!criteria.kinesthesia) return 3
  return STAGES_QUIZ_QUESTION_COUNT
}

/**
 * Последовательная проверка: ответ засчитывается только на текущий открытый вопрос.
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {StagesQuizCriteria}
 */
export function collectStagesQuizCriteriaFromUserSequential(messages) {
  const criteria = emptyStagesQuizCriteria()

  for (const m of messages) {
    if (m.role !== 'user' || typeof m.content !== 'string' || !m.content.trim()) continue
    const text = m.content.trim()
    if (isOnboardingStagesUiMetaMessage(text) || isOnboardingStagesHelpMessage(text)) continue
    if (detectOnboardingSkipIntent(text)) continue

    const qIndex = stagesQuizQuestionIndexFromCriteria(criteria)
    if (qIndex >= STAGES_QUIZ_QUESTION_COUNT) break
    if (!evaluateOnboardingStagesAnswer(text, qIndex)) continue

    if (qIndex === 0) criteria.stageName = true
    else if (qIndex === 1) criteria.logic = true
    else if (qIndex === 2) criteria.vision = true
    else if (qIndex === 3) criteria.kinesthesia = true
  }

  return criteria
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {StagesQuizCriteria}
 */
export function collectStagesQuizCriteriaFromUser(messages) {
  return collectStagesQuizCriteriaFromUserSequential(messages)
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {StagesQuizCriteria}
 */
export function inferStagesQuizCriteriaFromTrainer(messages) {
  const criteria = emptyStagesQuizCriteria()
  for (const m of messages) {
    if (m.role !== 'assistant' || typeof m.content !== 'string') continue
    const text = m.content.trim()
    const lower = text.toLowerCase()
    if (/\?\s*$/.test(text) || /^вопрос \d/i.test(text)) continue

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
  return collectStagesQuizCriteriaFromUserSequential(messages)
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

Следующий у нас — «Знание». Как называется первый этап формирования навыка?`
  }
  if (persona.id === 'arkady') {
    return `Друг, любой удар растёт по шагам — четыре этапа:

${STAGES_LADDER}

Начинаем со «Знания». Как называется первый этап формирования навыка?`
  }
  return `Четыре этапа формирования навыка:

${STAGES_LADDER}

Первый этап — «Знание». Как он называется?`
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
  return isOnboardingStagesTheoryAnswerCorrect(text, questionIndex)
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} nextQuestionIndex 1..3
 */
function nextStagesQuizQuestion(personaId, nextQuestionIndex) {
  void personaId
  return formatOnboardingStagesTheoryPrompt(nextQuestionIndex)
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

function buildStagesQuizHelpReply(personaId, questionIndex) {
  const prompt = formatOnboardingStagesTheoryPrompt(questionIndex)
  if (questionIndex === 0) {
    if (personaId === 'vasily') {
      return `Первый из четырёх этапов — «Знание». Не «Умение» и не «Навык». ${prompt}`
    }
    if (personaId === 'arkady') {
      return `Друг, с чего всё начинается — этап «Знание». ${prompt}`
    }
    return `Первый этап формирования навыка — «Знание». ${prompt}`
  }
  if (questionIndex === 1) {
    if (personaId === 'vasily') {
      return `Логический образ — понимаешь, зачем и как выполняется, своими словами. ${prompt}`
    }
    if (personaId === 'arkady') {
      return `Логический — понимание шагов и смысла, не картинка и не тело. ${prompt}`
    }
    return `Логический образ: понимание «почему и как». ${prompt}`
  }
  if (questionIndex === 2) {
    if (personaId === 'vasily') {
      return `Зрительный — как выглядит правильно: в голове, на видео, у тренера. ${prompt}`
    }
    if (personaId === 'arkady') {
      return `Зрительный — чёткая картинка правильной формы. ${prompt}`
    }
    return `Зрительный образ: эталон формы. ${prompt}`
  }
  if (personaId === 'vasily') {
    return `Кинестетика — ощущение в мышцах, выполнил элемент сам. ${prompt}`
  }
  if (personaId === 'arkady') {
    return `Кинестетический — что чувствует тело, свой опыт в мышцах. ${prompt}`
  }
  return `Кинестетический образ: прочувствовать в теле. ${prompt}`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} questionIndex
 * @param {import('../constants/onboardingTheoryQuiz.js').OnboardingTheoryOption} wrongOption
 */
function wrongTheoryOptionReply(personaId, questionIndex, wrongOption) {
  if (questionIndex === 0) {
    if (personaId === 'vasily') {
      return `«${wrongOption.label}» — не первый этап. ${formatOnboardingStagesTheoryPrompt(0)}`
    }
    if (personaId === 'arkady') {
      return `Друг, «${wrongOption.label}» — это позже. ${formatOnboardingStagesTheoryPrompt(0)}`
    }
    return `Неверно. ${formatOnboardingStagesTheoryPrompt(0)}`
  }
  if (questionIndex === 1) return singleImageCorrectionReply(personaId, 'logic')
  if (questionIndex === 2) return singleImageCorrectionReply(personaId, 'vision')
  return singleImageCorrectionReply(personaId, 'kinesthesia')
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function scriptedOnboardingStagesReply(personaId, userMessage, messages) {
  const criteriaBefore = collectStagesQuizCriteriaFromUserSequential(messages.slice(0, -1))
  const qIndex = stagesQuizQuestionIndexFromCriteria(criteriaBefore)
  const passesBefore = countStagesQuizCriteria(criteriaBefore)
  const lower = userMessage.trim().toLowerCase()

  if (detectOnboardingSkipIntent(userMessage)) {
    return buildOnboardingSkipAllowReply(personaId)
  }

  if (qIndex >= STAGES_QUIZ_QUESTION_COUNT) {
    if (personaId === 'vasily') {
      return 'Всё засчитано. Жми зелёную «Дальше» внизу — не размазываем.'
    }
    if (personaId === 'arkady') {
      return 'Друг, все четыре ответа приняты. Жми «Дальше» внизу.'
    }
    return 'Четыре пункта закрыты. Кнопка «Дальше» внизу.'
  }

  if (isOnboardingStagesUiMetaMessage(userMessage) || /не горит|не актив|кнопк.*не|не могу нажать|не нажима/i.test(lower)) {
    const left = STAGES_QUIZ_QUESTION_COUNT - passesBefore
    if (personaId === 'vasily') {
      return `«Дальше» загорится после четырёх ответов. Сейчас ${passesBefore} из 4 — осталось ${left}. ${formatOnboardingStagesTheoryPrompt(qIndex)}`
    }
    if (personaId === 'arkady') {
      return `Друг, кнопка откроется после всех четырёх ответов. Сейчас ${passesBefore} из 4. ${formatOnboardingStagesTheoryPrompt(qIndex)}`
    }
    return `Засчитано ${passesBefore} из 4. ${formatOnboardingStagesTheoryPrompt(qIndex)}`
  }

  if (isOnboardingStagesHelpMessage(userMessage)) {
    return buildStagesQuizHelpReply(personaId, qIndex)
  }

  const chosen = findOnboardingStagesTheoryOption(userMessage, qIndex)
  if (chosen && !chosen.correct) {
    return wrongTheoryOptionReply(personaId, qIndex, chosen)
  }

  const passed = chosen?.correct === true || isOnboardingStagesTheoryAnswerCorrect(userMessage, qIndex)

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

  if (qIndex === 1 && (evaluateVisionImageAnswer(userMessage) || evaluateKinesthesiaImageAnswer(userMessage))) {
    return singleImageCorrectionReply(personaId, 'logic')
  }
  if (
    qIndex === 2 &&
    ((evaluateLogicImageAnswer(userMessage) && !evaluateVisionImageAnswer(userMessage)) ||
      evaluateKinesthesiaImageAnswer(userMessage))
  ) {
    return singleImageCorrectionReply(personaId, 'vision')
  }
  if (qIndex === 3 && evaluateLogicImageAnswer(userMessage) && !evaluateKinesthesiaImageAnswer(userMessage)) {
    return singleImageCorrectionReply(personaId, 'kinesthesia')
  }

  if (personaId === 'vasily') {
    return `Не то. Ответь своими словами или жми вариант. ${formatOnboardingStagesTheoryPrompt(qIndex)}`
  }
  if (personaId === 'arkady') {
    return `Друг, пока не сходится. Напиши или выбери вариант. ${formatOnboardingStagesTheoryPrompt(qIndex)}`
  }
  return `Пока неверно. Напишите ответ или выберите вариант. ${formatOnboardingStagesTheoryPrompt(qIndex)}`
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
