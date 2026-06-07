/** Варианты цели — черновик для обсуждения с тренером (легко менять id/тексты). */
export const TRAINING_GOAL_OPTIONS = [
  {
    id: 'technique',
    title: 'Освоить технику',
    subtitle: 'Понять каждый приём по программе Cartel',
  },
  {
    id: 'stronger',
    title: 'Стать сильнее',
    subtitle: 'Нормативы, физика, выносливость',
  },
  {
    id: 'ring',
    title: 'Выйти на ринг',
    subtitle: 'Спарринги и соревнования',
  },
  {
    id: 'explore',
    title: 'Пока разбираюсь',
    subtitle: 'Занимаюсь и смотрю, куда расти',
  },
]

export const MOTOR_SKILL_STAGES = [
  { key: 'knowledge', label: 'Знание', active: true },
  { key: 'skill', label: 'Умение', active: false },
  { key: 'habit', label: 'Навык', active: false },
  { key: 'automation', label: 'Автоматизация', active: false },
]

export const KNOWLEDGE_THREE_IMAGES = [
  {
    key: 'logic',
    title: 'Логический образ',
    text: 'Понимаешь, почему приём делается именно так — можешь объяснить своими словами.',
  },
  {
    key: 'vision',
    title: 'Зрительный образ',
    text: 'Видишь правильное выполнение: ролик, демонстрация, картинка в голове.',
  },
  {
    key: 'kinesthesia',
    title: 'Кинестетика',
    text: 'Прочувствовал движение телом — знаешь, какие мышцы работают.',
  },
]

/** @typedef {'welcome' | 'goal' | 'path' | 'knowledge-what' | 'logic' | 'vision' | 'kinesthesia' | 'knowledge-rule'} OnboardingStepId */

/** @type {OnboardingStepId[]} */
export const ONBOARDING_STEP_ORDER = [
  'welcome',
  'goal',
  'path',
  'knowledge-what',
  'logic',
  'vision',
  'kinesthesia',
  'knowledge-rule',
]

/** Шаги «Как учить» без выбора цели. */
export const KNOWLEDGE_GUIDE_STEP_ORDER = ONBOARDING_STEP_ORDER.filter((id) => id !== 'welcome' && id !== 'goal')

/** @param {unknown} raw */
export function normalizePortalTrainingGoal(raw) {
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (!id) return null
  return TRAINING_GOAL_OPTIONS.some((o) => o.id === id) ? id : null
}

/** @param {object | null | undefined} student */
export function isPortalOnboardingComplete(student) {
  return Boolean(student?.portalOnboardingCompletedAt)
}

/** @param {string | null | undefined} goalId */
export function trainingGoalLabel(goalId) {
  const id = normalizePortalTrainingGoal(goalId)
  if (!id) return null
  return TRAINING_GOAL_OPTIONS.find((o) => o.id === id)?.title ?? null
}
