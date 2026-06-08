/** Цели занятий — можно выбрать несколько. */
export const TRAINING_GOAL_OPTIONS = [
  { id: 'boxing_from_zero', title: 'Научиться боксу с нуля' },
  { id: 'fitness', title: 'Улучшить физическую форму' },
  { id: 'competition', title: 'Подготовиться к соревнованиям' },
  { id: 'self_defense', title: 'Научиться защищаться' },
  { id: 'child_martial', title: 'Подготовить ребенка к занятиям единоборствами' },
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
    text: 'Ты понимаешь, почему элемент выполняется именно так, и можешь объяснить своими словами.',
  },
  {
    key: 'vision',
    title: 'Зрительный образ',
    text: 'Ты четко представляешь / видишь правильное выполнение: в памяти, на видео или в исполнении тренера.',
  },
  {
    key: 'kinesthesia',
    title: 'Кинестетика',
    text: 'Кинестетический образ — ты прочувствовал элемент своими мышцами и можешь воспроизвести его по ощущениям тела.',
  },
]

/** @typedef {'welcome' | 'goal' | 'persona' | 'trainer-greeting' | 'path' | 'knowledge-what' | 'logic' | 'vision' | 'kinesthesia' | 'knowledge-rule'} OnboardingStepId */

/** @type {OnboardingStepId[]} */
export const ONBOARDING_STEP_ORDER = [
  'welcome',
  'goal',
  'persona',
  'trainer-greeting',
  'path',
  'knowledge-what',
  'logic',
  'vision',
  'kinesthesia',
  'knowledge-rule',
]

export const KNOWLEDGE_GUIDE_STEP_ORDER = ONBOARDING_STEP_ORDER.filter(
  (id) => id !== 'welcome' && id !== 'goal' && id !== 'persona' && id !== 'trainer-greeting',
)

const GOAL_IDS = new Set(TRAINING_GOAL_OPTIONS.map((o) => o.id))

/** @param {unknown} raw */
export function normalizePortalTrainingGoals(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw.trim() ? [raw.trim()] : []
  const out = []
  for (const item of list) {
    const id = typeof item === 'string' ? item.trim() : ''
    if (id && GOAL_IDS.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

/** @param {object | null | undefined} student */
export function isPortalOnboardingComplete(student) {
  return Boolean(student?.portalOnboardingCompletedAt)
}

/** @param {unknown} goalsRaw */
export function trainingGoalsLabels(goalsRaw) {
  const ids = normalizePortalTrainingGoals(goalsRaw)
  if (ids.length === 0) return []
  return ids.map((id) => TRAINING_GOAL_OPTIONS.find((o) => o.id === id)?.title).filter(Boolean)
}

/** @deprecated одиночная цель — для старых карточек */
export function trainingGoalLabel(goalId) {
  return trainingGoalsLabels(goalId)[0] ?? null
}
