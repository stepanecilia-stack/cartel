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
    <div className={`${vk.segmentBar} mb-1.5 p-0.5`} role="tablist" aria-label="Уровень для отработки">
      {tabs.map((tab) => {
        const active = viewTier === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onViewTierChange(tab.id)}
            className={`min-w-0 flex-1 touch-manipulation rounded-md px-1 py-1 text-[10px] leading-[1.1] sm:px-1.5 sm:py-1.5 sm:text-[11px] ${
              active ? vk.segmentBtnActive : vk.segmentBtnInactive
            }`}
          >
            <span className="block truncate font-medium">{tab.label}</span>
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
