import { displayName } from './telegramCoachData.js'

/**
 * @param {string} text
 */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s,-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Грубая нормализация падежей из голоса («ермакова» → «ермаков»).
 * @param {string} token
 */
export function normalizeNameToken(token) {
  let s = normalizeText(token)
  if (s.length < 3) return s

  if (s.endsWith('ова')) s = s.slice(0, -1)
  else if (s.endsWith('ева')) s = s.slice(0, -1)
  else if (s.endsWith('ина')) s = s.slice(0, -1)
  else if (s.endsWith('ая') && s.length > 4) s = s.slice(0, -1)
  else if (s.endsWith('а') && s.length > 4) s = s.slice(0, -1)
  else if (s.endsWith('у') && s.length > 4) s = s.slice(0, -1)
  else if (s.endsWith('ю') && s.length > 4) s = s.slice(0, -1)
  else if (s.endsWith('ом') && s.length > 5) s = s.slice(0, -2)
  else if (s.endsWith('ем') && s.length > 5) s = s.slice(0, -2)

  return s
}

/**
 * @param {object} student
 */
export function studentTokens(student) {
  const first = normalizeNameToken(student.firstName ?? '')
  const last = normalizeNameToken(student.lastName ?? '')
  const full = normalizeNameToken(displayName(student))
  return { first, last, full, display: displayName(student) }
}

/**
 * @param {object[]} students
 * @param {string} mention
 * @param {Set<string>} [excludeIds]
 * @returns {{ student: object, score: number } | null}
 */
export function matchStudentByMention(students, mention, excludeIds = new Set()) {
  const rawTokens = normalizeText(mention)
    .split(/\s+/)
    .map(normalizeNameToken)
    .filter((t) => t.length >= 2)
  if (!rawTokens.length) return null

  let best = null
  let bestScore = 0

  for (const student of students ?? []) {
    if (excludeIds.has(student.id)) continue
    const { first, last, full } = studentTokens(student)
    const mentionNorm = normalizeNameToken(mention)

    let score = 0

    if (full && mentionNorm === full) score += 40
    if (full && mentionNorm.includes(full)) score += 30

    for (const token of rawTokens) {
      if (token === first || token === last) score += 12
      else if (first && (first.startsWith(token) || token.startsWith(first))) score += 9
      else if (last && (last.startsWith(token) || token.startsWith(last))) score += 9
    }

    if (rawTokens.length >= 2 && first && last) {
      const pairA = `${last} ${first}`
      const pairB = `${first} ${last}`
      const joined = rawTokens.join(' ')
      if (joined === pairA || joined === pairB || mentionNorm === pairA || mentionNorm === pairB) {
        score += 35
      } else if (rawTokens.includes(first) && rawTokens.includes(last)) {
        score += 28
      }
    }

    if (rawTokens.length === 1 && last && rawTokens[0] === last) {
      score += 8
    }

    if (score > bestScore) {
      best = student
      bestScore = score
    }
  }

  const minScore = rawTokens.length >= 2 ? 18 : 10
  if (!best || bestScore < minScore) return null
  return { student: best, score: bestScore }
}

/**
 * @param {object[]} students
 * @param {string[]} mentions
 * @param {Set<string>} [excludeIds]
 */
export function matchStudentsFromMentions(students, mentions, excludeIds = new Set()) {
  /** @type {object[]} */
  const matched = []
  /** @type {string[]} */
  const unmatched = []
  const taken = new Set(excludeIds)

  for (const mention of mentions ?? []) {
    const hit = matchStudentByMention(students, mention, taken)
    if (hit) {
      matched.push(hit.student)
      taken.add(hit.student.id)
    } else if (String(mention ?? '').trim()) {
      unmatched.push(String(mention).trim())
    }
  }

  return { matched, unmatched }
}

/**
 * @param {object[]} students
 * @param {string} text
 * @param {Set<string>} [excludeIds]
 */
export function findAllStudentsInText(students, text, excludeIds = new Set()) {
  const lower = normalizeText(text)
  const hits = []

  for (const student of students ?? []) {
    if (excludeIds.has(student.id)) continue
    const { first, last, full } = studentTokens(student)
    let score = 0
    if (full.length >= 5 && lower.includes(full)) score = 40
    else if (first && last && lower.includes(`${first} ${last}`)) score = 35
    else if (last && first && lower.includes(`${last} ${first}`)) score = 35
    else if (last.length >= 4 && lower.includes(last)) score = 12
    else if (first.length >= 3 && lower.split(/\s+/).includes(first)) score = 10
    if (score > 0) hits.push({ student, score })
  }

  hits.sort((a, b) => b.score - a.score)
  const result = []
  const ids = new Set(excludeIds)
  for (const { student } of hits) {
    if (!ids.has(student.id)) {
      result.push(student)
      ids.add(student.id)
    }
  }
  return result
}
