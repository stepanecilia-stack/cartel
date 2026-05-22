import { memo } from 'react'
import { athleteStageStyle } from '../../data/athletePrepStages.js'

/**
 * @param {{
 *   summaries: Array<{ month: number, short: string, periodId: string, events: number }>,
 *   activeMonth: number,
 *   onMonth: (m: number) => void,
 * }} props
 */
function PrepMonthStrip({ summaries, activeMonth, onMonth }) {
  return (
    <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
      {summaries.map((m) => {
        const s = athleteStageStyle(m.periodId)
        const active = m.month === activeMonth
        return (
          <button
            key={m.month}
            type="button"
            onClick={() => onMonth(m.month)}
            className={[
              'flex flex-col items-center rounded-md border px-0.5 py-1 transition',
              active ? 'border-[#2d81e0] bg-[#ecf3fc] ring-1 ring-[#2d81e0]' : 'border-transparent bg-[#f7f8fa]',
            ].join(' ')}
          >
            <span className="text-[9px] font-semibold uppercase text-[#818c99]">{m.short}</span>
            <span className={`mt-0.5 h-1.5 w-full rounded-sm ${s.bar}`} />
            {m.events > 0 ? (
              <span className="mt-0.5 text-[8px] font-bold text-rose-600">★{m.events}</span>
            ) : (
              <span className="mt-0.5 h-2" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default memo(PrepMonthStrip)
