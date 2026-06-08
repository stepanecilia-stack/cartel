import { trainingGoalsLabels } from '../constants/studentPortalOnboarding.js'
import { formatPortalPersonaName } from '../constants/studentPortalPersonas.js'
import { MARKER_READY_FOR_STAGES } from './personaChatMarkers.js'
import { buildOnboardingSkipAllowReply, detectOnboardingSkipIntent } from './onboardingSkipIntent.js'

/** @typedef {{ goalsDone: boolean, sportDone: boolean, physicalDone: boolean, complete: boolean, step: 1 | 2 | 3 | 4 }} GreetingIntakeProgress */

export const PHYSICAL_CLAIM_LIMITS = { pushUps: 60, pullUps: 30 }

/** @type {Record<string, number>} */
const RU_COUNT_WORDS = {
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
  тринадцать: 13,
  четырнадцать: 14,
  пятнадцать: 15,
  шестнадцать: 16,
  семнадцать: 17,
  восемнадцать: 18,
  девятнадцать: 19,
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  пятьдесят: 50,
  шестьдесят: 60,
  семьдесят: 70,
  восемьдесят: 80,
  девяносто: 90,
  сто: 100,
}

/**
 * @param {string} text
 * @param {RegExp} keyword
 */
function numberNearKeyword(text, keyword) {
  const match = keyword.exec(text)
  if (!match || match.index == null) return null

  const idx = match.index
  let best = null
  let bestDist = Infinity

  for (const digit of text.matchAll(/\d+/g)) {
    const n = parseInt(digit[0], 10)
    if (!Number.isFinite(n)) continue
    const dist = Math.abs((digit.index ?? 0) - idx)
    if (dist < bestDist) {
      bestDist = dist
      best = n
    }
  }

  for (const [word, value] of Object.entries(RU_COUNT_WORDS)) {
    const wordIdx = text.indexOf(word)
    if (wordIdx < 0) continue
    const dist = Math.abs(wordIdx - idx)
    if (dist < bestDist) {
      bestDist = dist
      best = value
    }
  }

  return best
}

/**
 * @param {string} text
 * @returns {{ pushUps: number | null, pullUps: number | null }}
 */
export function parsePhysicalCountsFromText(text) {
  const lower = text.toLowerCase().replace(/,/g, ' ').replace(/ё/g, 'е')

  const slash = lower.match(/(\d+)\s*[\\/]\s*(\d+)/)
  if (slash) {
    return { pushUps: parseInt(slash[1], 10), pullUps: parseInt(slash[2], 10) }
  }

  const pushUps = numberNearKeyword(lower, /отжим/)
  const pullUps = numberNearKeyword(lower, /подтяг/)

  if (pushUps != null || pullUps != null) {
    return { pushUps, pullUps }
  }

  const nums = [...lower.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10)).filter(Number.isFinite)
  if (nums.length >= 2) {
    return { pushUps: nums[0], pullUps: nums[1] }
  }

  return { pushUps: nums[0] ?? null, pullUps: null }
}

/**
 * @param {string} text
 * @returns {{ inflated: boolean, pushInflated: boolean, pullInflated: boolean, pushUps: number | null, pullUps: number | null }}
 */
export function assessPhysicalClaims(text) {
  const { pushUps, pullUps } = parsePhysicalCountsFromText(text)
  const pushInflated = pushUps != null && pushUps > PHYSICAL_CLAIM_LIMITS.pushUps
  const pullInflated = pullUps != null && pullUps > PHYSICAL_CLAIM_LIMITS.pullUps
  return {
    inflated: pushInflated || pullInflated,
    pushInflated,
    pullInflated,
    pushUps,
    pullUps,
  }
}

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 * @param {unknown} goalsRaw
 */
export function buildOnboardingGreetingOpener(persona, goalsRaw) {
  const name = formatPortalPersonaName(persona)
  const goals = trainingGoalsLabels(goalsRaw)
  const goalsLine =
    goals.length > 0
      ? `В анкете ты отметил: ${goals.join(', ')}.`
      : 'Ты прошёл анкету — давай уточним цели.'

  if (persona.id === 'vasily') {
    return `Ну здравствуй. Я ${name} — раз ты меня выбрал, не для красоты. ${goalsLine} Подтверди своими словами: это правда твои цели или красивые слова?`
  }
  if (persona.id === 'arkady') {
    return `Привет, друг! Я ${name} — рад, что ты со мной, правда. ${goalsLine} Это то, ради чего ты пришёл? Скажи своими словами — я выслушаю.`
  }
  return `Я ${name}. ${goalsLine} Своими словами — что здесь главное?`
}

/**
 * @param {string} goalsAnswer
 */
function glebGoalsFollowUp(goalsAnswer) {
  const lower = goalsAnswer.toLowerCase().replace(/ё/g, 'е')

  if (/соревн|турнир|бой\b|ринг/.test(lower)) {
    return 'Соревнования — конкретная цель. Спортивный опыт: разряд, виды, сколько лет?'
  }
  if (/техник/.test(lower)) {
    return 'Техника в приоритете. Чем занимался в спорте и какой уровень?'
  }
  if (/похуд|вес|форма|здоров|фитнес/.test(lower)) {
    return 'Форма и здоровье — понятный фокус. Что было в спорте до этого?'
  }
  if (/побед|выигр|чемпион|медал|топ/.test(lower)) {
    return 'Побеждать — ясный ориентир. Спортивный опыт: разряд, виды, сколько лет?'
  }
  return 'Зафиксировал. Спортивный бэкграунд: разряд, виды, сколько лет?'
}

/**
 * @param {string} sportAnswer
 */
function glebSportToPhysical(sportAnswer) {
  const lower = sportAnswer.toLowerCase().replace(/ё/g, 'е')

  const looksLikeAgeOnly =
    /\d+\s*(лет|год)\b|мне\s+\d+/.test(lower) &&
    !/бокс|кмс|зал|разряд|секци|спорт|тренир|бой|отжим|подтяг|фитнес|кроссфит/.test(lower)
  if (looksLikeAgeOnly) {
    return 'Возраст — не спортивный стаж. Чем занимался в спорте и сколько лет в этом?'
  }

  if (/кмс|кандидат|мс\b|мастер спорта|\b1\s*разряд|\b2\s*разряд|\b3\s*разряд|разрядник/.test(lower)) {
    return 'КМС — уровень в прошлом; разрыв с последним боем отделяет «был в форме» от «есть форма сейчас». Отжимания и подтягивания за один подход — сколько?'
  }
  if (/бокс/.test(lower)) {
    return 'Бокс в анамнезе — хорошо; важен не стаж, а когда последний раз был ринг или жёсткий спарринг. Отжимания и подтягивания за подход — сколько?'
  }
  if (/ничем|не заним|диван|с нуля|нович|первый раз|никогда|нет опыта/.test(lower)) {
    return 'С нуля — честная стартовая точка. Отжимания и подтягивания за подход — сколько?'
  }
  if (/зал|фитнес|кроссфит|силов|качал/.test(lower)) {
    return 'Зал без боевого опыта — другая база. Отжимания и подтягивания за подход — сколько?'
  }
  return 'Опыт зафиксирован. Отжимания и подтягивания за подход — сколько?'
}

/**
 * @param {string} physicalAnswer
 * @param {ReturnType<typeof assessPhysicalClaims>} claim
 */
function glebIntakeComplete(physicalAnswer, claim) {
  const skepticism = claim.inflated ? `${physicalSkepticismLine('gleb', claim)} ` : ''
  const lower = physicalAnswer.toLowerCase().replace(/ё/g, 'е')
  const weakBase = /0|ноль|не могу|не умею|не подтяг|ни одного|никак|нет/.test(lower)

  const insight = weakBase
    ? 'Слабая или нулевая база — не приговор, это стартовая точка. Картина ясна. '
    : 'Цифры сходятся с картиной. От этого и оттолкнёмся. '

  return `${skepticism}${insight}База собрана. «К инструктажу» — зелёная кнопка внизу. ${MARKER_READY_FOR_STAGES}`
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 * @returns {GreetingIntakeProgress}
 */
export function getGreetingIntakeProgress(messages) {
  const userLines = messages
    .filter((m) => m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content.trim())
    .filter(Boolean)

  const goalsDone = userLines.length >= 1
  const sportDone = userLines.length >= 2
  const physicalDone = userLines.length >= 3
  const complete = goalsDone && sportDone && physicalDone

  /** @type {1 | 2 | 3 | 4} */
  const step = !goalsDone ? 1 : !sportDone ? 2 : !physicalDone ? 3 : 4

  return { goalsDone, sportDone, physicalDone, complete, step }
}

/**
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function greetingIntakeLooksComplete(messages) {
  return getGreetingIntakeProgress(messages).complete
}

/**
 * @param {GreetingIntakeProgress} progress
 */
export function greetingIntakeHint(progress) {
  if (progress.complete) return null
  if (progress.step === 1) return 'Шаг 1 из 3: подтверди цели — одним сообщением.'
  if (progress.step === 2) return 'Шаг 2 из 3: чем занимался в спорте.'
  return 'Шаг 3 из 3: примерно — отжимания и подтягивания (можно с раскачкой).'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 */
function sportQuestion(personaId) {
  if (personaId === 'vasily') {
    return 'Ладно, цели услышал. Теперь без понтов: чем занимался в спорте? Бокс, зал, диван — как есть.'
  }
  if (personaId === 'arkady') {
    return 'Хорошо, друг, цели зафиксировали. Расскажи про спортивный опыт — чем занимался раньше?'
  }
  return 'Цели зафиксировал. Спортивный опыт: разряд, виды, сколько лет — конкретно.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 */
function physicalQuestion(personaId) {
  if (personaId === 'vasily') {
    return 'Ок. Последнее — и без героизма: отжимания и подтягивания, примерно. С раскачкой, без — мне всё равно, только честно.'
  }
  if (personaId === 'arkady') {
    return 'Спасибо. И последний вопрос: отжимания и подтягивания — сколько примерно выходит? Со слов нормально.'
  }
  return 'Опыт зафиксирован. Отжимания от пола и подтягивания за один подход — цифры, честно.'
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {ReturnType<typeof assessPhysicalClaims>} claim
 */
function physicalSkepticismLine(personaId, claim) {
  const { pushInflated, pullInflated, pushUps, pullUps } = claim

  if (personaId === 'vasily') {
    if (pushInflated && pullInflated) {
      return `${pushUps} отжиманий и ${pullUps} подтягиваний? Красиво. На пиздеж не ведусь — но в анкету записал.`
    }
    if (pushInflated) {
      return `${pushUps} отжиманий? Ну-ну. Слепо такому не верю — окей, зафиксировал.`
    }
    return `${pullUps} подтягиваний? Сказал бы ещё чемпион мира. Не верю на слово — но записал.`
  }

  if (personaId === 'arkady') {
    if (pushInflated && pullInflated) {
      return `Друг, ${pushUps} и ${pullUps} — цифры громкие. Слепо не поверю, но записал как сказал.`
    }
    if (pushInflated) {
      return `Друг, ${pushUps} отжиманий — звучит смело. Не верю на слово, но зафиксировал.`
    }
    return `Друг, ${pullUps} подтягиваний — уважаю амбиции, но слепо такому не верю. Записал.`
  }

  if (pushInflated && pullInflated) {
    return `Заявка: ${pushUps} отжиманий, ${pullUps} подтягиваний — выше реалистичного порога. Верификация на зале. Формально зафиксировал.`
  }
  if (pushInflated) {
    return `${pushUps} отжиманий — для посадки завышено. Слепо не принимаю, но записал.`
  }
  return `${pullUps} подтягиваний — заявка выше нормы. Проверим на зале. Зафиксировал.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} [physicalAnswer]
 */
function intakeCompleteReply(personaId, physicalAnswer = '') {
  const claim = physicalAnswer.trim() ? assessPhysicalClaims(physicalAnswer) : { inflated: false }
  const skepticism = claim.inflated ? `${physicalSkepticismLine(personaId, claim)} ` : ''

  if (personaId === 'vasily') {
    return `${skepticism}Базу зафиксировал — картина ясна. Теорию пока не грузим: жми зелёную кнопку «К инструктажу» внизу. ${MARKER_READY_FOR_STAGES}`
  }
  if (personaId === 'arkady') {
    return `${skepticism}Отлично, друг — всё записал. Сейчас без лекций: жми «К инструктажу» внизу, там начнём разбираться. ${MARKER_READY_FOR_STAGES}`
  }
  if (personaId === 'gleb') {
    return glebIntakeComplete(physicalAnswer, claim)
  }
  return `${skepticism}Базу зафиксировал. Жми зелёную кнопку «К инструктажу» — инструктаж на следующем шаге. ${MARKER_READY_FOR_STAGES}`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string[]} recentAssistant
 */
export function intakeCompleteRedirectReply(personaId, recentAssistant = []) {
  /** @param {string[]} items */
  const pickFresh = (items) => {
    const fresh = items.filter((item) => !recentAssistant.includes(item))
    return fresh[Math.floor(Math.random() * fresh.length)] ?? items[0] ?? ''
  }

  if (personaId === 'vasily') {
    return pickFresh([
      'Уже всё спросил. Не размазываем — зелёная кнопка «К инструктажу» внизу.',
      'Теорию потом. Сейчас жми «К инструктажу» — там и начнём.',
      'Вопрос услышал, но мы на посадке. Кнопка внизу — и поехали к инструктажу.',
      'База есть. Дальше — только через «К инструктажу», не в чате.',
    ])
  }
  if (personaId === 'arkady') {
    return pickFresh([
      'Друг, всё зафиксировал. Жми «К инструктажу» внизу — там продолжим.',
      'Сейчас не время для теории в чате. Кнопка «К инструктажу» — и пойдём дальше.',
      'Понял тебя. Но сначала инструктаж — зелёная кнопка внизу.',
      'На посадке хватит. «К инструктажу» — и разберём всё по полочкам там.',
    ])
  }
  return pickFresh([
    'Интейк завершён. Жми «К инструктажу» внизу.',
    'Теория — на следующем шаге. Кнопка «К инструктажу».',
    'Переход к инструктажу — через кнопку внизу.',
  ])
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {GreetingIntakeProgress} progress
 */
function intakeIncompleteNudge(personaId, progress) {
  if (!progress.goalsDone) {
    if (personaId === 'vasily') return 'Сначала цели — своими словами. Один ответ.'
    if (personaId === 'arkady') return 'Друг, сначала цели — как ты сам их видишь.'
    return 'Сначала подтверди цели.'
  }
  if (!progress.sportDone) {
    return sportQuestion(personaId)
  }
  return physicalQuestion(personaId)
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} messages
 */
export function scriptedOnboardingGreetingReply(personaId, userMessage, messages) {
  const lower = userMessage.trim().toLowerCase()
  if (!lower) return null

  if (detectOnboardingSkipIntent(userMessage)) {
    return buildOnboardingSkipAllowReply(personaId)
  }

  const progress = getGreetingIntakeProgress(messages)
  const userCount = messages.filter((m) => m.role === 'user').length

  if (/готов|поехали|инструкт|этап|ступен|слушаю|дальше/i.test(lower) && !progress.complete) {
    return intakeIncompleteNudge(personaId, progress)
  }

  if (progress.complete) {
    if (userCount === 3) {
      return intakeCompleteReply(personaId, userMessage)
    }
    const recentAssistant = messages
      .filter((m) => m.role === 'assistant')
      .slice(-4)
      .map((m) => m.content)
    return intakeCompleteRedirectReply(personaId, recentAssistant)
  }

  if (userCount === 1) {
    if (personaId === 'gleb') return glebGoalsFollowUp(userMessage)
    return sportQuestion(personaId)
  }
  if (userCount === 2) {
    if (personaId === 'gleb') return glebSportToPhysical(userMessage)
    return physicalQuestion(personaId)
  }

  return null
}
