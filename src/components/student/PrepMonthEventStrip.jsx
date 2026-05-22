import { memo } from 'react'
import { monthShortRu } from '../../utils/prepCalendarGrid.js'

/**
 * @param {{
 *   eventCounts: number[],
 *   activeMonth: number,
 *   onMonth: (m: number) => void,
 * }} props
 */
function PrepMonthEventStrip({ eventCounts, activeMonth, onMonth }) {
  return (
    <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
      {eventCounts.map((count, month) => {
        const active = month === activeMonth
        return (
          <button
            key={month}
            type="button"
            onClick={() => onMonth(month)}
            className={[
              'flex flex-col items-center rounded-lg border px-1 py-1.5 transition',
              active
                ? 'border-[#2d81e0] bg-[#ecf3fc] shadow-sm'
                : 'border-[#e7e8ec] bg-white hover:bg-[#f7f8fa]',
            ].join(' ')}
          >
            <span className="text-[10px] font-semibold uppercase text-[#818c99]">
              {monthShortRu(month)}
            </span>
            {count > 0 ? (
              <span className="mt-1 text-[11px] font-bold tabular-nums text-rose-600">
                {count} старт{count === 1 ? '' : count < 5 ? 'а' : 'ов'}
              </span>
            ) : (
              <span className="mt-1 text-[10px] text-[#c4c8cc]">—</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default memo(PrepMonthEventStrip)
