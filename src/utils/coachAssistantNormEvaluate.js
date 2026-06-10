import { mergeStudentCardLiveSnapshot } from '../data/studentCardLiveCache.js'
import { evaluateLegacyTest } from './ksrUtils.js'
import { findStudentByNameQuery } from './studentNameSearch.js'
import { displayNameFromStudent } from './studentModel.js'
import { applyNormRawInput } from './normTestsStorage.js'
import {
  describeStudentNormsProfile,
  formatNormThresholdsLine,
  formatStudentNormsCardBlock,
  formatStudentNormsProfileLine,
  resolvePhysicalNormFromText,
} from './studentNormsProfile.js'

export { formatNormThresholdsLine } from './studentNormsProfile.js'

const MEDAL_RU = {
  gold: 'золото',
  silver: 'серебро',
  bronze: 'бронза',
  red: 'ниже нормы',
}

/**
 * @param {string} raw
 */
function isBirthYearLike(raw) {
  const n = Number(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1930 && n <= 2035
}

/**
 * @param {string} text
 */
export function extractNormResultRaw(text) {
  const t = String(text ?? '')
  const minute = t.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/)
  if (minute) return minute[1]

  const explicitPatterns = [
    /(?:отжим|подтяг)\w*\s*(\d+(?:[.,]\d+)?)/i,
    /\b(\d+(?:[.,]\d+)?)\s*(раз|раза|разов|отжим|подтяг)/i,
    /(?:отжим|подтяг|прыж|бег|наклон|тулов)[^\d]{0,30}(\d+(?:[.,]\d+)?)/i,
    /\b(\d+(?:[.,]\d+)?)\s*(см|км|кг)\b/i,
    /\b(\d+(?:[.,]\d+)?)\s*м\b/i,
  ]
  for (const pattern of explicitPatterns) {
    const match = t.match(pattern)
    if (!match) continue
    const raw = String(match[1] ?? '').replace(',', '.')
    if (raw && !isBirthYearLike(raw)) return raw
  }

  for (const match of t.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)) {
    const raw = match[1].replace(',', '.')
    if (!isBirthYearLike(raw)) return raw
  }
  return ''
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 */
export function extractNormResultFromConversation(messages) {
  const list = Array.isArray(messages) ? messages : []

  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role !== 'user') continue
    const raw = extractNormResultRaw(list[i]?.content ?? '')
    if (raw) return raw
  }

  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role !== 'assistant') continue
    const content = String(list[i]?.content ?? '')
    if (content.length > 320 || /зачётов \d+\/\d+|только данные карточки/i.test(content)) continue
    const raw = extractNormResultRaw(content)
    if (raw) return raw
  }
  return ''
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {{
 *   students?: object[],
 *   focusStudent?: object | null,
 *   queryResolvedStudent?: object | null,
 * }} coachContext
 */
function mergeStudentWithRoster(student, coachContext) {
  if (!student?.id) return student ?? null
  const list = Array.isArray(coachContext.students) ? coachContext.students : []
  const fromList = list.find((row) => String(row.id) === String(student.id))
  const merged = fromList ? { ...fromList, ...student } : student
  return mergeStudentCardLiveSnapshot(merged)
}

export function resolveStudentFromCoachMessages(messages, coachContext = {}) {
  if (coachContext.queryResolvedStudent?.id) {
    return mergeStudentWithRoster(coachContext.queryResolvedStudent, coachContext)
  }
  if (coachContext.focusStudent?.id) {
    return mergeStudentWithRoster(coachContext.focusStudent, coachContext)
  }

  const students = Array.isArray(coachContext.students) ? coachContext.students : []
  const list = Array.isArray(messages) ? messages : []

  const allUserText = list
    .filter((m) => m?.role === 'user')
    .map((m) => m.content ?? '')
    .join(' ')
  const fromAllUser = findStudentByNameQuery(students, allUserText)
  if (fromAllUser) return mergeStudentWithRoster(fromAllUser, coachContext)

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const msg = list[i]
    if (msg?.role !== 'user') continue
    const found = findStudentByNameQuery(students, msg.content ?? '')
    if (found) return mergeStudentWithRoster(found, coachContext)
  }

  const assistantText = list
    .filter((m) => m?.role === 'assistant')
    .map((m) => m.content ?? '')
    .join('\n')
  for (const student of students) {
    const name = displayNameFromStudent(student).toLowerCase()
    if (!name || name === 'без имени') continue
    const tokens = name.split(/\s+/).filter((token) => token.length >= 3)
    if (tokens.some((token) => assistantText.toLowerCase().includes(token))) {
      return mergeStudentWithRoster(student, coachContext)
    }
  }

  return null
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {string} [userMessage]
 */
export function isNormConversationThread(messages, userMessage = '') {
  const threadText = (Array.isArray(messages) ? messages : [])
    .map((m) => m.content ?? '')
    .concat(userMessage)
    .join('\n')
    .toLowerCase()
  return /отжим|подтяг|упор.*лёж|норматив|прыж|наклон|бег\s*\d|тулов|пресс/i.test(threadText)
}

/**
 * @param {object} student
 * @param {object[]} allNorms
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {string} userMessage
 * @param {Array<{ role?: string, content?: string }>} messages
 */
export function formatNormCardFallbackReply(student, allNorms, personaId, userMessage, messages) {
  const name = displayNameFromStudent(student)
  const profile = describeStudentNormsProfile(student, allNorms)
  const profileLine = formatStudentNormsProfileLine(student, allNorms)

  const retry = tryEvaluateNormFromConversation(messages, { students: [student], allNorms, queryResolvedStudent: student })
  if (retry) return formatNormEvaluationReply(retry, personaId, userMessage)

  if (profile.norms.length === 0) {
    const hint =
      personaId === 'vasily'
        ? `Коллега, у ${name} нормативы из карточки не собрались. ${profileLine}. Открой карточку и проверь пол и г.р.`
        : `У ${name} нормативы не подобраны. ${profileLine}. Проверьте пол и год рождения в карточке.`
    return hint
  }

  const card = formatStudentNormsCardBlock(student, allNorms, true)
  if (personaId === 'vasily') {
    return `Коллега, только данные карточки — без выдумок:\n${card}\nНазови норматив и результат цифрой, пересчитаю медаль.`
  }
  return `Только данные карточки:\n${card}\nУточните норматив и результат — посчитаю медаль по таблице.`
}

/**
 * @param {object} student
 * @param {object[]} allNorms
 * @param {string} combinedText
 */
export function resolveNormForStudentText(student, allNorms, combinedText) {
  return resolvePhysicalNormFromText(allNorms, student, combinedText)
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {{
 *   students?: object[],
 *   focusStudent?: object | null,
 *   queryResolvedStudent?: object | null,
 *   allNorms?: object[],
 * }} coachContext
 */
export function tryEvaluateNormFromConversation(messages, coachContext = {}) {
  const list = Array.isArray(messages) ? messages : []
  const allNorms = coachContext.allNorms ?? []
  const student = resolveStudentFromCoachMessages(list, coachContext)
  if (!student?.id || !allNorms.length) return null

  const userMessages = list.filter((m) => m?.role === 'user').map((m) => m.content ?? '')
  let norm = null
  for (let i = userMessages.length - 1; i >= 0; i -= 1) {
    norm = resolvePhysicalNormFromText(allNorms, student, userMessages[i])
    if (norm) break
  }
  if (!norm) {
    const combined = userMessages.join('\n')
    norm = resolvePhysicalNormFromText(allNorms, student, combined)
  }
  if (!norm?.testId) return null

  const resultRaw = extractNormResultFromConversation(list)
  if (!resultRaw) return null

  const parsed = applyNormRawInput(norm, resultRaw)
  if (!parsed || !Number.isFinite(parsed.result)) return null

  const { status } = evaluateLegacyTest(parsed.result, norm)
  const statusKey = String(status ?? 'red')
  const profile = describeStudentNormsProfile(student, allNorms)

  return {
    student,
    norm,
    profile,
    resultRaw: String(parsed.resultRaw ?? resultRaw),
    resultDisplay: String(parsed.resultRaw ?? resultRaw),
    status: statusKey,
    statusLabel: MEDAL_RU[statusKey] ?? statusKey,
    thresholdsLine: formatNormThresholdsLine(norm),
    testId: String(norm.testId),
  }
}

/** @param {ReturnType<typeof tryEvaluateNormFromConversation>} evaluation */
export function buildNormEvaluationHint(evaluation) {
  if (!evaluation) return ''
  const name = displayNameFromStudent(evaluation.student)
  const unit = evaluation.norm.unit ? ` ${evaluation.norm.unit}` : ''
  const normsProfile = evaluation.profile ?? describeStudentNormsProfile(evaluation.student, [])
  const profileText = `пол=${normsProfile.genderLabel}, ${normsProfile.birthLabel}, возраст=${normsProfile.ageYears ?? '—'} лет, группа ${evaluation.norm.ageGroup ?? '—'}`

  return [
    `Ученик: ${name}`,
    `Профиль карточки: ${profileText}`,
    `Норматив: «${evaluation.norm.testName}» (testId=${evaluation.norm.testId})`,
    `Результат: ${evaluation.resultDisplay}${unit}`,
    `Медаль по карточке Cartel: ${evaluation.statusLabel}`,
    `Пороги из карточки: ${evaluation.thresholdsLine}`,
    normsProfile.fromCardSnapshot ? 'Источник: снимок открытой карточки ученика.' : 'Источник: данные карточки (г.р., пол).',
  ].join('\n')
}

/**
 * @param {ReturnType<typeof tryEvaluateNormFromConversation>} evaluation
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 */
export function formatNormEvaluationReply(evaluation, personaId, userMessage = '') {
  if (!evaluation) return ''
  const name = displayNameFromStudent(evaluation.student)
  const test = evaluation.norm.testName
  const unit = evaluation.norm.unit ? ` ${evaluation.norm.unit}` : ''
  const result = evaluation.resultDisplay
  const medal = evaluation.statusLabel
  const thresholds = evaluation.thresholdsLine
  const profile = evaluation.profile
  const profileText = profile
    ? `пол ${profile.genderLabel}, ${profile.birthLabel}, возраст ${profile.ageYears ?? '—'} лет, группа ${evaluation.norm.ageGroup ?? '—'}`
    : ''
  const disputed = /не\s+бронз|не\s+серебр|не\s+золот|перепровер|ошиб/i.test(String(userMessage ?? ''))
  const asksMedal = /это\s+(золот|серебр|бронз)|какая\s+медаль|какой\s+зач[её]т/i.test(String(userMessage ?? ''))

  if (personaId === 'vasily') {
    if (asksMedal) {
      const notGold = evaluation.status !== 'gold' ? ` Нет, это не золото — ${medal}.` : ' Да, по карточке это золото.'
      return `Коллега, ${name} (${profileText}): ${result}${unit} по «${test}».${notGold} Пороги в карточке: ${thresholds}.`
    }
    if (disputed) {
      return `Пересчитал строго по карточке: ${name}, ${profileText}. ${result}${unit} по «${test}» — ${medal}. Пороги: ${thresholds}. Записать?`
    }
    return `Коллега, по карточке ${name} (${profileText}): ${result}${unit} — «${test}», ${medal}. Пороги: ${thresholds}.`
  }
  if (personaId === 'gleb') {
    return `По карточке ${name} (${profileText}): ${result}${unit}, «${test}» — ${medal}. Пороги: ${thresholds}.`
  }
  return `Коллега, в карточке у ${name} (${profileText}): ${result}${unit} по «${test}» — ${medal}. Пороги: ${thresholds}.`
}

/**
 * @param {string} userMessage
 * @param {ReturnType<typeof tryEvaluateNormFromConversation>} evaluation
 * @param {{ queryResolvedStudent?: object | null, queryStudentSuggestions?: object[] }} [coachContext]
 * @param {Array<{ role?: string, content?: string }>} [messages]
 */
export function shouldUseDeterministicNormReply(userMessage, evaluation, coachContext = {}, messages = []) {
  if (!evaluation?.student?.id || !evaluation?.norm) return false
  const suggestions = coachContext.queryStudentSuggestions ?? []
  const studentFromThread = resolveStudentFromCoachMessages(messages, coachContext)
  if (
    suggestions.length > 0 &&
    !coachContext.queryResolvedStudent?.id &&
    String(studentFromThread?.id ?? '') !== String(evaluation.student.id)
  ) {
    return false
  }

  const lower = String(userMessage ?? '').trim().toLowerCase()
  if (!lower || lower.length > 200) return false
  if (/^да[\s,]*(она|он|этот|эта|этого|ту|тот)\b/.test(lower)) return false
  if (/^(да|ага|угу|ок|окей)\.?$/i.test(lower)) return false
  if (/^(запис|внес|подтверж|примешь|прими|примите|примен|зафикс)/i.test(lower)) return false
  if (/^(але|эй|слушай|коллега|ну|ты там|работаешь)/i.test(lower)) return false
  if (/норматив.*\?|примешь|прими|записать|внес[её]шь|сохранишь/i.test(lower)) return false

  if (
    /перепровер|пересчит|почему|зачем|порог|не\s+бронз|не\s+серебр|не\s+золот|ошиб|неправильн|это\s+(золот|серебр|бронз)|какая\s+медаль|какой\s+зач[её]т/.test(
      lower,
    )
  ) {
    return true
  }
  if (/не золото|не серебро|как бронз/i.test(lower)) return true
  if (/(?:отжим|подтяг)\w*\s*\d+|\d+\s*(раз|раза|отжим|подтяг)/i.test(lower)) return true
  if (/\d+\s*(см|м\b|км|кг)/i.test(lower)) return true
  if (/\d{1,2}:\d{2}/.test(lower)) return true

  return false
}
