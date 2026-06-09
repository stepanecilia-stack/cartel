import {
  excerptDetailVideoTranscript,
  getAtomDetailVideoTranscript,
} from '../data/technicalProgramAtomVideoTranscripts.js'
import { getAtomTeachingCopy } from './programAtomChat.js'

/** @typedef {'video1' | 'video2' | 'mirror' | 'motorStages' | 'questions'} TechniqueInstructionStep */

/** @type {TechniqueInstructionStep[]} */
export const TECHNIQUE_INSTRUCTION_STEPS = ['video1', 'video2', 'mirror', 'questions']

/** Первый элемент: образы на видео + зеркало + схема четырёх этапов. */
export const FIRST_ATOM_TECHNIQUE_STEPS = ['video1', 'video2', 'mirror', 'motorStages', 'questions']

/**
 * @param {boolean} isFirstAtom
 * @returns {TechniqueInstructionStep[]}
 */
export function getTechniqueInstructionSteps(isFirstAtom) {
  return isFirstAtom ? FIRST_ATOM_TECHNIQUE_STEPS : TECHNIQUE_INSTRUCTION_STEPS
}

/**
 * @param {TechniqueInstructionStep} step
 * @returns {('vision' | 'logic' | 'kinesthesia')[]}
 */
export function getTechniqueActiveKnowledgeKeys(step) {
  if (step === 'video1') return ['vision']
  if (step === 'video2') return ['vision', 'logic']
  if (step === 'mirror') return ['kinesthesia']
  return []
}

/** @deprecated Используйте getTechniqueActiveKnowledgeKeys */
export function getTechniqueKnowledgeVisual(step, isFirstAtom) {
  void isFirstAtom
  const keys = getTechniqueActiveKnowledgeKeys(step)
  if (keys.length === 0) return null
  return { keys, caption: '' }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 * @param {TechniqueInstructionStep} step
 * @param {boolean} [isFirstAtom]
 */
export function buildTechniqueInstructionLine(personaId, atom, step, isFirstAtom = false) {
  const { name } = getAtomTeachingCopy(atom)

  if (step === 'video1') {
    if (isFirstAtom) {
      if (personaId === 'vasily') {
        return `«${name}». Первое видео — зрительный образ. Смотри картинку и ролик: ярко показано место в стойке.`
      }
      if (personaId === 'arkady') {
        return `Начнём с «${name}». Первое видео формирует зрительный образ — ярко видно, где ты стоишь.`
      }
      return `Первое видео — зрительный образ «${name}».`
    }
    if (personaId === 'vasily') {
      return `«${name}». Первое видео — зрительный образ. Смотри ролик: ярко показано место в стойке.`
    }
    if (personaId === 'arkady') {
      return `Начнём с «${name}». Первое видео — смотри внимательно: ярко показано место, где ты должен быть.`
    }
    return `Шаг 1. «${name}» — первое видео. Ярко отмечено место в стойке.`
  }

  if (step === 'video2') {
    const videoBrief = excerptDetailVideoTranscript(getAtomDetailVideoTranscript(atom), 140)
    const listenHint = videoBrief
      ? ` Слушай объяснение: ${videoBrief}`
      : ' Слушай объяснение на ролике — логика в звуке.'
    if (isFirstAtom) {
      if (personaId === 'vasily') {
        return `Второе видео — зрительный плюс логический образ.${listenHint}`
      }
      if (personaId === 'arkady') {
        return `Второй ролик — зрение и логика вместе. «${name}» — смотри и слушай.${listenHint}`
      }
      return `Второе видео — зрительный + логический образ «${name}».${listenHint}`
    }
    if (personaId === 'vasily') {
      return `Шаг 2 — второе видео с объяснением.${listenHint} Досмотри до конца.`
    }
    if (personaId === 'arkady') {
      return `Второй ролик — со звуком и логикой «${name}».${listenHint}`
    }
    return `Шаг 2. Второе видео — зрительный + логический образ.${listenHint}`
  }

  if (step === 'mirror') {
    if (isFirstAtom) {
      if (personaId === 'vasily') {
        return `Попробуй сам перед зеркалом — кинестетический образ. Как выглядит зона — смотри в «Как учить». Проживи «${name}» в теле.`
      }
      if (personaId === 'arkady') {
        return `Попробуй сам перед зеркалом — кинестетический образ. Зону зеркала мы разбирали в «Как учить». Почувствуй «${name}» мышцами.`
      }
      return `Попробуй перед зеркалом — кинестетический образ «${name}». Наглядность — в разделе «Как учить».`
    }
    if (personaId === 'vasily') {
      return `Встань перед зеркалом и проживи «${name}» в теле. Схему зоны смотрел в «Как учить» — без зеркала кинестетики не будет.`
    }
    if (personaId === 'arkady') {
      return `Попробуй перед зеркалом. Картинку зоны помнишь из «Как учить»? Прочувствуй «${name}» мышцами.`
    }
    return `Попробуй «${name}» перед зеркалом. Подсказка по зоне — в «Как учить».`
  }

  if (step === 'motorStages') {
    if (personaId === 'vasily') {
      return `Три образа собраны — это только «Знание». Четыре этапа смотри в «Как учить». Впереди ещё «Умение», «Навык», «Автоматизация» — не обольщайся.`
    }
    if (personaId === 'arkady') {
      return `Друг, «Знание» по «${name}» — первый этап. Полную схему четырёх этапов мы разбирали в «Как учить». Впереди ещё много работы с тренером.`
    }
    return `«Знание» по «${name}» — старт. Схема этапов — в «Как учить»; «Умение», «Навык», «Автоматизация» — на тренировках.`
  }

  if (personaId === 'vasily') {
    return `Шаг 5. Вопросы по «${name}» — пиши сюда. Шаг 6 — жми «Понял» и идём к следующему элементу по той же схеме.`
  }
  if (personaId === 'arkady') {
    return `Если что неясно по «${name}» — спроси меня в чате. Когда готов — жми «Понял», дальше так же.`
  }
  return `Вопросы по элементу — в чат. Затем «Понял» — следующий приём по той же схеме.`
}

/**
 * @param {TechniqueInstructionStep} step
 * @param {boolean} [isFirstAtom]
 */
export function techniqueInstructionStepHint(step, isFirstAtom = false) {
  const total = isFirstAtom ? 6 : 5
  if (step === 'video1') {
    return isFirstAtom
      ? `Шаг 1 из ${total}: видео — зрительный образ.`
      : `Шаг 1 из ${total}: первое видео — место в кадре.`
  }
  if (step === 'video2') {
    return isFirstAtom
      ? `Шаг 2 из ${total}: видео — зрительный + логический образ.`
      : `Шаг 2 из ${total}: второе видео — где руки и корпус.`
  }
  if (step === 'mirror') {
    return isFirstAtom
      ? `Шаг 3 из ${total}: попробуй сам перед зеркалом — кинестетический образ.`
      : `Шаг 3 из ${total}: попробуй сам перед зеркалом.`
  }
  if (step === 'motorStages') return `Шаг 4 из ${total}: четыре этапа навыка — вы на «Знании».`
  return isFirstAtom ? `Шаг 5–6: вопросы тренеру → «Понял».` : 'Шаг 4–5: вопросы тренеру → «Понял».'
}

/**
 * Открывающая реплика чата на шаге вопросов — без повторного «здравствуй».
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 */
export function buildTechniqueQuestionsOpener(personaId, atom) {
  const { name } = getAtomTeachingCopy(atom)
  if (personaId === 'vasily') {
    return `Вопросы по «${name}» — пиши сюда. Нет вопросов — жми «Понял» и идём дальше.`
  }
  if (personaId === 'arkady') {
    return `Друг, если что неясно по «${name}» — спроси. Всё понятно — жми «Понял».`
  }
  if (personaId === 'gleb') {
    return `Если есть вопросы по «${name}» — спрашивай. Если нет — жми «Понял».`
  }
  return `Если есть вопросы по «${name}» — спрашивай. Если нет — жми «Понял».`
}

/**
 * @param {TechniqueInstructionStep} step
 */
export function techniqueInstructionAdvanceLabel(step) {
  if (step === 'mirror') return 'Сделал перед зеркалом'
  if (step === 'motorStages') return 'Понятно — к вопросам'
  if (step === 'questions') return null
  return 'Дальше'
}
