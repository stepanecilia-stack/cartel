import { memo } from 'react'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   tabs: { id: number, label: string, count: number, total: number, isProgressTier?: boolean }[],
 *   viewTier: number,
 *   onViewTierChange: (tier: number) => void,
 * }} props
 */
function TrainingPracticeTierTabs({ tabs, viewTier, onViewTierChange }) {
  if (tabs.length <= 1) return null

  return (
    <div className={`${vk.segmentBar} mb-2`} role="tablist" aria-label="Уровень для отработки">
      {tabs.map((tab) => {
        const active = viewTier === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onViewTierChange(tab.id)}
            className={`${vk.segmentBtn} min-w-0 flex-1 px-1.5 py-1.5 text-[11px] sm:text-[12px] ${
              active ? vk.segmentBtnActive : vk.segmentBtnInactive
            }`}
          >
            <span className="block truncate">{tab.label}</span>
            <span className="block tabular-nums opacity-80">
              {tab.count}/{tab.total}
              {tab.isProgressTier ? ' · прогр.' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default memo(TrainingPracticeTierTabs)
