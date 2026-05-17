/**
 * Последнее изменение карточки ученика для дашборда.
 */

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

function formatDateRu(ms) {
  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pushCandidate(candidates, ms, coachName) {
  if (ms == null || !Number.isFinite(ms)) return
  const name = typeof coachName === 'string' ? coachName.trim() : ''
  candidates.push({ ms, coachName: name || null })
}

function collectFromTestsBucket(candidates, bucket) {
  if (!bucket || typeof bucket !== 'object') return
  for (const row of Object.values(bucket)) {
    if (!row || typeof row !== 'object') continue
    pushCandidate(candidates, instantToMs(row.acceptedAt), row.acceptedByCoachName)
    if (Array.isArray(row.acceptanceHistory)) {
      for (const entry of row.acceptanceHistory) {
        pushCandidate(candidates, instantToMs(entry?.recordedAt), entry?.coachName)
      }
    }
  }
}

/**
 * @param {object | null | undefined} student
 * @returns {{
 *   ms: number,
 *   dateLabel: string,
 *   coachName: string | null,
 *   daysSince: number,
 *   isStale: boolean,
 * } | null}
 */
export function resolveStudentLastChange(student) {
  if (!student || typeof student !== 'object') return null

  const candidates = []
  const docMs = instantToMs(student.updatedAt)
  if (docMs != null) {
    pushCandidate(candidates, docMs, student.lastUpdatedByCoachName)
  }

  const tests = student.tests && typeof student.tests === 'object' ? student.tests : {}
  collectFromTestsBucket(candidates, tests.physical)
  collectFromTestsBucket(candidates, tests.functional)

  const createdMs = instantToMs(student.createdAt)
  if (createdMs != null) {
    pushCandidate(candidates, createdMs, student.lastUpdatedByCoachName)
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.ms - a.ms)
  const latest = candidates[0]
  const daysSince = Math.max(0, Math.floor((Date.now() - latest.ms) / 86_400_000))

  return {
    ms: latest.ms,
    dateLabel: formatDateRu(latest.ms),
    coachName: latest.coachName,
    daysSince,
    isStale: daysSince > 5,
  }
}
