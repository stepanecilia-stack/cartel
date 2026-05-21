import { memo, useMemo } from 'react'
import { JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'
import { buildPrepCalendarWeeks } from '../../utils/prepCalendarGrid.js'

function cellStyle(day) {
  if (day.isTransitionDay) return JUNIOR_PREP_PHASE_STYLES.transition
  return JUNIOR_PREP_PHASE_STYLES[day.phase.id] ?? JUNIOR_PREP_PHASE_STYLES.none
}

/**
 * @param {{
 *   calendarDays: Array<{
 *     dateISO: string,
 *     isToday: boolean,
 *     isFightDay: boolean,
 *     isTransitionDay?: boolean,
 *     phase: { id: string, short: string },
 *   }>,
 *   selectedISO: string,
 *   onSelect: (iso: string) => void,
 * }} props
 */
function PrepCalendarGrid({ calendarDays, selectedISO, onSelect }) {
  const { weekHeaders, weeks, monthSpans } = useMemo(
    () => buildPrepCalendarWeeks(calendarDays),
    [calendarDays],
  )

  const monthByWeek = useMemo(
    () => Object.fromEntries(monthSpans.map((m) => [m.weekIndex, m.label])),
    [monthSpans],
  )

  if (!weeks.length) return null

  return (
    <div className="rounded-[10px] border border-[#e7e8ec] bg-white p-2">
      <div className="mb-1.5 grid grid-cols-7 gap-0.5">
        {weekHeaders.map((h) => (
          <div
            key={h}
            className="py-0.5 text-center text-[9px] font-semibold uppercase text-[#818c99]"
          >
            {h}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi}>
            {monthByWeek[wi] ? (
              <p className="mb-0.5 text-[10px] font-semibold text-[#818c99]">{monthByWeek[wi]}</p>
            ) : null}
            <div className="grid grid-cols-7 gap-0.5">
              {week.map((cell, ci) => {
                if (cell.kind === 'pad') {
                  return <div key={ci} className="min-h-[2.35rem] rounded-[6px] bg-transparent" />
                }

                const day = cell.day
                const s = cellStyle(day)
                const isSelected = day.dateISO === selectedISO
                const dayNum = new Date(day.dateISO + 'T12:00:00').getDate()
                const tag = day.isFightDay ? 'бой' : day.isTransitionDay ? '·' : day.phase.short

                return (
                  <button
                    key={day.dateISO}
                    type="button"
                    onClick={() => onSelect(day.dateISO)}
                    title={day.dateISO}
                    className={[
                      'flex min-h-[2.35rem] flex-col items-center justify-center rounded-[6px] border px-0.5 py-0.5 text-center transition',
                      s.chip,
                      isSelected ? 'ring-2 ring-[#2d81e0] ring-offset-1' : '',
                      day.isToday && !isSelected ? 'border-[#2d81e0]/60' : 'border-transparent',
                    ].join(' ')}
                  >
                    <span className={`h-0.5 w-full max-w-[1.25rem] rounded-full ${s.bar}`} />
                    <span className="text-[11px] font-semibold leading-none tabular-nums text-[#2c2d2e]">
                      {dayNum}
                    </span>
                    <span className="mt-0.5 max-w-full truncate text-[8px] font-medium leading-none">
                      {tag}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(PrepCalendarGrid)
