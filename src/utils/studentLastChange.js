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

function trimSection(value) {
  const s = typeof value === 'string' ? value.trim() : ''
  return s.length ? s : null
}

function pushCandidate(candidates, ms, coachName, sectionLabel) {
  if (ms == null || !Number.isFinite(ms)) return
  const name = typeof coachName === 'string' ? coachName.trim() : ''
  candidates.push({
    ms,
    coachName: name || null,
    sectionLabel: trimSection(sectionLabel),
  })
}

function normRowSection(categoryLabel, row) {
  const name =
    typeof row?.normNameSnapshot === 'string' && row.normNameSnapshot.trim()
      ? row.normNameSnapshot.trim()
      : null
  return name ? `${categoryLabel}: ${name}` : categoryLabel
}

function collectFromTestsBucket(candidates, bucket, categoryLabel) {
  if (!bucket || typeof bucket !== 'object') return
  for (const row of Object.values(bucket)) {
    if (!row || typeof row !== 'object') continue
    pushCandidate(
      candidates,
      instantToMs(row.acceptedAt),
      row.acceptedByCoachName,
      normRowSection(categoryLabel, row),
    )
    if (Array.isArray(row.acceptanceHistory)) {
      for (const entry of row.acceptanceHistory) {
        pushCandidate(
          candidates,
          instantToMs(entry?.recordedAt),
          entry?.coachName,
          normRowSection(categoryLabel, entry),
        )
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
 *   sectionLabel: string | null,
 *   daysSince: number,
 *   isStale: boolean,
 * } | null}
 */
export function resolveStudentLastChange(student) {
  if (!student || typeof student !== 'object') return null

  const candidates = []
  const docMs = instantToMs(student.updatedAt)
  if (docMs != null) {
    pushCandidate(candidates, docMs, student.lastUpdatedByCoachName, student.lastUpdatedSection)
  }

  const tests = student.tests && typeof student.tests === 'object' ? student.tests : {}
  collectFromTestsBucket(candidates, tests.physical, 'Норматив · физика')
  collectFromTestsBucket(candidates, tests.functional, 'Норматив · физика')

  const createdMs = instantToMs(student.createdAt)
  if (createdMs != null) {
    pushCandidate(candidates, createdMs, student.lastUpdatedByCoachName, 'Создание карточки')
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.ms - a.ms)
  const latest = candidates[0]
  const daysSince = Math.max(0, Math.floor((Date.now() - latest.ms) / 86_400_000))

  return {
    ms: latest.ms,
    dateLabel: formatDateRu(latest.ms),
    coachName: latest.coachName,
    sectionLabel: latest.sectionLabel,
    daysSince,
    isStale: daysSince > 5,
  }
}
