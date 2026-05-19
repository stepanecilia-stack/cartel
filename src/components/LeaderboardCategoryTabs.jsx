import { LEADERBOARD_CATEGORIES } from '../utils/leaderboardMetrics.js'
import { vk } from '../utils/vkUi.js'

/**
 * @param {{
 *   category: string,
 *   onCategoryChange: (id: string) => void,
 *   categoriesMeta?: Record<string, { label?: string, shortLabel?: string }>,
 *   tabIds?: string[],
 * }} props
 */
export default function LeaderboardCategoryTabs({
  category,
  onCategoryChange,
  categoriesMeta = {},
  tabIds,
}) {
  const ids = tabIds ?? LEADERBOARD_CATEGORIES.map((c) => c.id)

  return (
    <div
      className={`rounded-[10px] bg-[#f0f2f5] p-1 ${vk.categoryTabGrid}`}
      role="tablist"
      aria-label="Категории рейтинга"
    >
      {ids.map((id) => {
        const fromCatalog = LEADERBOARD_CATEGORIES.find((c) => c.id === id)
        const meta = categoriesMeta[id]
        const shortLabel = meta?.shortLabel ?? fromCatalog?.shortLabel ?? fromCatalog?.label ?? id
        const selected = category === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onCategoryChange(id)}
            className={`${vk.categoryTabBtn} ${selected ? vk.categoryTabActive : vk.categoryTabIdle}`}
          >
            {shortLabel}
          </button>
        )
      })}
    </div>
  )
}
