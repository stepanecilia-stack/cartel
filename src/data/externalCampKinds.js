/** @typedef {'krai' | 'federation' | 'other'} ExternalCampOrganizer */

/** @type {Record<ExternalCampOrganizer, { label: string, short: string, chip: string, bar: string }>} */
export const EXTERNAL_CAMP_ORGANIZER_STYLES = {
  krai: {
    label: 'Сборы края',
    short: 'К',
    chip: 'bg-violet-50 border-violet-400 text-violet-950',
    bar: 'bg-violet-500',
  },
  federation: {
    label: 'Сборы федерации',
    short: 'Ф',
    chip: 'bg-indigo-50 border-indigo-400 text-indigo-950',
    bar: 'bg-indigo-500',
  },
  other: {
    label: 'Сборы',
    short: 'С',
    chip: 'bg-purple-50 border-purple-300 text-purple-950',
    bar: 'bg-purple-500',
  },
}

/** @param {unknown} raw @returns {ExternalCampOrganizer} */
export function normalizeExternalCampOrganizer(raw) {
  return raw === 'federation' || raw === 'other' ? raw : 'krai'
}

/** @param {ExternalCampOrganizer} organizer @param {string} [customTitle] */
export function defaultExternalCampTitle(organizer, customTitle = '') {
  const t = customTitle.trim()
  if (t) return t
  return EXTERNAL_CAMP_ORGANIZER_STYLES[organizer].label
}

/**
 * @param {{ planKind?: string, externalCampOrganizer?: ExternalCampOrganizer } | null | undefined} item
 */
export function getExternalCampStyle(item) {
  if (item?.planKind !== 'external_camp') return null
  const org = normalizeExternalCampOrganizer(item.externalCampOrganizer)
  return EXTERNAL_CAMP_ORGANIZER_STYLES[org]
}
