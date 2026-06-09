/** @typedef {{ id: string, label: string, correct: boolean }} OnboardingTheoryOption */

/** @typedef {{ id: string, question: string, options: OnboardingTheoryOption[] }} OnboardingTheoryQuestion */

import {
  evaluateKinesthesiaImageAnswer,
  evaluateLogicImageAnswer,
  evaluateVisionImageAnswer,
} from '../utils/portalKnowledgeThreeImages.js'

/** @type {OnboardingTheoryQuestion[]} */
export const ONBOARDING_STAGES_THEORY_QUESTIONS = [
  {
    id: 'first_stage',
    question: 'Как называется первый этап формирования навыка?',
    options: [
      { id: 'knowledge', label: 'Знание', correct: true },
      { id: 'skill', label: 'Умение', correct: false },
      { id: 'habit', label: 'Навык', correct: false },
    ],
  },
  {
    id: 'logic_image',
    question: 'Логический образ «Знания» — это…',
    options: [
      { id: 'logic', label: 'Понимаю, почему и как выполняется', correct: true },
      { id: 'vision', label: 'Вижу, как выглядит правильно', correct: false },
      { id: 'kinesthesia', label: 'Ощущение в мышцах при выполнении', correct: false },
    ],
  },
  {
    id: 'vision_image',
    question: 'Зрительный образ — это…',
    options: [
      { id: 'vision', label: 'Вижу / представляю правильную форму', correct: true },
      { id: 'logic', label: 'Понимаю логику шагов', correct: false },
      { id: 'kinesthesia', label: 'Прочувствовал в теле', correct: false },
    ],
  },
  {
    id: 'kinesthesia_image',
    question: 'Кинестетический образ — это…',
    options: [
      { id: 'kinesthesia', label: 'Ощущение в мышцах, выполнил элемент сам', correct: true },
      { id: 'vision', label: 'Вижу форму у тренера', correct: false },
      { id: 'logic', label: 'Понимаю, зачем каждый шаг', correct: false },
    ],
  },
]

/**
 * @param {number} questionIndex 0..3
 */
export function getOnboardingStagesTheoryQuestion(questionIndex) {
  return ONBOARDING_STAGES_THEORY_QUESTIONS[questionIndex] ?? null
}

/**
 * @param {number} questionIndex
 */
export function formatOnboardingStagesTheoryPrompt(questionIndex) {
  const q = getOnboardingStagesTheoryQuestion(questionIndex)
  if (!q) return ''
  return `Вопрос ${questionIndex + 1} из ${ONBOARDING_STAGES_THEORY_QUESTIONS.length}: ${q.question}`
}

/** @param {string} text */
export function evaluateKnowledgeStageNameAnswer(text) {
  const lower = String(text ?? '').trim().toLowerCase()
  if (!lower || lower.length < 2) return false
  if (/^(не\s+)?знаю\b|не\s+понимаю/i.test(lower)) return false
  if (/умени|навык|автомат/i.test(lower) && !/знан/i.test(lower)) return false
  return /знан/i.test(lower)
}

/**
 * @param {string} userMessage
 * @param {number} questionIndex
 */
export function evaluateOnboardingStagesFreeFormAnswer(userMessage, questionIndex) {
  if (isOnboardingStagesUiMetaMessage(userMessage) || isOnboardingStagesHelpMessage(userMessage)) {
    return false
  }
  const trimmed = String(userMessage ?? '').trim()
  if (trimmed.length < 2) return false

  if (questionIndex === 0) return evaluateKnowledgeStageNameAnswer(trimmed)
  if (questionIndex === 1) return evaluateLogicImageAnswer(trimmed)
  if (questionIndex === 2) return evaluateVisionImageAnswer(trimmed)
  if (questionIndex === 3) return evaluateKinesthesiaImageAnswer(trimmed)
  return false
}

/**
 * @param {string} userMessage
 * @param {number} questionIndex
 */
export function findOnboardingStagesTheoryOption(userMessage, questionIndex) {
  const q = getOnboardingStagesTheoryQuestion(questionIndex)
  if (!q) return null
  const trimmed = userMessage.trim()
  const lower = trimmed.toLowerCase()
  return (
    q.options.find(
      (o) => o.label.toLowerCase() === lower || o.id.toLowerCase() === lower || o.label === trimmed,
    ) ?? null
  )
}

/**
 * @param {string} userMessage
 * @param {number} questionIndex
 */
export function isOnboardingStagesTheoryAnswerCorrect(userMessage, questionIndex) {
  const option = findOnboardingStagesTheoryOption(userMessage, questionIndex)
  if (option) return option.correct
  return evaluateOnboardingStagesFreeFormAnswer(userMessage, questionIndex)
}

/** Свободный текст — служебные реплики про UI, не ответ на теорию. */
export function isOnboardingStagesUiMetaMessage(text) {
  return /не горит|не актив|кнопк|не могу нажать|не нажима/i.test(String(text ?? '').trim())
}

/** Просьба объяснить — не ответ, засчитывать нельзя. */
export function isOnboardingStagesHelpMessage(text) {
  return /не понял|не понима|повтор|ещё раз|объясн|помог/i.test(String(text ?? '').trim())
}

/** @deprecated Используйте isOnboardingStagesUiMetaMessage / isOnboardingStagesHelpMessage */
export function isOnboardingStagesMetaMessage(text) {
  return isOnboardingStagesUiMetaMessage(text) || isOnboardingStagesHelpMessage(text)
}
