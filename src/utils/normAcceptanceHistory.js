/**
 * История принятия нормативов (для графиков прогресса по параметру).
 *
 * Каждый элемент acceptanceHistory — одна точка на временной оси:
 * - recordedAt: ISO 8601 (строка), ось X графика
 * - result: число в единицах норматива, ось Y (сырой результат)
 * - normalizedScore: 0–120, альтернативная ось Y для сопоставимости
 * - status: 'gold' | 'silver' | 'bronze' | 'red'
 * - testId + category: ключ серии на графике (category: 'physical' | 'functional')
 * - normNameSnapshot, unitSnapshot, measureTypeSnapshot: подписи, если справочник норм изменится
 *
 * Текущее принятое значение дублируется в корне записи теста + last-метаданные:
 * - acceptedAt, acceptedByCoachId, acceptedByCoachName
 */

export function buildNormAcceptanceHistoryEntry({
  norm,
  category,
  coachId,
  coachName,
  evaluated,
}) {
  const recordedAt = new Date().toISOString()
  return {
    id: `h_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`,
    recordedAt,
    coachId: coachId ?? '',
    coachName: coachName ?? '—',
    result: evaluated.result,
    resultRaw: evaluated.resultRaw ?? null,
    normalizedScore: evaluated.normalizedScore,
    status: evaluated.status,
    testId: norm.testId,
    category,
    normNameSnapshot: norm.testName ?? '',
    measureTypeSnapshot: norm.measureType ?? '',
    unitSnapshot: norm.unit ?? '',
  }
}

export function mergeNormAcceptanceHistory(prevHistory, entry) {
  const base = Array.isArray(prevHistory) ? [...prevHistory] : []
  base.push(entry)
  return base
}

function instantToMs(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : null
  }
  if (typeof value.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : null
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000
  }
  return null
}

/** Подпись для самоотчёта ученика в блоке «Физика». */
export function formatStudentSelfReportMeta(row) {
  if (!row?.studentSelfReport) return null
  const ms = instantToMs(row.studentSelfReportAt ?? row.date)
  const when =
    ms != null
      ? new Date(ms).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  return when ? `Со слов ученика · ${when}` : 'Со слов ученика'
}

/** Подпись пересдачи поверх зачёта тренера. */
export function formatPendingStudentSelfReportMeta(row) {
  const pending = row?.pendingStudentSelfReport
  if (!pending || typeof pending !== 'object') return null
  const ms = instantToMs(pending.studentSelfReportAt ?? pending.date)
  const when =
    ms != null
      ? new Date(ms).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  return when ? `Пересдача со слов ученика · ${when}` : 'Пересдача со слов ученика'
}

/** Короткая подпись для UI: кто и когда принял норматив. */
export function formatNormAcceptedMeta(row) {
  if (!row?.acceptedAt && !row?.acceptedByCoachName) return null
  const ms = instantToMs(row.acceptedAt)
  const when =
    ms != null
      ? new Date(ms).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  const who = typeof row.acceptedByCoachName === 'string' ? row.acceptedByCoachName.trim() : ''
  if (who && when) return `Принял: ${who} · ${when}`
  if (who) return `Принял: ${who}`
  if (when) return when
  return null
}

/** Сортированные точки для будущего графика по одному testId (копия массива). */
export function normHistorySortedForChart(acceptanceHistory) {
  if (!Array.isArray(acceptanceHistory) || acceptanceHistory.length === 0) return []
  return [...acceptanceHistory].sort((a, b) => {
    const ta = instantToMs(a?.recordedAt) ?? 0
    const tb = instantToMs(b?.recordedAt) ?? 0
    return ta - tb
  })
}
