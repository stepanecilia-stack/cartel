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
      className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Категории рейтинга"
    >
      <div className={`inline-flex min-w-full gap-0.5 rounded-lg bg-[#f0f2f5] p-0.5 sm:grid sm:w-full ${vk.categoryTabGrid}`}>
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
              className={`${vk.categoryTabBtn} shrink-0 whitespace-nowrap px-3 sm:shrink sm:px-2.5 ${
                selected ? vk.categoryTabActive : vk.categoryTabIdle
              }`}
            >
              {shortLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
