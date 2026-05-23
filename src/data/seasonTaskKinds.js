/** @typedef {'technical' | 'physical'} SeasonTaskCategory */

/** @type {Record<SeasonTaskCategory, { label: string, short: string, chip: string, bar: string }>} */
export const SEASON_TASK_KIND_STYLES = {
  technical: {
    label: 'Техника',
    short: 'Т',
    chip: 'bg-[#f3f0ff] border-[#6f3ff5] text-[#4a2d9e]',
    bar: 'bg-[#6f3ff5]',
  },
  physical: {
    label: 'Физика',
    short: 'Ф',
    chip: 'bg-[#ecf3fc] border-[#2d81e0] text-[#1e4d8c]',
    bar: 'bg-[#2d81e0]',
  },
}

/**
 * @param {{ taskKind?: SeasonTaskCategory, category?: SeasonTaskCategory } | null | undefined} item
 */
export function getSeasonTaskStyle(item) {
  const kind = item?.taskKind ?? item?.category
  if (kind && SEASON_TASK_KIND_STYLES[kind]) return SEASON_TASK_KIND_STYLES[kind]
  return null
}
