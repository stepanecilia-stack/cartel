/** Границы шкалы на карточках качеств (полные годы). */
export const SENSITIVE_AGE_SCALE_MIN = 7
export const SENSITIVE_AGE_SCALE_MAX = 18

export const SENSITIVE_AGE_SCALE_SPAN = SENSITIVE_AGE_SCALE_MAX - SENSITIVE_AGE_SCALE_MIN + 1

function isOnScale(age) {
  return typeof age === 'number' && age >= SENSITIVE_AGE_SCALE_MIN && age <= SENSITIVE_AGE_SCALE_MAX
}

/**
 * Соседние сенситивные годы → диапазоны для подписей (например 7–9, 14–16).
 * @param {Set<number> | number[]} sensitiveAges
 * @returns {{ start: number, end: number, label: string }[]}
 */
export function groupSensitiveAgeRanges(sensitiveAges) {
  const active = sensitiveAges instanceof Set ? sensitiveAges : new Set(sensitiveAges ?? [])
  const ages = [...active].filter(isOnScale).sort((a, b) => a - b)
  if (ages.length === 0) return []

  const ranges = []
  let start = ages[0]
  let end = ages[0]
  for (let i = 1; i < ages.length; i++) {
    if (ages[i] === end + 1) {
      end = ages[i]
    } else {
      ranges.push({
        start,
        end,
        label: start === end ? String(start) : `${start}–${end}`,
      })
      start = ages[i]
      end = ages[i]
    }
  }
  ranges.push({
    start,
    end,
    label: start === end ? String(start) : `${start}–${end}`,
  })
  return ranges
}

/**
 * Позиция диапазона на шкале 7–18 (в процентах).
 * @param {number} start
 * @param {number} end
 */
export function sensitiveRangePositionPercent(start, end) {
  const leftPct = ((start - SENSITIVE_AGE_SCALE_MIN) / SENSITIVE_AGE_SCALE_SPAN) * 100
  const widthPct = ((end - start + 1) / SENSITIVE_AGE_SCALE_SPAN) * 100
  return { leftPct, widthPct }
}

/**
 * @param {(number | '17-18')[] | undefined} buckets
 * @returns {Set<number>}
 */
export function bucketsToSensitiveAgeSet(buckets) {
  const set = new Set()
  if (!Array.isArray(buckets)) return set
  for (const bucket of buckets) {
    if (bucket === '17-18') {
      set.add(17)
      set.add(18)
      continue
    }
    if (typeof bucket === 'number' && isOnScale(bucket)) {
      set.add(bucket)
    }
  }
  return set
}

/**
 * @param {string} qualityTitle
 * @param {Record<string, (number | '17-18')[]>} agesByTitle
 */
export function sensitiveAgeSetForQuality(qualityTitle, agesByTitle) {
  return bucketsToSensitiveAgeSet(agesByTitle?.[qualityTitle])
}
