import { memo } from 'react'
import { monthShortRu } from '../../utils/prepCalendarGrid.js'

/**
 * @param {{
 *   eventCounts: number[],
 *   activeMonth: number,
 *   onMonth: (m: number) => void,
 *   countLabel?: (count: number) => string,
 * }} props
 */
function PrepMonthEventStrip({ eventCounts, activeMonth, onMonth, countLabel }) {
  const formatCount =
    countLabel ??
    ((count) => {
      if (count === 0) return '—'
      if (count === 1) return '1 старт'
      if (count < 5) return `${count} старта`
      return `${count} стартов`
    })
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
            <span
              className={`mt-1 text-[10px] font-bold tabular-nums leading-tight ${
                count > 0 ? 'text-[#2d81e0]' : 'text-[#c4c8cc]'
              }`}
            >
              {formatCount(count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default memo(PrepMonthEventStrip)
