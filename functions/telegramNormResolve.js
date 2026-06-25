import { athleteShapeFromStudent, getNormsForAthlete } from './telegramNormsLite.js'
import { generateGeminiReply } from './vertexGemini.js'

/** @param {string} text */
function normalizeQuery(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s:./×x,-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SPEECH_MATCHERS = [
  {
    re: /отжим|упор.*л[её]ж|сгибан\w*\s*(?:и|\/|,)?\s*разгиб|разгиб\w*\s*(?:и|\/|,)?\s*сгиб|сгиб.*рук.*разгиб|разгиб.*рук.*сгиб/,
    testName: 'Сгибание/разгибание рук в упоре лёжа',
  },
  { re: /подтяг|высок.*переклад|переклад.*высок/, testName: 'Подтягивания (высокая перекладина)' },
  { re: /низк.*переклад|переклад.*90|90\s*см/, testName: 'Подтягивания (низкая перекладина 90см)' },
  { re: /3000|три тысяч/, testName: 'Бег на 3000 м' },
  { re: /1500|полторы/, testName: 'Бег на 1500м' },
  { re: /2000|2\s*км/, testName: 'Бег на 2000м' },
  { re: /1\s*км|один кил/, testName: 'Бег на 1 км' },
  { re: /шестиминут|6\s*мин/, testName: 'Шестиминутный бег' },
  { re: /\b30\s*м\b|тридцат/, testName: 'Бег 30м' },
  { re: /\b60\s*м\b|шестидесят/, testName: 'Бег 60м' },
  { re: /100\s*м|сто мет/, testName: 'Бег 100м' },
  { re: /челноч|3\s*[×x]\s*10/, testName: 'Челночный бег 3×10м' },
  { re: /наклон/, testName: 'Наклон вперёд' },
  { re: /прыжок|длину/, testName: 'Прыжок в длину с места' },
  { re: /тулов|пресс|подъ[её]м/, testName: 'Подъём туловища за 1 мин' },
]

/**
 * @param {object[]} norms
 * @param {string} testName
 */
function findNormByTestName(norms, testName) {
  const key = String(testName ?? '').trim().toLowerCase()
  return (
    norms.find((n) => String(n.testName ?? '').toLowerCase() === key) ??
    norms.find((n) => String(n.testName ?? '').toLowerCase().includes(key)) ??
    null
  )
}

/**
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} testIdOrName
 */
export function resolvePhysicalNormForStudent(allNorms, student, testIdOrName) {
  const key = normalizeQuery(testIdOrName)
  if (!key) return null
  const norms = getNormsForAthlete(allNorms, athleteShapeFromStudent(student))

  const direct =
    norms.find((norm) => normalizeQuery(norm.testId) === key) ??
    norms.find((norm) => normalizeQuery(norm.testName) === key) ??
    norms.find((norm) => normalizeQuery(norm.testName).includes(key)) ??
    null
  if (direct) return direct

  for (const { re, testName } of SPEECH_MATCHERS) {
    if (!re.test(key)) continue
    const hit = findNormByTestName(norms, testName)
    if (hit) return hit
  }

  return null
}

/**
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} combinedText
 */
export function resolvePhysicalNormFromSpeech(allNorms, student, combinedText) {
  const q = normalizeQuery(combinedText)
  if (!q) return null
  const norms = getNormsForAthlete(allNorms, athleteShapeFromStudent(student))
  const scopeNames = norms.map((n) => String(n.testName ?? ''))

  for (const name of scopeNames) {
    const n = normalizeQuery(name)
    if (n.length >= 5 && q.includes(n)) {
      const hit = findNormByTestName(norms, name)
      if (hit) return hit
    }
  }

  for (const { re, testName } of SPEECH_MATCHERS) {
    if (!re.test(q)) continue
    const inScope =
      !scopeNames.length ||
      scopeNames.some((s) => normalizeQuery(s) === normalizeQuery(testName)) ||
      scopeNames.some((s) => normalizeQuery(s).includes(normalizeQuery(testName).slice(0, 12)))
    if (!inScope) continue
    const scoped =
      scopeNames.find((s) => normalizeQuery(s) === normalizeQuery(testName)) ??
      scopeNames.find(
        (s) => /сгибан.*разгиб|упор.*л[её]ж/.test(normalizeQuery(s)) && testName.includes('Сгибание'),
      ) ??
      scopeNames.find((s) => /подтяг/.test(normalizeQuery(s)) && /подтяг/.test(testName)) ??
      testName
    const hit = findNormByTestName(norms, scoped)
    if (hit) return hit
  }

  const tokens = q.split(/\s+/).filter((t) => t.length >= 4)
  let best = null
  let bestScore = 0
  for (const norm of norms) {
    const name = normalizeQuery(norm.testName)
    let score = 0
    for (const token of tokens) {
      if (name.includes(token)) score += token.length
    }
    if (score > bestScore) {
      best = norm
      bestScore = score
    }
  }
  if (best && bestScore >= 5) return best

  return null
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

  const patterns = [
    /(?:отжим|подтяг|сгибан|разгиб)\w*\s*(\d+(?:[.,]\d+)?)/i,
    /\b(\d+(?:[.,]\d+)?)\s*(?:раз|раза|разов|отжим|подтяг)/i,
    /(?:отжим|подтяг|прыж|бег|наклон|тулов|сгибан|разгиб)[^\d]{0,40}(\d+(?:[.,]\d+)?)/i,
    /\b(\d+(?:[.,]\d+)?)\s*(?:см|км|кг)\b/i,
    /\b(\d+(?:[.,]\d+)?)\s*м\b/i,
  ]
  for (const pattern of patterns) {
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

/** @param {string} text */
export function looksLikeNormMention(text) {
  const q = String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
  return /отжим|упор.*л[её]ж|сгибан.*разгиб|разгиб.*сгиб|подтяг|наклон|прыжок|челноч|тулов|пресс|бег\s*\d|3000|1500|2000/.test(
    q,
  )
}

/** @param {string} text */
export function looksLikeNormWrite(text) {
  const q = normalizeQuery(text)
  if (!q) return false
  if (/запиш|внес|зафикси|сдал|сдала|результат|норматив|поставь|отметь/.test(q)) return true
  if (extractNormResultRaw(text) && SPEECH_MATCHERS.some(({ re }) => re.test(q))) return true
  return SPEECH_MATCHERS.some(({ re }) => re.test(q)) && extractNormResultRaw(text).length > 0
}

/**
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} text
 */
export async function resolvePhysicalNormWithAi(allNorms, student, text) {
  const norms = getNormsForAthlete(allNorms, athleteShapeFromStudent(student))
  if (!norms.length) return null
  const list = norms.map((n) => `- ${n.testName}`).join('\n')
  const system = `Сопоставь речь тренера с нормативом из списка. Ответь JSON: {"testName":"точное имя из списка или null"}`
  const user = `Список:\n${list}\n\nФраза: ${text}`
  try {
    const { text: raw } = await generateGeminiReply(system, user, {
      temperature: 0.1,
      maxOutputTokens: 120,
    })
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    const parsed = JSON.parse(raw.slice(start, end + 1))
    const name = String(parsed.testName ?? '').trim()
    if (!name || name === 'null') return null
    return findNormByTestName(norms, name)
  } catch {
    return null
  }
}

/**
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} userText
 * @param {string} [normHint]
 */
export async function resolveNormForWriteRequest(allNorms, student, userText, normHint = '') {
  const combined = [normHint, userText].filter(Boolean).join(' ')
  let norm =
    resolvePhysicalNormForStudent(allNorms, student, normHint) ??
    resolvePhysicalNormFromSpeech(allNorms, student, combined)
  if (!norm) {
    norm = await resolvePhysicalNormWithAi(allNorms, student, combined)
  }
  return norm
}
