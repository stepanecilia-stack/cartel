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
  'да',
  'для',
  'год',
  'года',
  'году',
  'раз',
  'раза',
  'разов',
  'базе',
  'базу',
  'база',
  'отметь',
  'отметьте',
  'правильно',
  'подтверждаю',
  'подтверждаешь',
  'подтверждаете',
  'подтвердил',
  'подтвердила',
  'записываю',
  'записываешь',
  'записываете',
  'отжался',
  'отжалась',
  'отжались',
  'отжим',
  'отжиманий',
  'окей',
  'оке',
  'okay',
  'ладно',
  'ну',
  'эм',
  'э',
  'алло',
  'слушай',
  'коллега',
  'хорошо',
  'существует',
  'системе',
  'нашей',
  'в',
  'расшифруй',
  'расшифруйте',
  'расшифров',
  'голосовое',
  'голосов',
  'сообщение',
  'сообщения',
  'тренера',
  'тренер',
  'тренеру',
  'это',
  'она',
  'он',
  'точно',
  'уверен',
  'уверена',
  'люди',
  'человек',
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

/** Уменьшительные и разговорные формы → полное имя. */
const NAME_ALIASES = {
  миша: ['михаил'],
  мишу: ['михаил'],
  миши: ['михаил'],
  михаил: ['миша'],
  саша: ['александр', 'александра'],
  сашу: ['александр', 'александра'],
  дима: ['дмитрий'],
  диму: ['дмитрий'],
  вова: ['владимир'],
  вову: ['владимир'],
  коля: ['николай'],
  колю: ['николай'],
  паша: ['павел'],
  леша: ['алексей'],
  лёша: ['алексей'],
  лешу: ['алексей'],
  катя: ['екатерина'],
  лена: ['елена'],
  настя: ['анастасия'],
  даня: ['даниил'],
  даню: ['даниил'],
  женя: ['евгений', 'евгения'],
  ваня: ['иван'],
  петя: ['петр'],
  сережа: ['сергей'],
  серёжа: ['сергей'],
}

const STEM_ENDINGS = [
  'ого',
  'ему',
  'ому',
  'ова',
  'ева',
  'ина',
  'ына',
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

/** @param {string} s */
function ruTyposKey(s) {
  return stemRuName(s).replace(/о/g, 'а')
}

/** @param {string} a @param {string} b */
function levenshteinAtMost(a, b, maxDist) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > maxDist) return false
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    let rowMin = maxDist + 1
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      rowMin = Math.min(rowMin, dp[i][j])
    }
    if (rowMin > maxDist) return false
  }
  return dp[a.length][b.length] <= maxDist
}

/** @param {string} token */
function queryTokenVariants(token) {
  const base = normalizeRuWord(token)
  const variants = new Set([base, stemRuName(base)])
  const aliases = NAME_ALIASES[base] ?? NAME_ALIASES[stemRuName(base)] ?? []
  for (const alias of aliases) {
    variants.add(alias)
    variants.add(stemRuName(alias))
  }
  return [...variants].filter(Boolean)
}

/** @param {string} a @param {string} b */
function nameTokensMatch(a, b) {
  const pairs = []
  for (const va of queryTokenVariants(a)) {
    for (const vb of queryTokenVariants(b)) {
      pairs.push([va, vb])
    }
  }
  pairs.push([a, b])

  for (const [left, right] of pairs) {
    const sa = stemRuName(left)
    const sb = stemRuName(right)
    if (!sa || !sb) continue
    if (sa === sb) return true

    const ta = ruTyposKey(left)
    const tb = ruTyposKey(right)
    if (ta.length >= 5 && tb.length >= 5 && ta === tb) return true
    if (ta.length >= 6 && tb.length >= 6 && levenshteinAtMost(ta, tb, 1)) return true

    const min = Math.min(sa.length, sb.length)
    if (min < 3) continue
    const prefixLen = Math.min(5, min)
    if (sa.slice(0, prefixLen) === sb.slice(0, prefixLen)) return true
  }

  return false
}

/**
 * @param {object[]} students
 * @param {string} token
 */
function studentsMatchingSurnameFamily(students, token) {
  const list = Array.isArray(students) ? students : []
  return list.filter((student) => {
    const parts = namePartsFromStudent(student)
    return parts.some((part) => nameTokensMatch(token, part))
  })
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

/** @param {string} token */
function isSignificantNameToken(token) {
  return token.length >= 3 && !QUERY_STOP_WORDS.has(token) && !/^\d+$/.test(token)
}

/**
 * Имя и фамилия в любом порядке: «Назар Ермаков» = «Ермаков Назар».
 * @param {object} student
 * @param {string[]} queryTokens
 */
export function allSignificantNameTokensMatch(student, queryTokens) {
  const parts = namePartsFromStudent(student)
  const significant = queryTokens.filter(isSignificantNameToken)
  if (significant.length < 2 || !parts.length) return false
  return significant.every((qt) => parts.some((part) => nameTokensMatch(qt, part)))
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

  const significant = queryTokens.filter(isSignificantNameToken)
  if (significant.length >= 2 && allSignificantNameTokensMatch(student, queryTokens)) {
    score = Math.max(score, significant.length * 5 + 2)
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
function uniqueStudents(rows) {
  return rows
    .map((row) => row.student)
    .filter((student, index, arr) => arr.findIndex((s) => s.id === student.id) === index)
}

export function resolveStudentNameQuery(students, query) {
  const ranked = rankStudentNameMatches(students, query, 8)
  const queryTokens = extractQueryNameTokens(query)
  const significant = queryTokens.filter(isSignificantNameToken)

  if (!ranked.length) {
    return { match: null, suggestions: [], ambiguous: false, queryTokens, significantTokens: significant }
  }

  if (significant.length === 1) {
    const family = studentsMatchingSurnameFamily(students, significant[0])
    if (family.length > 1) {
      return {
        match: null,
        suggestions: family.slice(0, 6),
        ambiguous: true,
        queryTokens,
        significantTokens: significant,
      }
    }
    if (family.length === 1) {
      return {
        match: family[0],
        suggestions: uniqueStudents(ranked)
          .filter((s) => s.id !== family[0].id)
          .slice(0, 6),
        ambiguous: false,
        queryTokens,
        significantTokens: significant,
      }
    }
  }

  if (significant.length >= 2) {
    const fullMatches = ranked.filter((row) => allSignificantNameTokensMatch(row.student, queryTokens))
    if (fullMatches.length === 1) {
      return {
        match: fullMatches[0].student,
        suggestions: uniqueStudents(ranked)
          .filter((s) => s.id !== fullMatches[0].student.id)
          .slice(0, 6),
        ambiguous: false,
        queryTokens,
        significantTokens: significant,
      }
    }
    if (fullMatches.length > 1) {
      if (fullMatches[0].score > fullMatches[1].score) {
        return {
          match: fullMatches[0].student,
          suggestions: uniqueStudents(fullMatches)
            .filter((s) => s.id !== fullMatches[0].student.id)
            .slice(0, 6),
          ambiguous: false,
          queryTokens,
          significantTokens: significant,
        }
      }
      return {
        match: null,
        suggestions: uniqueStudents(fullMatches).slice(0, 6),
        ambiguous: true,
        queryTokens,
        significantTokens: significant,
      }
    }
  }

  const topScore = ranked[0].score
  const leaders = ranked.filter((row) => row.score === topScore)
  const minScore = significant.length <= 1 ? 2 : Math.max(4, significant.length * 2)

  let match = null
  let ambiguous = false

  if (topScore >= minScore) {
    if (leaders.length === 1) {
      match = leaders[0].student
    } else if (significant.length >= 2 && ranked.length > 1 && topScore > ranked[1].score) {
      match = ranked[0].student
    } else {
      ambiguous = true
    }
  }

  const suggestions = uniqueStudents(ranked)
    .filter((student) => !match || student.id !== match.id)
    .slice(0, 6)

  if (!match) {
    return {
      match: null,
      suggestions: uniqueStudents(ranked).slice(0, 6),
      ambiguous: ambiguous || ranked.length > 1,
      queryTokens,
      significantTokens: significant,
    }
  }

  return { match, suggestions, ambiguous: false, queryTokens, significantTokens: significant }
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
