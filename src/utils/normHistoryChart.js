import { normHistorySortedForChart } from './normAcceptanceHistory.js'
import { formatMinutesToMinuteSecond, isMinuteSecondNorm } from './normTestsStorage.js'

function instantToMs(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : null
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : null
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000
  }
  return null
}

/** @param {string} iso */
export function formatNormChartDateLabel(iso) {
  const ms = instantToMs(iso)
  if (ms == null) return '—'
  return new Date(ms).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/** @param {object} norm @param {number} result @param {string | null | undefined} resultRaw */
export function formatNormChartResultDisplay(norm, result, resultRaw) {
  if (resultRaw != null && String(resultRaw).trim()) return String(resultRaw).trim()
  if (!Number.isFinite(result)) return '—'
  if (isMinuteSecondNorm(norm)) return formatMinutesToMinuteSecond(result)
  return String(result)
}

/**
 * @param {object} norm
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {Array<{
 *   id: string,
 *   recordedAt: string,
 *   dateLabel: string,
 *   result: number,
 *   resultDisplay: string,
 *   normalizedScore: number | null,
 *   status: string,
 *   coachName: string,
 * }>}
 */
export function buildNormChartPoints(norm, row) {
  const history = normHistorySortedForChart(row?.acceptanceHistory)
  if (history.length > 0) {
    return history
      .filter((entry) => Number.isFinite(Number(entry?.result)))
      .map((entry) => ({
        id: String(entry.id ?? `${entry.recordedAt}-${entry.result}`),
        recordedAt: String(entry.recordedAt ?? ''),
        dateLabel: formatNormChartDateLabel(entry.recordedAt),
        result: Number(entry.result),
        resultDisplay: formatNormChartResultDisplay(norm, Number(entry.result), entry.resultRaw),
        normalizedScore: Number.isFinite(Number(entry.normalizedScore)) ? Number(entry.normalizedScore) : null,
        status: String(entry.status ?? ''),
        coachName: String(entry.coachName ?? '').trim(),
      }))
  }

  if (!row || !Number.isFinite(Number(row.result))) return []

  const recordedAt = row.acceptedAt || row.date
  if (!recordedAt) return []

  const result = Number(row.result)
  return [
    {
      id: 'legacy-single',
      recordedAt: String(recordedAt),
      dateLabel: formatNormChartDateLabel(recordedAt),
      result,
      resultDisplay: formatNormChartResultDisplay(norm, result, row.resultRaw),
      normalizedScore: Number.isFinite(Number(row.normalizedScore)) ? Number(row.normalizedScore) : null,
      status: String(row.status ?? ''),
      coachName: String(row.acceptedByCoachName ?? '').trim(),
    },
  ]
}

/**
 * @param {ReturnType<typeof buildNormChartPoints>} points
 * @param {object} norm
 */
export function normChartYDomain(points, norm) {
  const values = points.map((p) => p.result)
  for (const key of ['gold', 'silver', 'bronze']) {
    const v = Number(norm?.[key])
    if (Number.isFinite(v)) values.push(v)
  }
  if (values.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.12, max * 0.05, 0.5)
  return { min: min - pad, max: max + pad }
}

/** @param {string | undefined} status */
export function normChartPointColor(status) {
  if (status === 'gold') return '#ffa000'
  if (status === 'silver') return '#818c99'
  if (status === 'bronze') return '#cd7f32'
  if (status === 'red') return '#e64646'
  return '#2d81e0'
}
