/**
 * Чтение результатов нормативов — зеркало src/utils/normTestsStorage.js (без React).
 */

/** @param {object | null | undefined} tests */
export function migrateStudentTests(tests) {
  if (!tests || typeof tests !== 'object') {
    return { physical: {}, functional: {} }
  }
  const physical = emptyTestsRecord(tests.physical)
  const functional = emptyTestsRecord(tests.functional)
  for (const [testId, row] of Object.entries(functional)) {
    if (!getNormValueByTestId(physical, testId)) {
      physical[testId] = row
    }
  }
  return { physical, functional: {} }
}

/** @param {unknown} raw */
function emptyTestsRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && ('result' in v || 'normalizedScore' in v)) out[k] = v
  }
  return out
}

/** @param {unknown} id */
function normalizeLegacyTestId(id) {
  return String(id ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {Record<string, unknown>} values
 * @param {string} testId
 */
export function getNormValueByTestId(values, testId) {
  if (!values || typeof values !== 'object') return undefined
  if (values[testId]) return values[testId]
  const normalizedTarget = normalizeLegacyTestId(testId)
  if (!normalizedTarget) return undefined
  for (const [key, value] of Object.entries(values)) {
    if (normalizeLegacyTestId(key) === normalizedTarget) return value
  }
  return undefined
}

/** @param {object | null | undefined} norm */
function isMinuteSecondNorm(norm) {
  const unit = String(norm?.unit ?? '').toLowerCase()
  const name = String(norm?.testName ?? norm?.name ?? '').toLowerCase()
  if (unit.includes('мин') || unit.includes('mm:ss') || unit.includes('м:с')) return true
  if (/бег|run/.test(name) && (unit.includes('сек') || unit.includes('sec') || unit.includes('мин'))) {
    return true
  }
  if (/бег\s+на|\d+\s*м\b|\d+\s*км/.test(name) && !unit.includes('кг') && !unit.includes('раз')) {
    return true
  }
  return false
}

/** @param {number} num */
function formatMinutesToMinuteSecond(num) {
  if (!Number.isFinite(num)) return ''
  let minutes = Math.floor(num)
  let seconds = Math.round((num - minutes) * 60)
  if (seconds === 60) {
    minutes += 1
    seconds = 0
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** @param {number} value */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * @param {number} result
 * @param {object} norm
 */
export function evaluateLegacyTest(result, norm) {
  const { gold, silver, bronze, measureType } = norm
  let status = 'red'
  let normalizedScore = 0
  if (measureType === 'MAX') {
    if (result >= gold) {
      status = 'gold'
      normalizedScore = 100 + ((result - gold) / gold) * 20
    } else if (result >= silver) {
      status = 'silver'
      normalizedScore = 80 + ((result - silver) / (gold - silver)) * 20
    } else if (result >= bronze) {
      status = 'bronze'
      normalizedScore = 60 + ((result - bronze) / (silver - bronze)) * 20
    } else normalizedScore = (result / bronze) * 60
  } else if (result <= gold) {
    status = 'gold'
    normalizedScore = 100 + ((gold - result) / gold) * 20
  } else if (result <= silver) {
    status = 'silver'
    normalizedScore = 80 + ((silver - result) / (silver - gold)) * 20
  } else if (result <= bronze) {
    status = 'bronze'
    normalizedScore = 60 + ((bronze - result) / (bronze - silver)) * 20
  } else normalizedScore = (bronze / result) * 60
  return { status, normalizedScore: Math.round(clamp(normalizedScore, 0, 120)) }
}

/** @param {object | null | undefined} row */
function isStudentSelfReportNormRow(row) {
  return row?.studentSelfReport === true && !row?.acceptedAt && !row?.acceptedByCoachId
}

/**
 * @param {object} norm
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {'gold' | 'silver' | 'bronze' | 'red' | 'empty'}
 */
export function resolveNormRowStatus(norm, row) {
  if (!row || isStudentSelfReportNormRow(row)) return 'empty'
  let status = row.status
  if ((!status || status === 'empty') && row.result != null && Number.isFinite(Number(row.result))) {
    status = evaluateLegacyTest(Number(row.result), norm).status
  }
  if (!status || status === 'empty') return 'empty'
  if (status === 'gold' || status === 'silver' || status === 'bronze' || status === 'red') {
    return status
  }
  return 'empty'
}

/**
 * @param {object} norm
 * @param {Record<string, unknown> | null | undefined} row
 */
export function formatNormResultDisplay(norm, row) {
  if (!row) return ''
  if (row.resultRaw) return String(row.resultRaw)
  if (row.result !== undefined && row.result !== null) {
    return isMinuteSecondNorm(norm)
      ? formatMinutesToMinuteSecond(Number(row.result))
      : String(row.result)
  }
  return ''
}

/** @param {object | null | undefined} norm */
export function formatNormGoldLabel(norm) {
  if (!norm || !Number.isFinite(norm.gold)) return '—'
  const val = isMinuteSecondNorm(norm)
    ? formatMinutesToMinuteSecond(norm.gold)
    : String(norm.gold)
  return `${val}${norm.unit ? ` ${norm.unit}` : ''}`.trim()
}

/** @param {'gold' | 'silver' | 'bronze' | 'red' | 'empty'} status */
function statusLabelRu(status) {
  if (status === 'gold') return 'золото'
  if (status === 'silver') return 'серебро'
  if (status === 'bronze') return 'бронза'
  if (status === 'red') return 'ниже нормы'
  return 'не сдано'
}

/**
 * @param {object} student
 * @param {object[]} norms
 */
export function buildStudentPhysicalValues(student) {
  const migrated = migrateStudentTests(student?.tests)
  return migrated.physical
}

/**
 * @param {object[]} norms
 * @param {Record<string, unknown>} values
 */
export function summarizeNormsForValues(norms, values) {
  const list = Array.isArray(norms) ? norms : []
  let gold = 0
  let silver = 0
  let bronze = 0
  let red = 0
  let empty = 0

  for (const norm of list) {
    const row = getNormValueByTestId(values, norm.testId)
    const status = resolveNormRowStatus(norm, row)
    if (status === 'empty') empty += 1
    else if (status === 'gold') gold += 1
    else if (status === 'silver') silver += 1
    else if (status === 'bronze') bronze += 1
    else if (status === 'red') red += 1
  }

  return {
    total: list.length,
    gold,
    silver,
    bronze,
    red,
    empty,
    passed: gold + silver + bronze,
  }
}

/**
 * @param {object[]} norms
 * @param {Record<string, unknown>} values
 */
export function buildNormItems(norms, values) {
  return (Array.isArray(norms) ? norms : []).map((norm) => {
    const row = getNormValueByTestId(values, norm.testId)
    const status = resolveNormRowStatus(norm, row)
    const displayResult = formatNormResultDisplay(norm, row)
    return {
      norm,
      status,
      statusLabel: statusLabelRu(status),
      displayResult,
      goalGold: formatNormGoldLabel(norm),
    }
  })
}

/** @param {string} rawValue */
function parseMinuteSecondToMinutes(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const match = normalized.match(/^(\d+)\s*:\s*(\d{2})$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
  return {
    value: minutes + seconds / 60,
    display: `${minutes}:${String(seconds).padStart(2, '0')}`,
  }
}

/** @param {string} rawValue */
function parseDotCommaOrSpaceMinuteSecond(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const comma = normalized.match(/^(\d+),(\d{2})$/)
  if (comma) {
    const minutes = Number(comma[1])
    const seconds = Number(comma[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return { value: minutes + seconds / 60, display: `${minutes}:${String(seconds).padStart(2, '0')}` }
  }
  const dot = normalized.match(/^(\d+)\.(\d{2})$/)
  if (dot) {
    const minutes = Number(dot[1])
    const seconds = Number(dot[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return { value: minutes + seconds / 60, display: `${minutes}:${String(seconds).padStart(2, '0')}` }
  }
  const sp = normalized.match(/^(\d+)\s+(\d{2})$/)
  if (sp) {
    const minutes = Number(sp[1])
    const seconds = Number(sp[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return { value: minutes + seconds / 60, display: `${minutes}:${String(seconds).padStart(2, '0')}` }
  }
  return null
}

/** @param {string} rawValue */
function parseAnyCompleteMinuteSecond(rawValue) {
  return parseMinuteSecondToMinutes(rawValue) ?? parseDotCommaOrSpaceMinuteSecond(rawValue)
}

/**
 * @param {object} norm
 * @param {unknown} rawValue
 */
export function applyNormRawInput(norm, rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return null
  const trimmed = String(rawValue ?? '').trim()
  const date = new Date().toISOString().slice(0, 10)

  if (trimmed.includes(':')) {
    const complete = parseAnyCompleteMinuteSecond(trimmed)
    if (complete) {
      const result = complete.value
      if (!Number.isFinite(result)) return null
      return {
        ...evaluateLegacyTest(result, norm),
        result,
        resultRaw: complete.display,
        date,
      }
    }
    return null
  }

  if (isMinuteSecondNorm(norm)) {
    const complete = parseAnyCompleteMinuteSecond(trimmed)
    if (complete) {
      const result = complete.value
      if (!Number.isFinite(result)) return null
      return {
        ...evaluateLegacyTest(result, norm),
        result,
        resultRaw: complete.display,
        date,
      }
    }
    const numericRaw = trimmed.replace(',', '.')
    const result = Number(numericRaw)
    if (!Number.isFinite(result)) return null
    return { ...evaluateLegacyTest(result, norm), result, resultRaw: trimmed, date }
  }

  const minuteSecond = parseMinuteSecondToMinutes(trimmed)
  const numericRaw = trimmed.replace(',', '.')
  const result = minuteSecond ? minuteSecond.value : Number(numericRaw)
  if (!Number.isFinite(result)) return null
  return {
    ...evaluateLegacyTest(result, norm),
    result,
    resultRaw: minuteSecond?.display ?? trimmed,
    date,
  }
}

