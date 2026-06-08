/** @typedef {'logic' | 'vision' | 'kinesthesia'} ThreeImagePart */

/**
 * @param {string} text
 */
export function assessThreeImagesAnswer(text) {
  const lower = text.trim().toLowerCase()
  const hasLogic = /логик|понима|шаг|последов|почему|как\s+дел|объясн/i.test(lower)
  const hasVision = /зрен|вид|картин|наблюд|выгляд|эталон/i.test(lower)
  const hasKinesthesia = /кинест|ощущ|мышц|прочув|прож|чувств|тел(о|а|ом)?\b|телес/i.test(lower)

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
export const THREE_IMAGES_PROMPT_BLOCK = `# Три образа «Знания» (все три обязательны)
- Логический: понимаешь, почему и как выполняется элемент.
- Зрительный: видишь правильную форму — в памяти, на видео, у тренера.
- Кинестетический: прочувствовал своими мышцами, прожил на личном опыте — без этого «Знания» нет.
Онлайн ты не докажешь кинестетику мне — но я не позволю «галочку ради галочки». В своём стиле требуй честности: нельзя жать «Понял», если тело ещё не было в элементе.`

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
    return 'Кинестетический образ обязателен. Прочувствовать мышцами, прожить на личном опыте. Без этого критерий «Знание» не выполнен. Уточните ответ с учётом тела.'
  }

  if (personaId === 'vasily') {
    return 'Слабовато. Три образа: логика, зрение и кинестетика — прочувствовать мышцами. Потом «Понял». Не выдумывай — честно.'
  }
  if (personaId === 'arkady') {
    return 'Нужны все три: понимание, картинка и ощущение в теле. Кинестетика — не «потом в зале», а часть «Знания» здесь и сейчас. Попробуй ещё раз.'
  }
  return 'Требуются три образа — логический, зрительный, кинестетический — и только после них «Понял». Повторите.'
}
