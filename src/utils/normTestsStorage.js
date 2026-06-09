import { evaluateLegacyTest } from './ksrUtils.js'

export function emptyTestsRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && ('result' in v || 'normalizedScore' in v)) out[k] = v
  }
  return out
}

export function normalizeLegacyTestId(id) {
  return String(id ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCoachAcceptedNormRow(row) {
  return Boolean(row?.acceptedAt || row?.acceptedByCoachId)
}

/** Результат внесён тренером (не «со слов ученика»). */
export function isCoachOwnedNormRow(row) {
  if (!row || !Number.isFinite(Number(row.result))) return false
  return !isStudentSelfReportNormRow(row)
}

export function isStudentSelfReportNormRow(row) {
  return row?.studentSelfReport === true && !isCoachAcceptedNormRow(row)
}

/** Запись норматива в tests.physical по самоотчёту ученика («со слов ученика»). */
export function buildStudentSelfReportPhysicalRow(norm, resultRaw, reportedAtIso) {
  const parsed = applyNormRawInput(norm, resultRaw)
  if (!parsed || !Number.isFinite(parsed.result)) return null
  return {
    ...parsed,
    studentSelfReport: true,
    studentSelfReportAt: reportedAtIso,
  }
}

export function getPendingStudentSelfReport(row) {
  const pending = row?.pendingStudentSelfReport
  if (!pending || typeof pending !== 'object') return null
  if (!Number.isFinite(Number(pending.result))) return null
  return pending
}

export function hasPendingStudentSelfReport(row) {
  return getPendingStudentSelfReport(row) != null
}

/**
 * Самоотчёт ученика: первая сдача / обновление черновика / пересдача поверх зачёта тренера.
 * @returns {Record<string, unknown> | null}
 */
export function mergeStudentSelfReportIntoPhysicalRow(existingRow, norm, resultRaw, reportedAtIso) {
  const parsed = buildStudentSelfReportPhysicalRow(norm, resultRaw, reportedAtIso)
  if (!parsed) return null

  if (!existingRow || isStudentSelfReportNormRow(existingRow)) {
    return parsed
  }

  if (isCoachOwnedNormRow(existingRow)) {
    return {
      ...existingRow,
      pendingStudentSelfReport: {
        result: parsed.result,
        resultRaw: parsed.resultRaw ?? String(parsed.result),
        normalizedScore: parsed.normalizedScore,
        status: parsed.status,
        date: parsed.date,
        studentSelfReportAt: reportedAtIso,
      },
    }
  }

  return parsed
}

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

export function isMinuteSecondNorm(norm) {
  const unit = String(norm?.unit ?? '').toLowerCase()
  const name = String(norm?.testName ?? norm?.name ?? '').toLowerCase()
  if (unit.includes('мин') || unit.includes('mm:ss') || unit.includes('м:с')) return true
  // Беговые дистанции (1500 м и т.п.) вводят как мм:сс, даже если в таблице только «сек»
  if (/бег|run/.test(name) && (unit.includes('сек') || unit.includes('sec') || unit.includes('мин'))) {
    return true
  }
  if (/бег\s+на|\d+\s*м\b|\d+\s*км/.test(name) && !unit.includes('кг') && !unit.includes('раз')) {
    return true
  }
  return false
}

function parseMinuteSecondToMinutes(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const match = normalized.match(/^(\d+)\s*:\s*(\d{2})$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  if (seconds > 59) return null
  return {
    value: minutes + seconds / 60,
    display: `${minutes}:${String(seconds).padStart(2, '0')}`,
  }
}

function parseDotCommaOrSpaceMinuteSecond(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const comma = normalized.match(/^(\d+),(\d{2})$/)
  if (comma) {
    const minutes = Number(comma[1])
    const seconds = Number(comma[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  const dot = normalized.match(/^(\d+)\.(\d{2})$/)
  if (dot) {
    const minutes = Number(dot[1])
    const seconds = Number(dot[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  const sp = normalized.match(/^(\d+)\s+(\d{2})$/)
  if (sp) {
    const minutes = Number(sp[1])
    const seconds = Number(sp[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  return null
}

function parseAnyCompleteMinuteSecond(rawValue) {
  return parseMinuteSecondToMinutes(rawValue) ?? parseDotCommaOrSpaceMinuteSecond(rawValue)
}

function isPartialMinuteSecondInput(trimmed) {
  if (!trimmed) return false
  if (/^\d+$/.test(trimmed)) return true
  if (/^\d+\s*:\s*\d{0,2}$/.test(trimmed)) return true
  if (/^\d+\s+\d{0,2}$/.test(trimmed)) return true
  if (/^\d+[.,]\d{0,2}$/.test(trimmed)) return true
  if (/^\d+[.,]\s*$/.test(trimmed)) return true
  return false
}

/** Черновик ввода времени: не отбрасывать при незавершённом мм:сс. */
function minuteSecondDraftRow(trimmed, date) {
  return { resultRaw: trimmed, date }
}

export function formatMinutesToMinuteSecond(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  let minutes = Math.floor(num)
  let seconds = Math.round((num - minutes) * 60)
  if (seconds === 60) {
    minutes += 1
    seconds = 0
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatNormGoldLabel(norm) {
  if (!norm || !Number.isFinite(norm.gold)) return '—'
  const val = isMinuteSecondNorm(norm) ? formatMinutesToMinuteSecond(norm.gold) : String(norm.gold)
  return `${val} ${norm.unit || ''}`.trim()
}

export function formatNormResultDisplay(norm, row) {
  if (!row) return ''
  if (row.resultRaw) return String(row.resultRaw)
  if (row.result !== undefined && row.result !== null) {
    return isMinuteSecondNorm(norm) ? formatMinutesToMinuteSecond(row.result) : String(row.result)
  }
  return ''
}

/**
 * Парсит ввод тренера в запись теста (как на карточке ученика).
 * @returns {object | null} запись теста или null если ввод пустой/невалидный
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
    return minuteSecondDraftRow(trimmed, date)
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
    if (isPartialMinuteSecondInput(trimmed)) {
      return minuteSecondDraftRow(trimmed, date)
    }
    if (trimmed.includes('.') && !parseAnyCompleteMinuteSecond(trimmed)) return null
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

/**
 * Медаль по сохранённой строке норматива (пересчёт из result, если status не записан).
 * @param {object} norm
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {'gold' | 'silver' | 'bronze' | 'red' | 'empty'}
 */
export function resolveNormRowStatus(norm, row) {
  if (!row) return 'empty'
  let status = row.status
  if ((!status || status === 'empty') && row.result != null && Number.isFinite(Number(row.result))) {
    status = evaluateLegacyTest(Number(row.result), norm).status
  }
  if (!status || status === 'empty') return 'empty'
  if (status === 'gold' || status === 'silver' || status === 'bronze' || status === 'red') return status
  return 'empty'
}

/**
 * Сводка по списку нормативов и сохранённым результатам (вкладка «Физика»).
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
    if (isStudentSelfReportNormRow(row)) {
      empty += 1
      continue
    }
    const status = resolveNormRowStatus(norm, row)
    if (status === 'empty') {
      empty += 1
      continue
    }
    if (status === 'gold') gold += 1
    else if (status === 'silver') silver += 1
    else if (status === 'bronze') bronze += 1
    else if (status === 'red') red += 1
  }

  const passed = gold + silver + bronze
  const filled = passed + red

  return {
    total: list.length,
    gold,
    silver,
    bronze,
    red,
    empty,
    passed,
    filled,
  }
}
