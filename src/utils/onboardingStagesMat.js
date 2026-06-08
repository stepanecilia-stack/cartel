import { formatOnboardingStagesTheoryPrompt } from '../constants/onboardingTheoryQuiz.js'
import { formatPortalPersonaName } from '../constants/studentPortalPersonas.js'

/** @typedef {'four-stages' | 'logic' | 'vision' | 'kinesthesia' | 'quiz'} StagesMatPhase */

/** @type {StagesMatPhase[]} */
export const STAGES_MAT_PHASE_ORDER = ['four-stages', 'logic', 'vision', 'kinesthesia', 'quiz']

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {StagesMatPhase} phase
 */
export function buildStagesMatTrainerLine(personaId, phase) {
  if (phase === 'four-stages') {
    if (personaId === 'vasily') {
      return 'Слушай, не отвлекайся. Схема: любая техника — четыре этапа. Первый — «Знание». Запомни, потом спрашивать буду.'
    }
    if (personaId === 'arkady') {
      return 'Друг, смотри спокойно: любой удар растёт в четыре этапа. Первый — «Знание», с него и начинаем.'
    }
    return 'Четыре этапа формирования навыка. Первый — «Знание».'
  }
  if (phase === 'logic') {
    if (personaId === 'vasily') {
      return 'На «Знании» — три образа, не один для галочки. Первый логический: понимаешь, зачем так, а не «тренер сказал».'
    }
    if (personaId === 'arkady') {
      return 'На «Знании» собираем три образа, друг. Первый — логический: ты понимаешь, зачем каждый шаг, не просто копируешь.'
    }
    return 'Этап «Знание». Пункт 1 из 3: логический образ.'
  }
  if (phase === 'vision') {
    if (personaId === 'vasily') {
      return 'Второй — зрительный. Видишь, как выглядит правильно: видео, тренер, картинка в голове.'
    }
    if (personaId === 'arkady') {
      return 'Второй образ — зрительный. Чётко представляешь правильное выполнение.'
    }
    return 'Второй образ — зрительный.'
  }
  if (phase === 'kinesthesia') {
    if (personaId === 'vasily') {
      return 'Третий — кинестетика. Прочувствовал в мышцах, прожил на себе — не «ну типа понял».'
    }
    if (personaId === 'arkady') {
      return 'Третий образ — кинестетический. Ощущение в теле, свой опыт в мышцах.'
    }
    return 'Третий образ — кинестетический: прочувствовать элемент в теле.'
  }
  return ''
}

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 */
export function buildOnboardingStagesQuizOpener(persona) {
  const name = formatPortalPersonaName(persona)
  const q1 = formatOnboardingStagesTheoryPrompt(0)
  if (persona.id === 'vasily') {
    return `Ну что, ${name} на связи. Картинки смотрел — или только кивал? Проверим. ${q1}`
  }
  if (persona.id === 'arkady') {
    return `Друг, картинки разобрали — проверим, что запомнилось. ${q1}`
  }
  return `Материал просмотрен. ${q1}`
}

/**
 * @param {StagesMatPhase} phase
 */
export function stagesMatContinueLabel(phase) {
  if (phase === 'kinesthesia') return 'К проверке'
  return 'Дальше'
}
