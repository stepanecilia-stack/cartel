import { normalizeLegacyTestId } from './normTestsStorage.js'

const MAX_SELF_REPORTS = 40

/** Найти норматив по testId или названию из кабинета. */
export function findNormByPortalTestId(norms, testId) {
  const id = normalizeLegacyTestId(testId)
  if (!id) return null
  return (
    (Array.isArray(norms) ? norms : []).find(
      (item) =>
        normalizeLegacyTestId(item?.testId) === id ||
        normalizeLegacyTestId(item?.testName) === id,
    ) ?? null
  )
}

export function normStorageKey(norm, fallbackTestId = '') {
  return String(norm?.testId ?? fallbackTestId ?? '').trim()
}

/**
 * @typedef {{
 *   text?: string,
 *   testName?: string,
 *   testId?: string,
 *   resultRaw?: string,
 *   reportedAt: string,
 * }} PortalNormSelfReport
 */

/** @param {Date} [date] */
export function formatPortalNormSelfReportTimestamp(date = new Date()) {
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {unknown} entry */
function normalizeSelfReportEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const reportedAt =
    typeof entry.reportedAt === 'string' && entry.reportedAt.trim() ? entry.reportedAt.trim() : null
  if (!reportedAt) return null

  const testName = typeof entry.testName === 'string' ? entry.testName.trim() : ''
  const testId = typeof entry.testId === 'string' ? entry.testId.trim() : testName
  const resultRaw = typeof entry.resultRaw === 'string' ? entry.resultRaw.trim() : ''
  const text =
    typeof entry.text === 'string'
      ? entry.text.trim().slice(0, 240)
      : testName && resultRaw
        ? `${testName} — ${resultRaw}`.slice(0, 240)
        : ''

  if (!text && !(testName && resultRaw)) return null

  return {
    text: text || `${testName} — ${resultRaw}`,
    testName: testName || undefined,
    testId: testId || undefined,
    resultRaw: resultRaw || undefined,
    reportedAt,
  }
}

/** @param {unknown} raw */
export function normalizePortalNormSelfReports(raw) {
  const list = Array.isArray(raw) ? raw : []
  /** @type {PortalNormSelfReport[]} */
  const items = []
  for (const entry of list) {
    const normalized = normalizeSelfReportEntry(entry)
    if (normalized) items.push(normalized)
  }
  return items.slice(-MAX_SELF_REPORTS)
}

/**
 * @param {unknown} existing
 * @param {string} text
 * @param {Date} [date]
 */
export function appendPortalNormSelfReport(existing, text, date = new Date()) {
  const clean = String(text ?? '').trim().slice(0, 240)
  if (!clean) return normalizePortalNormSelfReports(existing)
  const reportedAt = date.toISOString()
  const next = [
    ...normalizePortalNormSelfReports(existing),
    { text: clean, reportedAt },
  ]
  return next.slice(-MAX_SELF_REPORTS)
}

/**
 * @param {unknown} existing
 * @param {{ testName: string, testId: string, resultRaw: string }} payload
 * @param {Date} [date]
 */
export function appendStructuredPortalNormSelfReport(existing, payload, date = new Date()) {
  const testName = String(payload.testName ?? '').trim()
  const testId = String(payload.testId ?? testName).trim()
  const resultRaw = String(payload.resultRaw ?? '').trim()
  if (!testName || !resultRaw) return normalizePortalNormSelfReports(existing)

  const reportedAt = date.toISOString()
  const text = `${testName} — ${resultRaw}`.slice(0, 240)
  const withoutSame = normalizePortalNormSelfReports(existing).filter(
    (item) => String(item.testId ?? item.testName ?? '') !== testId,
  )
  const next = [
    ...withoutSame,
    { text, testName, testId, resultRaw, reportedAt },
  ]
  return next.slice(-MAX_SELF_REPORTS)
}

/** @param {unknown} reports @param {string} testId */
export function getLatestSelfReportByTestId(reports, testId) {
  const id = String(testId ?? '').trim()
  if (!id) return null
  const items = normalizePortalNormSelfReports(reports)
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i]
    if (String(item.testId ?? '') === id || String(item.testName ?? '') === id) return item
  }
  return null
}

/** @param {PortalNormSelfReport[]} reports */
export function formatPortalNormSelfReportsForCoach(reports) {
  const items = normalizePortalNormSelfReports(reports)
  if (items.length === 0) return []
  return items
    .slice()
    .reverse()
    .map((item) => ({
      label: 'Со слов ученика',
      detail: `${formatPortalNormSelfReportTimestamp(new Date(item.reportedAt))}: «${item.text}»`,
    }))
}
