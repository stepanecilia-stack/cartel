import { displayNameFromStudent, formatShortIdDisplay } from './studentModel.js'

const QUERY_STOP_WORDS = new Set([
  'про',
  'расскажи',
  'расскажите',
  'рассказать',
  'покажи',
  'покажите',
  'данные',
  'карточку',
  'карточка',
  'карточке',
  'ученика',
  'ученик',
  'ученику',
  'мне',
  'что',
  'как',
  'кто',
  'такой',
  'такая',
  'такое',
  'такие',
  'это',
  'этот',
  'эта',
  'этого',
  'пожалуйста',
  'скажи',
  'скажите',
  'найди',
  'найдите',
  'открой',
  'откройте',
  'информация',
  'инфу',
  'всё',
  'все',
  'по',
  'на',
  'у',
  'и',
  'а',
  'но',
  'ли',
  'же',
  'бы',
  'не',
  'ни',
  'из',
  'за',
  'для',
  'какой',
  'какая',
  'какие',
  'какое',
  'какого',
  'какую',
  'каком',
  'каким',
  'tell',
  'about',
])

const STEM_ENDINGS = [
  'ого',
  'ему',
  'ому',
  'ыми',
  'ими',
  'ах',
  'ях',
  'ой',
  'ей',
  'ую',
  'юю',
  'ии',
  'ью',
  'ом',
  'ем',
  'ам',
  'ям',
  'ов',
  'ев',
  'ёв',
  'ин',
  'ын',
  'ая',
  'яя',
  'ий',
  'ый',
  'ой',
  'а',
  'я',
  'у',
  'ю',
  'е',
  'и',
  'ы',
  'ь',
  'й',
  'о',
]

/** @param {string} word */
export function normalizeRuWord(word) {
  return String(word ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9-]/gi, '')
    .trim()
}

/** Грубый стем для русских имён/фамилий (падежи: ермакова → ермаков). */
export function stemRuName(word) {
  let s = normalizeRuWord(word)
  if (s.length < 3) return s
  for (const end of STEM_ENDINGS) {
    if (s.length > end.length + 2 && s.endsWith(end)) {
      s = s.slice(0, -end.length)
      break
    }
  }
  return s
}

/** @param {string} a @param {string} b */
function nameTokensMatch(a, b) {
  const sa = stemRuName(a)
  const sb = stemRuName(b)
  if (!sa || !sb) return false
  if (sa === sb) return true
  const min = Math.min(sa.length, sb.length)
  if (min < 3) return sa === sb
  const prefixLen = Math.min(4, min)
  return sa.slice(0, prefixLen) === sb.slice(0, prefixLen)
}

/** @param {object} student */
export function namePartsFromStudent(student) {
  const parts = new Set()
  const add = (value) => {
    const normalized = normalizeRuWord(value)
    if (normalized.length >= 2) parts.add(normalized)
  }

  for (const token of displayNameFromStudent(student).split(/\s+/)) add(token)
  if (student?.firstName) add(student.firstName)
  if (student?.lastName) add(student.lastName)
  if (student?.name) {
    for (const token of String(student.name).split(/\s+/)) add(token)
  }
  if (student?.fullName) {
    for (const token of String(student.fullName).split(/\s+/)) add(token)
  }

  return [...parts]
}

/** @param {string} query */
export function extractQueryNameTokens(query) {
  const raw = String(query ?? '')
    .toLowerCase()
    .replace(/[«»"'.,!?;:()]/g, ' ')
  return raw
    .split(/\s+/)
    .map((t) => normalizeRuWord(t))
    .filter((t) => t.length >= 2 && !QUERY_STOP_WORDS.has(t))
}

/**
 * @param {object} student
 * @param {string[]} queryTokens
 */
export function scoreStudentNameMatch(student, queryTokens) {
  const parts = namePartsFromStudent(student)
  if (!parts.length || !queryTokens.length) return 0

  let score = 0
  for (const qt of queryTokens) {
    let best = 0
    const stemQt = stemRuName(qt)
    for (const part of parts) {
      const stemPart = stemRuName(part)
      if (part === qt) best = Math.max(best, 5)
      else if (nameTokensMatch(qt, part)) best = Math.max(best, 4)
      else if (stemQt === stemPart) best = Math.max(best, 3)
      else if (
        stemQt.length >= 3 &&
        stemPart.length >= 3 &&
        (stemPart.startsWith(stemQt) || stemQt.startsWith(stemPart))
      ) {
        best = Math.max(best, 2)
      } else if (
        stemQt.length >= 4 &&
        stemPart.length >= 4 &&
        (stemPart.includes(stemQt) || stemQt.includes(stemPart))
      ) {
        best = Math.max(best, 1)
      }
    }
    if (best > 0) score += best
  }
  return score
}

/**
 * @param {object[]} students
 * @param {string} query
 * @param {number} [limit]
 * @returns {{ student: object, score: number }[]}
 */
export function rankStudentNameMatches(students, query, limit = 6) {
  const list = Array.isArray(students) ? students : []
  const q = String(query ?? '').trim()
  if (!q || list.length === 0) return []

  const digits = q.replace(/\D/g, '')
  if (digits.length >= 4) {
    const byCode = list.find((s) => String(s.short_id ?? '').includes(digits))
    if (byCode) return [{ student: byCode, score: 100 }]
  }

  const byId = list.find((s) => String(s.id) === q)
  if (byId) return [{ student: byId, score: 100 }]

  const queryTokens = extractQueryNameTokens(q)
  if (queryTokens.length === 0) return []

  return list
    .map((student) => ({ student, score: scoreStudentNameMatch(student, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || displayNameFromStudent(a.student).localeCompare(displayNameFromStudent(b.student), 'ru'))
    .slice(0, limit)
}

/**
 * @typedef {{
 *   match: object | null,
 *   suggestions: object[],
 *   ambiguous: boolean,
 *   queryTokens: string[],
 * }} StudentNameQueryResult
 */

/**
 * @param {object[]} students
 * @param {string} query
 * @returns {StudentNameQueryResult}
 */
export function resolveStudentNameQuery(students, query) {
  const ranked = rankStudentNameMatches(students, query, 8)
  const queryTokens = extractQueryNameTokens(query)

  if (!ranked.length) {
    return { match: null, suggestions: [], ambiguous: false, queryTokens }
  }

  const topScore = ranked[0].score
  const leaders = ranked.filter((row) => row.score === topScore)
  const minScore = queryTokens.length <= 1 ? 2 : queryTokens.length * 2

  let match = null
  let ambiguous = false

  if (topScore >= minScore) {
    if (leaders.length === 1) {
      match = leaders[0].student
    } else if (queryTokens.length >= 2 && ranked.length > 1 && topScore > ranked[1].score) {
      match = ranked[0].student
    } else {
      ambiguous = true
    }
  }

  const suggestions = ranked
    .map((row) => row.student)
    .filter((student, index, arr) => arr.findIndex((s) => s.id === student.id) === index)
    .filter((student) => !match || student.id !== match.id)
    .slice(0, 6)

  if (!match) {
    return {
      match: null,
      suggestions: ranked.map((row) => row.student).slice(0, 6),
      ambiguous: ambiguous || ranked.length > 1,
      queryTokens,
    }
  }

  return { match, suggestions, ambiguous: false, queryTokens }
}

/** @param {object} student */
function suggestionBirthYearLabel(student) {
  const raw = student?.birthYear ?? student?.birthYearLabel
  if (raw == null || raw === '') return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length >= 4) return `${digits.slice(0, 4)} г.р.`
  return null
}

/** Тренер явно спрашивает код ученика. */
export function isStudentCodeExplicitQuery(query) {
  const q = String(query ?? '').toLowerCase()
  return /\bкод\b|номер\s+ученик|short.?id|шестизначн|6.?значн/.test(q) || /\d{3}\s?\d{3}/.test(q)
}

/**
 * @param {object} student
 * @param {{ includeCode?: boolean }} [options]
 */
export function formatStudentSuggestionLine(student, options = {}) {
  const includeCode = options.includeCode === true
  const name = displayNameFromStudent(student)
  const parts = [name]
  const birth = suggestionBirthYearLabel(student)
  if (birth) parts.push(birth)
  if (includeCode && student?.short_id) {
    const code = formatShortIdDisplay(student.short_id)
    if (code && code !== '—') parts.push(`код ${code}`)
  }
  return parts.join(', ')
}

/**
 * @param {object[]} suggestions
 * @param {string} [query]
 * @param {{ includeCode?: boolean }} [options]
 */
export function formatStudentSuggestionsBlock(suggestions, query = '', options = {}) {
  const list = Array.isArray(suggestions) ? suggestions : []
  if (!list.length) return ''
  const label = query.trim()
    ? `Похожие на запрос «${query.trim()}»`
    : 'Похожие ученики'
  const lines = list.map((s) => `- ${formatStudentSuggestionLine(s, options)}`)
  return `## ${label}\n${lines.join('\n')}`
}

/**
 * Поиск ученика по фрагменту сообщения: имя, фамилия, код, id.
 * @param {object[]} students
 * @param {string} query
 */
export function findStudentByNameQuery(students, query) {
  return resolveStudentNameQuery(students, query).match
}

/** @deprecated используй findStudentByNameQuery */
export function findStudentInRoster(students, query) {
  return findStudentByNameQuery(students, query)
}
