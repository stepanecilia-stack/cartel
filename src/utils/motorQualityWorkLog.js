import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog.js'

const MAX_ENTRIES_PER_QUALITY = 120

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

function localDayKey(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * @param {unknown} raw
 * @returns {Record<string, object[]>}
 */
export function normalizeMotorQualityWorkLog(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [slug, list] of Object.entries(raw)) {
    if (!slug || typeof slug !== 'string' || !Array.isArray(list)) continue
    const rows = list
      .filter((e) => e && typeof e === 'object' && typeof e.exerciseId === 'string')
      .map((e) => ({
        id: typeof e.id === 'string' ? e.id : `${instantToMs(e.completedAt) ?? Date.now()}_${e.exerciseId}`,
        exerciseId: e.exerciseId,
        exerciseTitle: typeof e.exerciseTitle === 'string' ? e.exerciseTitle : '',
        doseText: typeof e.doseText === 'string' ? e.doseText : null,
        completedAt: e.completedAt ?? null,
        inSensitivePeriod: Boolean(e.inSensitivePeriod),
        coachId: typeof e.coachId === 'string' ? e.coachId : null,
        coachName: typeof e.coachName === 'string' ? e.coachName : null,
      }))
      .filter((e) => instantToMs(e.completedAt) != null)
    if (rows.length) out[slug] = rows.slice(-MAX_ENTRIES_PER_QUALITY)
  }
  return out
}

/**
 * @param {Record<string, object[]>} log
 * @param {string} qualitySlug
 * @param {string} exerciseId
 */
function entriesForExercise(log, qualitySlug, exerciseId) {
  if (!qualitySlug || !exerciseId) return []
  const list = normalizeMotorQualityWorkLog(log)[qualitySlug]
  if (!list?.length) return []
  return list.filter((e) => e.exerciseId === exerciseId)
}

export function wasExerciseCompletedToday(log, qualitySlug, exerciseId) {
  const today = localDayKey(Date.now())
  return entriesForExercise(log, qualitySlug, exerciseId).some((e) => {
    const ms = instantToMs(e.completedAt)
    return ms != null && localDayKey(ms) === today
  })
}

/** @returns {number} */
export function countExerciseCompletions(log, qualitySlug, exerciseId) {
  return entriesForExercise(log, qualitySlug, exerciseId).length
}

/** @returns {number} */
export function countExerciseCompletionsToday(log, qualitySlug, exerciseId) {
  const today = localDayKey(Date.now())
  return entriesForExercise(log, qualitySlug, exerciseId).filter((e) => {
    const ms = instantToMs(e.completedAt)
    return ms != null && localDayKey(ms) === today
  }).length
}

/**
 * @param {Record<string, object[]>} log
 * @param {string} qualitySlug
 * @param {object} entry
 */
export function appendMotorQualityWorkEntry(log, qualitySlug, entry) {
  const normalized = normalizeMotorQualityWorkLog(log)
  const prev = normalized[qualitySlug] ?? []
  return {
    ...normalized,
    [qualitySlug]: [...prev, entry].slice(-MAX_ENTRIES_PER_QUALITY),
  }
}

/**
 * @param {Record<string, object[]>} log
 * @param {string} qualitySlug
 * @param {string} exerciseId
 */
/** Удалить все отметки за сегодня по упражнению (legacy). */
export function removeTodayMotorQualityWorkEntry(log, qualitySlug, exerciseId) {
  const normalized = normalizeMotorQualityWorkLog(log)
  const list = normalized[qualitySlug]
  if (!list?.length) return normalized
  const today = localDayKey(Date.now())
  const next = list.filter((e) => {
    if (e.exerciseId !== exerciseId) return true
    const ms = instantToMs(e.completedAt)
    return ms == null || localDayKey(ms) !== today
  })
  const out = { ...normalized }
  if (next.length) out[qualitySlug] = next
  else delete out[qualitySlug]
  return out
}

/** Снять последнюю отметку за сегодня по этому упражнению (если отметок за день несколько). */
export function removeLastTodayMotorQualityWorkEntry(log, qualitySlug, exerciseId) {
  const normalized = normalizeMotorQualityWorkLog(log)
  const list = normalized[qualitySlug]
  if (!list?.length) return normalized
  const today = localDayKey(Date.now())
  let removeId = null
  let removeMs = -1
  for (const e of list) {
    if (e.exerciseId !== exerciseId) continue
    const ms = instantToMs(e.completedAt)
    if (ms == null || localDayKey(ms) !== today) continue
    if (ms >= removeMs) {
      removeMs = ms
      removeId = e.id
    }
  }
  if (!removeId) return normalized
  const next = list.filter((e) => e.id !== removeId)
  const out = { ...normalized }
  if (next.length) out[qualitySlug] = next
  else delete out[qualitySlug]
  return out
}

export function formatWorkLogEntryDate(entry) {
  const ms = instantToMs(entry?.completedAt)
  if (ms == null) return ''
  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * @param {unknown} workLog
 * @returns {{ slug: string, title: string, entries: object[] }[]}
 */
export function groupMotorQualityWorkLogForDisplay(workLog) {
  const normalized = normalizeMotorQualityWorkLog(workLog)
  const catalog = getMotorQualitiesCatalog()
  const order = new Map(catalog.map((q, i) => [q.slug, i]))

  return Object.entries(normalized)
    .map(([slug, entries]) => {
      const title = catalog.find((q) => q.slug === slug)?.title ?? slug
      const sorted = [...entries].sort(
        (a, b) => (instantToMs(a.completedAt) ?? 0) - (instantToMs(b.completedAt) ?? 0),
      )
      return { slug, title, entries: sorted }
    })
    .filter((g) => g.entries.length > 0)
    .sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999))
}
