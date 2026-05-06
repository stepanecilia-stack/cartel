/**
 * Примерные сенситивные периоды развития двигательных качеств (возраст в полных годах).
 * Колонка «17–18» в таблице: для кода используется возраст ≥ 17.
 */
const QUALITY_ORDER = [
  'Рост',
  'Мышечная масса',
  'Быстрота',
  'Скоростно-силовые качества',
  'Сила',
  'Статическая сила',
  'Скоростная сила',
  'Динамическая сила',
  'Выносливость (аэробные возможности)',
  'Анаэробные возможности',
  'Гибкость',
  'Координационные способности',
  'Равновесие',
  'Точность',
]

/** @type {Record<string, (number | '17-18')[]>} */
const QUALITY_SENSITIVE_AGES = {
  Рост: [11, 12, 13, 14, 15],
  'Мышечная масса': [11, 12, 13, 14, 15],
  Быстрота: [9, 10, 11, 12, 13, 14],
  'Скоростно-силовые качества': [11, 12, 13, 14, 15],
  Сила: [12, 13, 14, 15, 16, '17-18'],
  'Статическая сила': [14, 15, 16, '17-18'],
  'Скоростная сила': [13, 14, 16, '17-18'],
  'Динамическая сила': [14, 15, '17-18'],
  'Выносливость (аэробные возможности)': [8, 9, 10, 15, 16, '17-18'],
  'Анаэробные возможности': [9, 10, 11, 15, 16, '17-18'],
  Гибкость: [7, 8, 9, 10, 11, 12, 13, 14],
  'Координационные способности': [8, 9, 10, 11, 12, 13, 14, 15, 16],
  Равновесие: [7, 8, 10, 11, 12, 13, 14],
  Точность: [7, 8, 9, 14, 15, 16],
}

function ageHitsBucket(ageInt, bucket) {
  if (bucket === '17-18') return ageInt >= 17
  return ageInt === bucket
}

/**
 * @param {number | null} ageYears — полные годы (как в computeAthleteAgeYears)
 * @returns {{
 *   qualities: string[],
 *   lowImpactQualities: string[],
 *   ageInt: number | null,
 *   reason: 'ok' | 'no_birth_year' | 'below_table'
 * }}
 */
export function getSensitiveMotorQualities(ageYears) {
  if (ageYears == null || !Number.isFinite(ageYears)) {
    return { qualities: [], lowImpactQualities: [], ageInt: null, reason: 'no_birth_year' }
  }
  const ageInt = Math.floor(ageYears)
  if (ageInt < 7) {
    return { qualities: [], lowImpactQualities: [], ageInt, reason: 'below_table' }
  }
  const matched = new Set()
  for (const q of QUALITY_ORDER) {
    const buckets = QUALITY_SENSITIVE_AGES[q]
    if (!buckets) continue
    if (buckets.some((b) => ageHitsBucket(ageInt, b))) matched.add(q)
  }
  const qualities = QUALITY_ORDER.filter((q) => matched.has(q))
  const lowImpactQualities = QUALITY_ORDER.filter((q) => !matched.has(q))
  return { qualities, lowImpactQualities, ageInt, reason: 'ok' }
}
