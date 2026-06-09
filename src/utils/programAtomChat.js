import { MARKER_QUIZ_PASS } from './personaChatMarkers.js'
import {
  excerptDetailVideoTranscript,
  getAtomDetailVideoTranscript,
} from '../data/technicalProgramAtomVideoTranscripts.js'

/** Заглушки, пока в каталоге нет полных описаний атомов. */
export const ATOM_TEACHING_FALLBACKS = {
  atom_1: {
    howTo:
      'Фронтальная стойка — базовое положение: корпус фронтально к партнёру, ноги устойчиво, руки у подбородка, взгляд вперёд.',
    whyHowTo: 'Без правильной стойки не построишь передвижение и удары — это фундамент программы.',
    logicHint:
      'Логика: стойка даёт баланс и готовность к любому действию из одной исходной точки.',
  },
}

/**
 * @param {object | null | undefined} atom
 */
export function getAtomTeachingCopy(atom) {
  const fallback = ATOM_TEACHING_FALLBACKS[atom?.id] ?? {}
  const name = typeof atom?.name === 'string' ? atom.name.trim() : 'элемент'
  return {
    name,
    howTo: (typeof atom?.howTo === 'string' && atom.howTo.trim()) || fallback.howTo || '',
    whyHowTo:
      (typeof atom?.whyHowTo === 'string' && atom.whyHowTo.trim()) || fallback.whyHowTo || '',
    logicHint: fallback.logicHint || '',
  }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 */
export function buildFirstAtomWelcome(personaId) {
  if (personaId === 'vasily') {
    return 'Тесты закрыты — молодец, не развалился. Переходим к обучению: первый элемент программы. Без стойки дальше не пойдём.'
  }
  if (personaId === 'arkady') {
    return 'Друг, с тестами справился — красава. Теперь учимся по-настоящему: начнём с первого элемента программы.'
  }
  if (personaId === 'gleb') {
    return 'Инструктаж принят. Переходим к практике — первый технический элемент. Смотри внимательно.'
  }
  return 'Тесты пройдены. Переходим к обучению — первый элемент программы.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 */
export function buildVisualSlideTrainerLine(personaId, atom) {
  const { name } = getAtomTeachingCopy(atom)
  if (personaId === 'vasily') {
    return `Первое видео — зрительный образ. Смотри «${name}» и запомни форму. Без картинки в голове дальше не лезем.`
  }
  if (personaId === 'arkady') {
    return `Первый ролик — чисто зрительный образ «${name}». Спокойно смотри, зафиксируй, как это выглядит.`
  }
  return `Зрительный образ: смотри «${name}» и запомни правильную форму.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 */
export function buildLogicSlideTrainerLine(personaId, atom) {
  const { name, howTo, logicHint, whyHowTo } = getAtomTeachingCopy(atom)
  const fromVideo = excerptDetailVideoTranscript(getAtomDetailVideoTranscript(atom), 220)
  const logic = fromVideo || logicHint || whyHowTo || howTo
  if (personaId === 'vasily') {
    return `Второе видео — зрительный плюс логический. «${name}»: ${logic}`
  }
  if (personaId === 'arkady') {
    return `Второй ролик — со звуком и логикой. «${name}»: ${logic}`
  }
  return `«${name}» — на видео: ${logic}`
}

/**
 * @param {object} atom
 * @returns {Array<{ evaluate: (text: string) => boolean }>}
 */
export function getAtomQuizChecks(atom) {
  const { name, howTo } = getAtomTeachingCopy(atom)
  const nameRoot = name.split(/\s+/)[0]?.slice(0, 6) || 'элем'
  const checks = [
    {
      evaluate: (text) => {
        const lower = text.trim().toLowerCase()
        if (!lower || lower.length < 2) return false
        return new RegExp(nameRoot, 'i').test(lower) || /фронтальн|стойк/i.test(lower)
      },
    },
  ]
  if (howTo) {
    checks.push({
      evaluate: (text) => {
        const lower = text.trim().toLowerCase()
        if (!lower || lower.length < 4) return false
        return /стойк|баланс|рук|ног|корпус|фронтал|исходн|баз/i.test(lower)
      },
    })
  }
  return checks
}

export function getAtomQuizQuestionCount(atom) {
  return getAtomQuizChecks(atom).length
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @param {object} atom
 */
export function deriveProgramAtomQuizPasses(messages, atom) {
  const checks = getAtomQuizChecks(atom)
  const criteria = checks.map(() => false)

  for (const m of messages) {
    if (m.role !== 'user' || typeof m.content !== 'string' || !m.content.trim()) continue
    for (let i = 0; i < checks.length; i++) {
      if (!criteria[i] && checks[i].evaluate(m.content)) {
        criteria[i] = true
        break
      }
    }
  }

  return criteria.filter(Boolean).length
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @param {object} atom
 */
export function programAtomQuizQuestionIndex(messages, atom) {
  return Math.min(getAtomQuizQuestionCount(atom), deriveProgramAtomQuizPasses(messages, atom))
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 * @param {number} questionIndex
 */
function nextAtomQuizQuestion(personaId, atom, questionIndex) {
  const { name } = getAtomTeachingCopy(atom)
  if (questionIndex === 0) {
    if (personaId === 'vasily') return `Вопрос 1: как называется этот элемент?`
    if (personaId === 'arkady') return `Вопрос 1: как называется приём?`
    return `Вопрос 1: название элемента «${name}»?`
  }
  if (personaId === 'vasily') return `Вопрос 2: своими словами — суть «${name}».`
  if (personaId === 'arkady') return `Вопрос 2: объясни своими словами, что такое «${name}».`
  return `Вопрос 2: суть «${name}» своими словами.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 */
export function buildProgramAtomQuizOpener(personaId, atom) {
  const { name } = getAtomTeachingCopy(atom)
  const total = getAtomQuizQuestionCount(atom)
  if (personaId === 'vasily') {
    return `«Понял» нажал — проверяю. ${total} вопроса по «${name}». ${nextAtomQuizQuestion(personaId, atom, 0)}`
  }
  if (personaId === 'arkady') {
    return `Друг, «Понял» вижу — короткая проверка по «${name}». ${nextAtomQuizQuestion(personaId, atom, 0)}`
  }
  return `Проверка по «${name}». ${nextAtomQuizQuestion(personaId, atom, 0)}`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 */
export function buildProgramAtomMirrorLine(personaId, atom) {
  const { name } = getAtomTeachingCopy(atom)
  if (personaId === 'vasily') {
    return `Засчитано. Теперь не отмазывайся — встань перед зеркалом и проживи «${name}» в теле. Кинестетика без зеркала — пустая болтовня.`
  }
  if (personaId === 'arkady') {
    return `Верно, друг. Теперь попробуй «${name}» перед зеркалом — прочувствуй в мышцах, не только в голове.`
  }
  return `Принято. Попробуй «${name}» перед зеркалом — закрепи ощущение в теле.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @param {object} atom
 */
export function scriptedProgramAtomReply(personaId, userMessage, messages, atom) {
  const checks = getAtomQuizChecks(atom)
  const total = checks.length
  const qIndex = programAtomQuizQuestionIndex(messages, atom)
  const lower = userMessage.trim().toLowerCase()

  if (qIndex >= total) {
    return `${buildProgramAtomMirrorLine(personaId, atom)} Когда отработаешь — жми «Готово» внизу.`
  }

  const passed = checks[qIndex]?.evaluate(userMessage)

  if (passed) {
    const ack =
      personaId === 'vasily'
        ? 'Верно.'
        : personaId === 'arkady'
          ? 'Так и есть, друг.'
          : 'Засчитано.'
    if (qIndex === total - 1) {
      return `${ack} ${MARKER_QUIZ_PASS}\n\n${buildProgramAtomMirrorLine(personaId, atom)} Жми «Готово» внизу.`
    }
    return `${ack} ${MARKER_QUIZ_PASS}\n\n${nextAtomQuizQuestion(personaId, atom, qIndex + 1)}`
  }

  if (qIndex === 0) {
    const { name } = getAtomTeachingCopy(atom)
    if (personaId === 'vasily') return `Мимо. Элемент называется «${name}». Повтори.`
    if (personaId === 'arkady') return `Друг, это «${name}». Назови ещё раз.`
    return `Неверно. Ответ — «${name}».`
  }

  if (personaId === 'vasily') {
    return 'Слабо. Объясни своими словами: зачем эта стойка и из чего она состоит.'
  }
  if (personaId === 'arkady') {
    return 'Почти. Сформулируй суть своими словами — баланс, руки, ноги, готовность.'
  }
  return 'Нужна суть своими словами — опора, руки, корпус.'
}

/**
 * @param {object} atom
 */
export function buildProgramAtomHint(atom) {
  const copy = getAtomTeachingCopy(atom)
  const mistakes = typeof atom?.mistakes === 'string' ? atom.mistakes.trim() : ''
  const whyMistakes = typeof atom?.whyMistakes === 'string' ? atom.whyMistakes.trim() : ''
  const parts = [`Первый атом: «${copy.name}»`]
  if (copy.howTo) parts.push(`Как: ${copy.howTo}`)
  if (copy.whyHowTo) parts.push(`Зачем: ${copy.whyHowTo}`)
  if (mistakes) parts.push(`Ошибки: ${mistakes}`)
  if (whyMistakes) parts.push(`Почему ошибки: ${whyMistakes}`)
  const videoBrief = excerptDetailVideoTranscript(getAtomDetailVideoTranscript(atom), 180)
  if (videoBrief) parts.push(`Подробный ролик: ${videoBrief}`)
  parts.push(`Квиз: ${getAtomQuizQuestionCount(atom)} вопроса после «Понял»`)
  return parts.join('. ')
}
