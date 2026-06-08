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
      return 'Слушай, не отвлекайся. Схема: любая техника — четыре этапа. Следующий у нас «Знание». Запомни, потом спрашивать буду.'
    }
    if (personaId === 'arkady') {
      return 'Друг, смотри спокойно: любой удар растёт в четыре этапа. Мы начнём со «Знания» — шаг за шагом, без спешки.'
    }
    return 'Четыре этапа формирования навыка. Следующий по протоколу — «Знание».'
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
      return 'Третий — кинестетика. Все три образа — это и есть «Знание». Кнопка «Понял» — когда они сформированы.'
    }
    if (personaId === 'arkady') {
      return 'Третий — кинестетика. Три образа вместе — это «Знание». «Понял» — просто фиксируешь это на платформе.'
    }
    return 'Третий образ — кинестетический. «Знание» = все три. «Понял» — кнопка после них.'
  }
  return ''
}

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 */
export function buildOnboardingStagesQuizOpener(persona) {
  const name = formatPortalPersonaName(persona)
  if (persona.id === 'vasily') {
    return `Ну что, ${name} на связи. Картинки смотрел — или только кивал? Проверим. Как называется наш следующий этап?`
  }
  if (persona.id === 'arkady') {
    return `Друг, картинки разобрали — ты молодец, что дошёл. Давай проверим: как называется этап, с которого начинаем?`
  }
  return `Материал просмотрен. Вопрос 1 из 4: как называется следующий этап?`
}

/**
 * @param {StagesMatPhase} phase
 */
export function stagesMatContinueLabel(phase) {
  if (phase === 'kinesthesia') return 'К проверке'
  return 'Дальше'
}
