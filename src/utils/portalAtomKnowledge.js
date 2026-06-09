import {
  excerptDetailVideoTranscript,
  getAtomDetailVideoTranscript,
} from '../data/technicalProgramAtomVideoTranscripts.js'
import { getAtomTeachingCopy } from './programAtomChat.js'

export const ATOM_KNOWLEDGE_ONLY_PROMPT_BLOCK = `# Только база Cartel по текущему элементу
- Факты бери ТОЛЬКО из блока «Технический элемент» ниже — это единственный источник.
- Блок «Транскрипт подробного ролика» — что именно происходит и озвучивается на втором WebM (зрительный + логический). Опирайся на него, когда ученик спрашивает про видео, звук или объяснение.
- ЗАПРЕЩЕНО: интернет, учебники, «в боксе обычно», чужие школы, выдуманные детали, другие элементы программы.
- Если вопрос не про этот элемент — коротко верни к «{name}».
- Если в карточке нет ответа — честно скажи, что в материале этого нет; не додумывай.
- Весь диалог — только про «{name}».

# Как отвечать живо (не как справочник)
- НИКОГДА не вставляй карточку целиком и не перечисляй все пункты подряд — отвечай на конкретные слова ученика 2–4 фразами своими словами.
- На «ок», «да», «понятно» — коротко прими, спроси что ещё смущает по элементу или предложи жать «Понял», если готов.
- На «поможешь научиться» / общий запрос — в своём характере, один конкретный шаг по «{name}», без лекции.
- На точный вопрос — дай суть из карточки, но перефразируй как тренер в чате, не копируй текст дословно.`

const EXTERNAL_BOXING_PATTERNS = [
  /в\s+боксе\s+обычно/,
  /как\s+правило\s+в\s+боксе/,
  /по\s+учебнику/,
  /тренеры\s+рекомендуют/,
  /олимпийск/,
  /профессионал/,
  /майвезер|тайсон|ломаченко|пацификатор/i,
  /другие\s+школы/,
  /в\s+интернете/,
  /по\s+стандартам\s+аиба/i,
]

/**
 * AI ушёл во внешние источники или «общий бокс».
 * @param {string} reply
 */
export function aiReplyUsesExternalBoxingKnowledge(reply) {
  const lower = String(reply ?? '').toLowerCase().replace(/ё/g, 'е')
  return EXTERNAL_BOXING_PATTERNS.some((re) => re.test(lower))
}

/**
 * @param {object | null | undefined} atom
 */
export function getAtomKnowledgeCopy(atom) {
  const base = getAtomTeachingCopy(atom)
  return {
    ...base,
    mistakes: typeof atom?.mistakes === 'string' ? atom.mistakes.trim() : '',
    whyMistakes: typeof atom?.whyMistakes === 'string' ? atom.whyMistakes.trim() : '',
    detailVideoTranscript: getAtomDetailVideoTranscript(atom),
    number: atom?.number != null ? String(atom.number) : '',
  }
}

/**
 * @param {object | null | undefined} atom
 */
export function formatAtomKnowledgeBlockForPrompt(atom) {
  const copy = getAtomKnowledgeCopy(atom)
  if (!copy.name) return ''

  const lines = [`Элемент: «${copy.name}»`]
  if (copy.number) lines.push(`Номер в программе: ${copy.number}`)
  if (copy.howTo) lines.push(`Как выполнять:\n${copy.howTo}`)
  if (copy.whyHowTo) lines.push(`Зачем / логика:\n${copy.whyHowTo}`)
  if (copy.mistakes) lines.push(`Типичные ошибки:\n${copy.mistakes}`)
  if (copy.whyMistakes) lines.push(`Почему это ошибки:\n${copy.whyMistakes}`)
  if (copy.detailVideoTranscript) {
    lines.push(
      `Транскрипт подробного ролика (2-й слайд карусели, WebM со звуком — что происходит на видео):\n${copy.detailVideoTranscript}`,
    )
  }

  return lines.join('\n\n')
}

/**
 * @param {object | null | undefined} atom
 */
export function buildAtomKnowledgeCorpus(atom) {
  return formatAtomKnowledgeBlockForPrompt(atom).toLowerCase().replace(/ё/g, 'е')
}

/**
 * Краткая выжимка транскрипта для реплики тренера у второго ролика.
 * @param {object | null | undefined} atom
 * @param {number} [maxLen]
 */
export function buildAtomDetailVideoBrief(atom, maxLen = 200) {
  return excerptDetailVideoTranscript(getAtomDetailVideoTranscript(atom), maxLen)
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object} atom
 * @param {string} body
 */
function wrapAtomAnswer(personaId, atom, body) {
  const { name } = getAtomKnowledgeCopy(atom)
  const text = body.trim()
  if (personaId === 'vasily') {
    return `По «${name}»: ${text}`
  }
  if (personaId === 'arkady') {
    return `Друг, по «${name}»: ${text}`
  }
  return `«${name}»: ${text}`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} _messages
 * @param {object} atom
 */
export function scriptedProgramElementReply(personaId, userMessage, _messages, atom) {
  const copy = getAtomKnowledgeCopy(atom)
  const lower = userMessage.trim().toLowerCase().replace(/ё/g, 'е')
  if (!lower) {
    if (personaId === 'vasily') {
      return `Спрашивай про «${copy.name}» — разберём по делу.`
    }
    if (personaId === 'arkady') {
      return `Друг, здесь «${copy.name}». Что именно не село?`
    }
    return `Вопрос по «${copy.name}» — сформулируй конкретно.`
  }

  if (/^(ок|ok|да|ага|угу|понятно|ясно|хорошо|ладно|спасибо|thanks)\.?$/i.test(lower)) {
    if (personaId === 'vasily') {
      return `Ок. Если по «${copy.name}» всё ясно — жми «Понял». Если нет — спроси одну конкретную вещь.`
    }
    if (personaId === 'arkady') {
      return `Хорошо, друг. Что-то ещё смущает в «${copy.name}» — или готов жать «Понял»?`
    }
    return `Принято. Уточни по «${copy.name}» или нажми «Понял», если готов двигаться дальше.`
  }

  if (/видео|ролик|втором|объяснен|что там|что говор|озвуч|на видео|со звуком/i.test(lower)) {
    if (copy.detailVideoTranscript) {
      return wrapAtomAnswer(
        personaId,
        atom,
        excerptDetailVideoTranscript(copy.detailVideoTranscript, 320),
      )
    }
  }

  if (/помож|науч|научиш|научи|сможешь|помоги|научиться/i.test(lower)) {
    const fromVideo = excerptDetailVideoTranscript(copy.detailVideoTranscript, 160)
    const step =
      copy.howTo?.split(/\n/)[0]?.replace(/^\d+\.\s*/, '').trim() || fromVideo
    if (personaId === 'vasily') {
      return step
        ? `Помогу — но только по «${copy.name}». Начни с первого: ${step}. Спроси, если затык.`
        : `Помогу по «${copy.name}». Скажи, что именно не получается.`
    }
    if (personaId === 'arkady') {
      return step
        ? `Конечно, друг. По «${copy.name}» начни с простого: ${step}. Я рядом — спрашивай.`
        : `Конечно, друг. Разберём «${copy.name}» — что именно хочешь прояснить?`
    }
    return step
      ? `По «${copy.name}» первый шаг: ${step}. Уточни, если нужна деталь.`
      : `Разберём «${copy.name}». Сформулируй, что именно непонятно.`
  }

  if (/другой элемент|следующий приём|другую стойк|про удар|про защит|весь бокс|бокс вообще/i.test(lower)) {
    if (personaId === 'vasily') {
      return `Сейчас только «${copy.name}». Остальное потом — не размазываем.`
    }
    if (personaId === 'arkady') {
      return `Друг, сейчас разбираем «${copy.name}». К другим элементам перейдём позже.`
    }
    return `Фокус: «${copy.name}». Другие элементы — не в этом окне.`
  }

  if (/ошибк|неправильн|косяк|широк|узк|ширин|уже плеч/i.test(lower)) {
    if (copy.mistakes) {
      const why = copy.whyMistakes ? ` ${copy.whyMistakes}` : ''
      return wrapAtomAnswer(personaId, atom, `${copy.mistakes}${why}`)
    }
    return wrapAtomAnswer(
      personaId,
      atom,
      'В карточке элемента типичные ошибки не перечислены — уточни у очного тренера.',
    )
  }

  if (/зачем|почему|логик|смысл|зачем так/i.test(lower)) {
    if (copy.whyHowTo) {
      return wrapAtomAnswer(personaId, atom, copy.whyHowTo)
    }
    if (copy.detailVideoTranscript) {
      return wrapAtomAnswer(
        personaId,
        atom,
        excerptDetailVideoTranscript(copy.detailVideoTranscript, 280),
      )
    }
  }

  if (/как|выполн|сто|ног|рук|корпус|смотр|подбород|живот|спин/i.test(lower)) {
    if (copy.howTo) {
      return wrapAtomAnswer(personaId, atom, copy.howTo)
    }
    if (copy.detailVideoTranscript) {
      return wrapAtomAnswer(
        personaId,
        atom,
        excerptDetailVideoTranscript(copy.detailVideoTranscript, 280),
      )
    }
  }

  if (/назван|как называ|это что/i.test(lower)) {
    return wrapAtomAnswer(personaId, atom, `Элемент называется «${copy.name}».`)
  }

  if (personaId === 'vasily') {
    return `По «${copy.name}» — уточни одним вопросом: ноги, руки, корпус, ошибки или зачем так?`
  }
  if (personaId === 'arkady') {
    return `Друг, по «${copy.name}» спроси конкретнее — что именно не сходится?`
  }
  return `По «${copy.name}» — что именно разобрать: выполнение, логика или типичные ошибки?`
}

/**
 * @param {object} atom
 */
export function buildAtomProgramHint(atom) {
  return formatAtomKnowledgeBlockForPrompt(atom)
}
