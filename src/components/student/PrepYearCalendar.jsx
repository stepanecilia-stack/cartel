import { memo, useMemo } from 'react'
import { annualMacroStyle } from '../../data/annualPrepCycle.js'
import { JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'
import { buildPrepCalendarWeeks } from '../../utils/prepCalendarGrid.js'

function cellStyle(day) {
  if (day.isTransitionDay) return JUNIOR_PREP_PHASE_STYLES.transition
  if (day.useMicroPhase && day.phase?.id && JUNIOR_PREP_PHASE_STYLES[day.phase.id]) {
    return JUNIOR_PREP_PHASE_STYLES[day.phase.id]
  }
  return annualMacroStyle(day.phase?.id)
}

/**
 * @param {{
 *   yearDays: Array<{
 *     dateISO: string,
 *     isToday: boolean,
 *     isFightDay: boolean,
 *     isFocusFightDay?: boolean,
 *     inFocusPrep?: boolean,
 *     isTransitionDay?: boolean,
 *     useMicroPhase?: boolean,
 *     phase: { id: string, short: string },
 *     competitions?: Array<{ title: string }>,
 *   }>,
 *   selectedISO: string,
 *   onSelect: (iso: string) => void,
 * }} props
 */
function PrepYearCalendar({ yearDays, selectedISO, onSelect }) {
  const cells = useMemo(
    () =>
      yearDays.map((d) => ({
        dateISO: d.dateISO,
        isToday: d.isToday,
        isFightDay: d.isFightDay,
        isTransitionDay: d.isTransitionDay,
        useMicroPhase: d.inFocusPrep && d.useMicroPhase,
        phase: d.inFocusPrep && d.microPhase ? d.microPhase : { id: d.phase.id, short: d.phase.short },
        competitions: d.competitions,
        isFocusFightDay: d.isFocusFightDay,
      })),
    [yearDays],
  )

  const { weekHeaders, weeks, monthSpans } = useMemo(
    () => buildPrepCalendarWeeks(cells),
    [cells],
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
                  return <div key={ci} className="min-h-[2.1rem] rounded-[6px]" />
                }
                const day = cell.day
                const s = cellStyle(day)
                const isSelected = day.dateISO === selectedISO
                const dayNum = new Date(day.dateISO + 'T12:00:00').getDate()
                const hasEvent = day.isFightDay
                const tag = day.isTransitionDay
                  ? '·'
                  : hasEvent
                    ? '★'
                    : day.phase.short

                return (
                  <button
                    key={day.dateISO}
                    type="button"
                    onClick={() => onSelect(day.dateISO)}
                    title={
                      hasEvent
                        ? day.competitions?.map((c) => c.title || 'Старт').join(', ')
                        : day.dateISO
                    }
                    className={[
                      'relative flex min-h-[2.1rem] flex-col items-center justify-center rounded-[6px] border px-0.5 py-0.5 transition',
                      s.chip,
                      isSelected ? 'ring-2 ring-[#2d81e0] ring-offset-1' : '',
                      day.isToday && !isSelected ? 'border-[#2d81e0]/60' : 'border-transparent',
                      day.isFocusFightDay ? 'font-bold' : '',
                    ].join(' ')}
                  >
                    <span className={`h-0.5 w-full max-w-[1.1rem] rounded-full ${s.bar}`} />
                    <span className="text-[10px] font-semibold tabular-nums leading-none">{dayNum}</span>
                    <span className="text-[7px] font-medium leading-none">{tag}</span>
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

export default memo(PrepYearCalendar)
