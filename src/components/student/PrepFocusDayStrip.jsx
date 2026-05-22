import { memo } from 'react'
import { JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'

/**
 * Компактная лента дней микроцикла к выбранному старту.
 */
function PrepFocusDayStrip({ calendarDays, selectedISO, onSelect }) {
  if (!calendarDays?.length) return null

  return (
    <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2 py-1.5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#818c99]">
        К старту
      </p>
      <div className="flex gap-1 overflow-x-auto pb-0.5 scroll-smooth">
        {calendarDays.map((day) => {
          const s = JUNIOR_PREP_PHASE_STYLES[day.phase?.id] ?? JUNIOR_PREP_PHASE_STYLES.none
          const isSelected = day.dateISO === selectedISO
          const num = new Date(day.dateISO + 'T12:00:00').getDate()
          return (
            <button
              key={day.dateISO}
              type="button"
              onClick={() => onSelect(day.dateISO)}
              className={[
                'flex min-w-[2.25rem] shrink-0 flex-col items-center rounded-md border px-1 py-0.5',
                s.chip,
                isSelected ? 'ring-2 ring-[#2d81e0]' : '',
                day.isToday ? 'border-[#2d81e0]/60' : '',
              ].join(' ')}
            >
              <span className="text-[11px] font-semibold tabular-nums">{num}</span>
              <span className="text-[7px]">{day.isFightDay ? 'бой' : day.phase?.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(PrepFocusDayStrip)
