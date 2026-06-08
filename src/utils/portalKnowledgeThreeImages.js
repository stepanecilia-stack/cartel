/** @typedef {'logic' | 'vision' | 'kinesthesia'} ThreeImagePart */

/**
 * @param {string} text
 */
export function assessThreeImagesAnswer(text) {
  const lower = text.trim().toLowerCase()
  const hasLogic = /логик|понима|шаг|последов|почему|как\s+дел|объясн/i.test(lower)
  const hasVision = /зрен|вид|картин|наблюд|выгляд|эталон/i.test(lower)
  const hasKinesthesia = /кинест|киниспет|ощущ|мышц|прочув|прож|чувств|тел(о|а|ом)?\b|телес/i.test(lower)

  /** @type {ThreeImagePart[]} */
  const missing = []
  if (!hasLogic) missing.push('logic')
  if (!hasVision) missing.push('vision')
  if (!hasKinesthesia) missing.push('kinesthesia')

  const dismissesKinesthesia = /без\s+(тела|ощущ|кинест)|только\s+(логик|зрен)|достаточно\s+(логик|зрен)/i.test(lower)
  const pass = missing.length === 0 && !dismissesKinesthesia

  return { pass, missing, hasLogic, hasVision, hasKinesthesia, dismissesKinesthesia }
}

/** Текст для system prompt — все тренеры. */
export const KNOWLEDGE_PONYAL_PEDAGOGY_BLOCK = `# «Знание» и кнопка «Понял» (не путать!)
- «Знание» — этап навыка. Его содержание: три образа (логический, зрительный, кинестетический).
- «Понял» — НЕ отдельный этап и НЕ «содержание рядом со Знанием». Это кнопка на платформе: жмёшь, когда «Знание» сформировано — все три образа есть.
- ЗАПРЕЩЕНО говорить, что три образа — «часть Понял», а не Знания. Три образа — это и есть Знание.
- Если ученик отвечает «три образа» на вопрос о сути «Знания» — это верно. Подтверди.`

export const THREE_IMAGES_PROMPT_BLOCK = `# Три образа «Знания» (все три обязательны)
- Логический: понимаешь, почему и как выполняется элемент.
- Зрительный: видишь правильную форму — в памяти, на видео, у тренера.
- Кинестетический: прочувствовал своими мышцами, прожил на личном опыте — без этого «Знания» нет.
- Кнопка «Понял» на платформе — следствие: жмёшь, когда все три образа сформированы (этап «Знание» закрыт).
Онлайн ты не докажешь кинестетику мне — но я не позволю «галочку ради галочки». В своём стиле требуй честности: нельзя жать «Понял», пока не прожил три образа в элементе.`

/**
 * @param {string} text
 */
/** @param {string} text */
export function evaluateLogicImageAnswer(text) {
  return assessThreeImagesAnswer(text).hasLogic
}

/** @param {string} text */
export function evaluateVisionImageAnswer(text) {
  return assessThreeImagesAnswer(text).hasVision
}

/** @param {string} text */
export function evaluateKinesthesiaImageAnswer(text) {
  const a = assessThreeImagesAnswer(text)
  return a.hasKinesthesia && !a.dismissesKinesthesia
}

export function evaluateKnowledgeEssenceAnswer(text) {
  const assessment = assessThreeImagesAnswer(text)
  if (assessment.pass) return true

  const lower = text.trim().toLowerCase()
  if (!lower || lower.length < 4) return false

  const mentionsThreeImages = /три\s+образ|3\s+образ|тр[ёе]х\s+образ/i.test(lower)
  const mentionsKnowledge = /знан/i.test(lower)
  const mentionsComponents = /логик|зрен|кинест|мышц|телес|ощущ/i.test(lower)

  if (mentionsThreeImages && mentionsComponents) return true
  if (mentionsKnowledge && mentionsThreeImages) return true
  if (mentionsThreeImages && /сформир|состоит|суть|включа|нужн|это|заключа/i.test(lower)) return true

  return false
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {ThreeImagePart[]} missing
 * @param {boolean} dismissesKinesthesia
 */
export function threeImagesCorrectionReply(personaId, missing, dismissesKinesthesia = false) {
  const onlyMissingKinesthesia =
    missing.length === 1 && missing[0] === 'kinesthesia' && !dismissesKinesthesia
  const missingKinesthesia = missing.includes('kinesthesia') || dismissesKinesthesia

  if (onlyMissingKinesthesia || (missingKinesthesia && missing.length <= 2)) {
    if (personaId === 'vasily') {
      return 'Логика и картинка — не всё. Кинестетика: прочувствовать мышцами, прожить. Не пытайся меня наебать — наебёшь прежде всего себя. «Понял» без тела — липа. Добавь в ответ: как это ощущается в теле.'
    }
    if (personaId === 'arkady') {
      return 'Друг, логика и зрение — полдела. Нужна кинестетика: ощущение в мышцах, свой опыт в теле. Я не проверю это здесь, но обманывать себя нельзя. Сформулируй все три — включая прочувствованное.'
    }
    return 'Кинестетический образ обязателен — часть «Знания», не отдельно от него. Прочувствуй мышцами. Без тела «Знание» не закрыто.'
  }

  if (personaId === 'vasily') {
    return 'Печально. «Знание» — три образа: логика, зрение, кинестетика в мышцах. Не два с отмазкой. «Понял» — когда все три, а не когда надоело.'
  }
  if (personaId === 'arkady') {
    return 'Нужны все три: понимание, картинка и ощущение в теле. Кинестетика — не «потом в зале», а часть «Знания» здесь и сейчас. Попробуй ещё раз.'
  }
  return '«Знание» = три образа: логический, зрительный, кинестетический. «Понял» — кнопка, когда они есть. Повтори.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {'logic' | 'vision' | 'kinesthesia'} part
 */
export function singleImageCorrectionReply(personaId, part) {
  if (part === 'logic') {
    if (personaId === 'vasily') {
      return 'Логический образ — понимаешь, почему и как делается элемент. Не «тренер сказал», а своими словами. Повтори.'
    }
    if (personaId === 'arkady') {
      return 'Друг, логический образ — понимание шагов и смысла. Сформулируй своими словами.'
    }
    return 'Логический образ: последовательность и смысл элемента. Уточни ответ.'
  }
  if (part === 'vision') {
    if (personaId === 'vasily') {
      return 'Зрительный — как выглядит правильно: в голове, на видео, у тренера. Не логика — картинка.'
    }
    if (personaId === 'arkady') {
      return 'Зрительный образ — чёткая картинка правильного выполнения. Попробуй ещё раз.'
    }
    return 'Зрительный образ: эталон формы. Уточни.'
  }
  if (personaId === 'vasily') {
    return 'Кинестетика — ощущение в мышцах, прожил сам. «Понял» без тела — липа.'
  }
  if (personaId === 'arkady') {
    return 'Кинестетика — что чувствуют мышцы, свой опыт в теле. Добавь это в ответ.'
  }
  return 'Кинестетический образ: прочувствовать в мышцах. Уточни.'
}
