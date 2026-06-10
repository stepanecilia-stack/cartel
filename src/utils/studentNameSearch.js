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
  return stemRuName(s).replace(/[оеё]/g, 'а')
}

/** Группы созвучных согласных (типичные ошибки ASR). */
const RU_CONSONANT_GROUPS = [
  ['б', 'п'],
  ['в', 'ф'],
  ['г', 'к'],
  ['д', 'т'],
  ['ж', 'ш', 'щ'],
  ['з', 'с', 'ц'],
]

/** Фонетический ключ для сопоставления имён с ошибками распознавания (А/О, Й, оглушение). */
export function ruPhoneticKey(word) {
  let s = stemRuName(word)
  if (!s) return ''
  s = s.replace(/ё/g, 'е')
  s = s.replace(/й/g, 'и')
  s = s.replace(/[оеё]/g, 'а')
  s = s.replace(/[ыи]/g, 'и')
  s = s.replace(/[юу]/g, 'у')
  s = s.replace(/я/g, 'а')
  for (const group of RU_CONSONANT_GROUPS) {
    const canonical = group[0]
    for (const ch of group) {
      s = s.split(ch).join(canonical)
    }
  }
  return s.replace(/(.)\1+/g, '$1')
}

/** @param {string} a @param {string} b */
function levenshteinDistance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

/** @param {string} a @param {string} b */
function levenshteinAtMost(a, b, maxDist) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > maxDist) return false
  return levenshteinDistance(a, b) <= maxDist
}

/**
 * Сходство токена запроса с частью ФИО (0–100). Чем выше — тем вероятнее совпадение.
 * @param {string} queryToken
 * @param {string} namePart
 */
export function tokenMatchScore(queryToken, namePart) {
  const pairs = []
  for (const va of queryTokenVariants(queryToken)) {
    for (const vb of queryTokenVariants(namePart)) {
      pairs.push([va, vb])
    }
  }
  pairs.push([queryToken, namePart])

  let best = 0
  for (const [left, right] of pairs) {
    const na = normalizeRuWord(left)
    const nb = normalizeRuWord(right)
    if (!na || !nb) continue
    if (na === nb) {
      best = Math.max(best, 100)
      continue
    }

    const sa = stemRuName(na)
    const sb = stemRuName(nb)
    if (sa === sb) {
      best = Math.max(best, 96)
      continue
    }

    const pa = ruPhoneticKey(na)
    const pb = ruPhoneticKey(nb)
    if (pa.length >= 3 && pa === pb) {
      best = Math.max(best, 93)
      continue
    }

    const ta = ruTyposKey(na)
    const tb = ruTyposKey(nb)
    if (ta.length >= 4 && tb.length >= 4 && ta === tb) {
      best = Math.max(best, 91)
      continue
    }

    const minStem = Math.min(sa.length, sb.length)
    const stemDist = levenshteinDistance(sa, sb)
    const stemMax = minStem >= 7 ? 2 : minStem >= 5 ? 1 : minStem >= 4 ? 1 : 0
    if (stemDist <= stemMax) {
      best = Math.max(best, 88 - stemDist * 7)
      continue
    }

    const phonDist = levenshteinDistance(pa, pb)
    const phonMax = minStem >= 6 ? 2 : minStem >= 4 ? 1 : 0
    if (phonDist <= phonMax) {
      best = Math.max(best, 84 - phonDist * 6)
      continue
    }

    const prefixLen = Math.min(4, minStem)
    if (prefixLen >= 3 && sa.slice(0, prefixLen) === sb.slice(0, prefixLen)) {
      best = Math.max(best, 72)
    }
  }

  return best
}

/** @param {object[]} students */
function collectRosterNameParts(students) {
  const seen = new Set()
  const parts = []
  for (const student of Array.isArray(students) ? students : []) {
    for (const part of namePartsFromStudent(student)) {
      if (seen.has(part)) continue
      seen.add(part)
      parts.push(part)
    }
  }
  return parts.sort((a, b) => b.length - a.length)
}

const CORRECTION_MIN_SCORE = 72

/**
 * Подставляет наиболее вероятные варианты имён/фамилий из ростра (ошибки ASR).
 * @param {object[]} students
 * @param {string[]} queryTokens
 */
export function correctQueryNameTokens(students, queryTokens) {
  const rosterParts = collectRosterNameParts(students)
  /** @type {{ from: string, to: string, score: number }[]} */
  const corrections = []
  const tokens = (Array.isArray(queryTokens) ? queryTokens : []).map((token) => {
    if (!isSignificantNameToken(token)) return token
    const normalized = normalizeRuWord(token)
    let bestPart = /** @type {string | null} */ (null)
    let bestScore = 0

    for (const part of rosterParts) {
      if (part === normalized) continue
      const score = tokenMatchScore(token, part)
      if (score > bestScore) {
        bestScore = score
        bestPart = part
      }
    }

    if (bestPart && bestScore >= CORRECTION_MIN_SCORE) {
      corrections.push({ from: normalized, to: bestPart, score: bestScore })
      return bestPart
    }
    return token
  })

  return { tokens, corrections }
}

/**
 * @param {object[]} students
 * @param {string} query
 */
export function refineNameQuery(students, query) {
  const originalTokens = extractQueryNameTokens(query)
  const { tokens: correctedTokens, corrections } = correctQueryNameTokens(students, originalTokens)
  let correctedQuery = String(query ?? '')
  if (corrections.length) {
    for (const { from, to } of corrections) {
      correctedQuery = correctedQuery.replace(new RegExp(`\\b${from}\\b`, 'gi'), to)
    }
  }
  return { originalTokens, correctedTokens, corrections, correctedQuery }
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
  return tokenMatchScore(a, b) >= CORRECTION_MIN_SCORE
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

  const significant = queryTokens.filter(isSignificantNameToken)
  let score = 0
  let matchedSignificant = 0
  let similaritySum = 0

  for (const qt of queryTokens) {
    let best = 0
    for (const part of parts) {
      best = Math.max(best, tokenMatchScore(qt, part))
    }
    if (best >= CORRECTION_MIN_SCORE) {
      score += Math.round(best / 10)
      if (isSignificantNameToken(qt)) {
        matchedSignificant += 1
        similaritySum += best
      }
    }
  }

  if (significant.length >= 2 && matchedSignificant >= 2) {
    const allMatch = significant.every((qt) =>
      parts.some((part) => tokenMatchScore(qt, part) >= CORRECTION_MIN_SCORE),
    )
    if (allMatch) {
      score = Math.max(score, Math.round(similaritySum / 10) + significant.length * 8)
    }
  }

  if (significant.length === 1 && matchedSignificant === 1) {
    score = Math.max(score, Math.round(similaritySum / 8))
  }

  return score
}

/**
 * @param {object} student
 * @param {string[]} tokenSets
 */
function bestScoreAcrossTokenSets(student, tokenSets) {
  let best = 0
  for (const tokens of tokenSets) {
    best = Math.max(best, scoreStudentNameMatch(student, tokens))
  }
  return best
}

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

  const refined = refineNameQuery(list, q)
  const tokenSets = [refined.originalTokens]
  if (refined.corrections.length) {
    tokenSets.push(refined.correctedTokens)
  }
  if (tokenSets.every((tokens) => tokens.length === 0)) return []

  return list
    .map((student) => ({
      student,
      score: bestScoreAcrossTokenSets(student, tokenSets),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        displayNameFromStudent(a.student).localeCompare(displayNameFromStudent(b.student), 'ru'),
    )
    .slice(0, limit)
}

/**
 * @typedef {{
 *   match: object | null,
 *   suggestions: object[],
 *   ambiguous: boolean,
 *   queryTokens: string[],
 *   significantTokens: string[],
 *   corrections?: { from: string, to: string, score: number }[],
 *   correctedQuery?: string,
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

/** @param {object[]} list @param {string[]} queryTokens */
function sortStudentsByNameScore(list, queryTokens) {
  return [...list].sort(
    (a, b) =>
      scoreStudentNameMatch(b, queryTokens) - scoreStudentNameMatch(a, queryTokens) ||
      displayNameFromStudent(a).localeCompare(displayNameFromStudent(b), 'ru'),
  )
}

export function resolveStudentNameQuery(students, query) {
  const refined = refineNameQuery(students, query)
  const ranked = rankStudentNameMatches(students, query, 8)
  const queryTokens = refined.correctedTokens.length ? refined.correctedTokens : refined.originalTokens
  const significant = queryTokens.filter(isSignificantNameToken)
  const meta = {
    corrections: refined.corrections,
    correctedQuery: refined.corrections.length ? refined.correctedQuery : undefined,
  }

  if (!ranked.length) {
    return {
      match: null,
      suggestions: [],
      ambiguous: false,
      queryTokens,
      significantTokens: significant,
      ...meta,
    }
  }

  if (significant.length === 1) {
    const lookupTokens = [
      ...new Set([
        significant[0],
        ...refined.originalTokens.filter(isSignificantNameToken),
      ]),
    ]
    let family = /** @type {object[]} */ ([])
    for (const token of lookupTokens) {
      family = studentsMatchingSurnameFamily(students, token)
      if (family.length) break
    }
    if (family.length > 1) {
      return {
        match: null,
        suggestions: sortStudentsByNameScore(family, queryTokens).slice(0, 6),
        ambiguous: true,
        queryTokens,
        significantTokens: significant,
        ...meta,
      }
    }
    if (family.length === 1) {
      return {
        match: family[0],
        suggestions: sortStudentsByNameScore(
          uniqueStudents(ranked).filter((s) => s.id !== family[0].id),
          queryTokens,
        ).slice(0, 6),
        ambiguous: false,
        queryTokens,
        significantTokens: significant,
        ...meta,
      }
    }
  }

  if (significant.length >= 2) {
    const fullMatches = ranked.filter((row) => allSignificantNameTokensMatch(row.student, queryTokens))
    if (fullMatches.length === 1) {
      return {
        match: fullMatches[0].student,
        suggestions: sortStudentsByNameScore(
          uniqueStudents(ranked).filter((s) => s.id !== fullMatches[0].student.id),
          queryTokens,
        ).slice(0, 6),
        ambiguous: false,
        queryTokens,
        significantTokens: significant,
        ...meta,
      }
    }
    if (fullMatches.length > 1) {
      if (fullMatches[0].score > fullMatches[1].score) {
        return {
          match: fullMatches[0].student,
          suggestions: sortStudentsByNameScore(
            uniqueStudents(fullMatches).filter((s) => s.id !== fullMatches[0].student.id),
            queryTokens,
          ).slice(0, 6),
          ambiguous: false,
          queryTokens,
          significantTokens: significant,
          ...meta,
        }
      }
      return {
        match: null,
        suggestions: sortStudentsByNameScore(uniqueStudents(fullMatches), queryTokens).slice(0, 6),
        ambiguous: true,
        queryTokens,
        significantTokens: significant,
        ...meta,
      }
    }
  }

  const topScore = ranked[0].score
  const secondScore = ranked[1]?.score ?? 0
  const leaders = ranked.filter((row) => row.score === topScore)
  const minScore = significant.length <= 1 ? 7 : Math.max(10, significant.length * 5)
  const clearLeader = ranked.length === 1 || topScore - secondScore >= 3

  let match = null
  let ambiguous = false

  if (topScore >= minScore) {
    if (leaders.length === 1) {
      match = leaders[0].student
    } else if (clearLeader) {
      match = ranked[0].student
    } else {
      ambiguous = true
    }
  } else if (topScore >= minScore - 2 && clearLeader && refined.corrections.length > 0) {
    match = ranked[0].student
  }

  const suggestions = uniqueStudents(ranked)
    .filter((student) => !match || student.id !== match.id)
    .slice(0, 6)

  if (!match) {
    return {
      match: null,
      suggestions: uniqueStudents(ranked).slice(0, 6),
      ambiguous: ambiguous || (ranked.length > 1 && !clearLeader),
      queryTokens,
      significantTokens: significant,
      ...meta,
    }
  }

  return { match, suggestions, ambiguous: false, queryTokens, significantTokens: significant, ...meta }
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
