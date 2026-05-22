import { memo, useMemo } from 'react'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import { isOrientirStart } from '../../utils/plannedCompetitions.js'
import { buildSeasonMonthWeeks } from '../../utils/prepSeasonCalendar.js'
import { monthYearLabelRu } from '../../utils/prepCalendarGrid.js'

/**
 * @param {{
 *   monthDays: Array<{
 *     dateISO: string,
 *     isToday: boolean,
 *     competitions: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *     primaryCompetition: import('../../utils/plannedCompetitions.js').PlannedCompetition | null,
 *     isFocusDay?: boolean,
 *   }>,
 *   selectedISO: string,
 *   onSelect: (iso: string) => void,
 *   monthLabel?: string,
 * }} props
 */
function PrepSeasonCalendar({ monthDays, selectedISO, onSelect, monthLabel }) {
  const { weekHeaders, weeks } = useMemo(() => buildSeasonMonthWeeks(monthDays), [monthDays])

  const label =
    monthLabel ?? (monthDays[0] ? monthYearLabelRu(monthDays[0].dateISO) : '')

  if (!monthDays.length) {
    return <p className="text-center text-[12px] text-[#818c99]">Нет данных за месяц</p>
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-[#2c2d2e]">{label}</p>
      <div className="grid grid-cols-7 gap-1">
        {weekHeaders.map((h) => (
          <div
            key={h}
            className="py-1 text-center text-[10px] font-semibold uppercase text-[#818c99]"
          >
            {h}
          </div>
        ))}
        {weeks.flatMap((week, wi) =>
          week.map((cell, ci) => {
            if (cell.kind === 'pad') {
              return <div key={`${wi}-${ci}`} className="aspect-square min-h-[2.75rem]" />
            }
            const day = cell.day
            const c = day.primaryCompetition
            const meta = c ? getCompetitionMeta(c) : null
            const hasStart = day.competitions.length > 0
            const isSelected = day.dateISO === selectedISO
            const orientir = c ? isOrientirStart(c) : false
            const dayNum = new Date(day.dateISO + 'T12:00:00').getDate()

            return (
              <button
                key={day.dateISO}
                type="button"
                onClick={() => onSelect(day.dateISO)}
                title={
                  hasStart
                    ? day.competitions
                        .map((x) => {
                          const m = getCompetitionMeta(x)
                          return `${m.short} ${x.title || m.label}${isOrientirStart(x) ? ' (ориентир)' : ''}`
                        })
                        .join('\n')
                    : day.dateISO
                }
                className={[
                  'relative flex aspect-square min-h-[2.75rem] flex-col items-center justify-center rounded-lg border-2 transition',
                  hasStart && meta ? meta.chip : 'border-transparent bg-[#f4f5f7] text-[#818c99]',
                  isSelected ? 'ring-2 ring-[#2d81e0] ring-offset-2 z-10' : '',
                  day.isToday && !isSelected ? 'outline outline-1 outline-[#2d81e0]/50' : '',
                  orientir && hasStart ? 'border-dashed' : 'border-solid',
                  (day.isFocusDay || day.isFocusFightDay) ? 'shadow-md' : '',
                ].join(' ')}
              >
                <span className="text-[12px] font-bold tabular-nums leading-none">{dayNum}</span>
                {hasStart && meta ? (
                  <span className="mt-0.5 max-w-full truncate px-0.5 text-[9px] font-bold uppercase leading-none">
                    {orientir ? '~' : ''}
                    {meta.short || 'ст'}
                  </span>
                ) : null}
                {day.competitions.length > 1 ? (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2d81e0] text-[8px] font-bold text-white">
                    {day.competitions.length}
                  </span>
                ) : null}
              </button>
            )
          }),
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#818c99]">
        <span>
          <span className="font-semibold text-[#2c2d2e]">Заливка</span> — день старта
        </span>
        <span>
          <span className="font-semibold text-[#2c2d2e]">Пунктир</span> — ориентир
        </span>
        <span>
          <span className="font-semibold text-[#2d81e0]">Кольцо</span> — выбранный день
        </span>
      </div>
    </div>
  )
}

export default memo(PrepSeasonCalendar)
