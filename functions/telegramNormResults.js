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
