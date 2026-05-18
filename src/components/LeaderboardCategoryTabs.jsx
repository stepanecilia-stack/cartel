import { LEADERBOARD_CATEGORIES } from '../utils/leaderboardMetrics.js'

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
  const ids =
    tabIds ??
    LEADERBOARD_CATEGORIES.map((c) => c.id)

  return (
    <div
      className="-mx-0.5 flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white p-1 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-slate-600 dark:bg-slate-900 sm:mx-0 [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Категории рейтинга"
    >
      {ids.map((id) => {
        const fromCatalog = LEADERBOARD_CATEGORIES.find((c) => c.id === id)
        const meta = categoriesMeta[id]
        const fullLabel = meta?.label ?? fromCatalog?.label ?? id
        const shortLabel = meta?.shortLabel ?? fromCatalog?.shortLabel ?? fullLabel
        const selected = category === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onCategoryChange(id)}
            className={`min-h-[2.75rem] shrink-0 snap-start rounded-lg px-2.5 py-2 text-[11px] font-semibold leading-tight transition touch-manipulation sm:min-h-0 sm:px-3 sm:text-sm ${
              selected
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700'
            }`}
          >
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{fullLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
