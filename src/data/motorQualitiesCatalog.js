import {
  QUALITY_ORDER,
  QUALITY_SENSITIVE_AGES,
  orderSensitiveQualitiesForBoxing,
} from '../utils/sensitivePeriods.js'
import { bucketsToSensitiveAgeSet } from '../utils/sensitiveAgeScale.js'

/** Стабильные URL-сегменты (латиница) ↔ точные подписи качеств из справочника сенситивных периодов. */
export const MOTOR_QUALITY_SLUG_BY_TITLE = {
  Рост: 'rost',
  'Мышечная масса': 'myshechnaya-massa',
  Быстрота: 'bystrota',
  'Скоростно-силовые качества': 'skorostno-silovye-kachestva',
  Сила: 'sila',
  'Статическая сила': 'staticheskaya-sila',
  'Скоростная сила': 'skorostnaya-sila',
  'Динамическая сила': 'dinamicheskaya-sila',
  'Выносливость (аэробные возможности)': 'vyinoslivost-aerobnye',
  'Анаэробные возможности': 'anaerobnye-vozmozhnosti',
  Гибкость: 'gibkost',
  'Координационные способности': 'koordinacionnye-sposobnosti',
  Равновесие: 'ravnovesie',
  Точность: 'tochnost',
}

const TITLE_BY_SLUG = Object.fromEntries(
  Object.entries(MOTOR_QUALITY_SLUG_BY_TITLE).map(([title, slug]) => [slug, title]),
)

function formatSensitiveBuckets(buckets) {
  if (!Array.isArray(buckets) || buckets.length === 0) return null
  return buckets
    .map((b) => (b === '17-18' ? '17–18 лет' : `${b} лет`))
    .join(', ')
}

/**
 * Каталог страниц качеств: порядок — «боксерский» приоритет отображения, затем остальные из общего списка.
 * @returns {{ title: string, slug: string, sensitiveAgesLabel: string | null, sensitiveAgeSet: Set<number> }[]}
 */
export function getMotorQualitiesCatalog() {
  const boxingOrdered = orderSensitiveQualitiesForBoxing([...QUALITY_ORDER])
  const seen = new Set(boxingOrdered)
  const rest = QUALITY_ORDER.filter((q) => !seen.has(q))
  const titles = [...boxingOrdered, ...rest]
  return titles
    .map((title) => {
      const slug = MOTOR_QUALITY_SLUG_BY_TITLE[title]
      if (!slug) {
        console.warn('motorQualitiesCatalog: нет slug для качества', title)
        return null
      }
      const buckets = QUALITY_SENSITIVE_AGES[title]
      return {
        title,
        slug,
        sensitiveAgesLabel: formatSensitiveBuckets(buckets),
        sensitiveAgeSet: bucketsToSensitiveAgeSet(buckets),
      }
    })
    .filter(Boolean)
}

/** @param {string} title — подпись качества как в `QUALITY_ORDER` */
export function getMotorQualitySlug(title) {
  if (!title || typeof title !== 'string') return null
  return MOTOR_QUALITY_SLUG_BY_TITLE[title] ?? null
}

export function getMotorQualityBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null
  const title = TITLE_BY_SLUG[slug]
  if (!title) return null
  const buckets = QUALITY_SENSITIVE_AGES[title]
  return {
    title,
    slug,
    sensitiveAgesLabel: formatSensitiveBuckets(buckets),
    sensitiveAgeSet: bucketsToSensitiveAgeSet(buckets),
  }
}
