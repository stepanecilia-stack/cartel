import { useMemo } from 'react'
import {
  CALENDAR_RANGE_PICK_STYLE,
  COACH_EVENT_KIND_STYLES,
  getCalendarItemStyle,
} from '../../data/coachEventKinds.js'
import { orientirDisplayTitle } from '../../utils/orientirDisplay.js'
import { isOrientirStart } from '../../utils/plannedCompetitions.js'
import { buildSeasonMonthWeeks, isIsoInInclusiveRange } from '../../utils/prepSeasonCalendar.js'
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
 *   onDayHover?: (iso: string) => void,
 *   onDayHoverEnd?: () => void,
 *   monthLabel?: string,
 *   rangeDraft?: { startISO: string, endISO: string } | null,
 *   pickingEnd?: boolean,
 *   focusId?: string | null,
 *   visualMode?: 'default' | 'minimal',
 * }} props
 */
function PrepSeasonCalendar({
  monthDays,
  selectedISO,
  onSelect,
  onDayHover,
  onDayHoverEnd,
  monthLabel,
  rangeDraft = null,
  pickingEnd = false,
  focusId = null,
  visualMode = 'default',
}) {
  const minimal = visualMode === 'minimal'
  const { weekHeaders, weeks } = useMemo(() => buildSeasonMonthWeeks(monthDays), [monthDays])

  const label =
    monthLabel ?? (monthDays[0] ? monthYearLabelRu(monthDays[0].dateISO) : '')

  if (!monthDays.length) {
    return <p className="text-center text-[12px] text-[#818c99]">Нет данных за месяц</p>
  }

  const cellMinH = minimal ? 'min-h-[2.75rem]' : 'min-h-[4.25rem]'

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
              return <div key={`${wi}-${ci}`} className={cellMinH} />
            }
            const day = cell.day
            const chips = day.competitions
            const hasEvents = chips.length > 0
            const hasCoachEvent = chips.some((c) => !isOrientirStart(c))
            const isSelected = day.dateISO === selectedISO
            const dayNum = new Date(day.dateISO + 'T12:00:00').getDate()
            const inDraftRange =
              rangeDraft &&
              isIsoInInclusiveRange(day.dateISO, rangeDraft.startISO, rangeDraft.endISO)
            const isFocusPeriodDay = Boolean(
              focusId && (day.isFocusDay || day.isFocusFightDay),
            )

            return (
              <button
                key={day.dateISO}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelect(day.dateISO)
                }}
                onMouseEnter={() => onDayHover?.(day.dateISO)}
                onMouseLeave={() => onDayHoverEnd?.()}
                title={
                  hasEvents
                    ? chips
                        .map((x) => {
                          if (isOrientirStart(x)) return `${orientirDisplayTitle(x)} (ориентир Минспорта)`
                          const s = getCalendarItemStyle(x)
                          return `${s.label}: ${x.title || s.label}`
                        })
                        .join('\n')
                    : day.dateISO
                }
                className={[
                  'relative flex touch-manipulation flex-col items-center justify-center rounded-lg border-2 p-0.5 transition select-none',
                  cellMinH,
                  inDraftRange
                    ? CALENDAR_RANGE_PICK_STYLE.chip
                    : isFocusPeriodDay
                      ? 'border-[#2d81e0] bg-sky-50 text-[#2c2d2e] shadow-sm z-[1]'
                      : hasEvents
                        ? 'border-[#e7e8ec] bg-white text-[#2c2d2e]'
                        : 'border-transparent bg-[#f4f5f7] text-[#818c99]',
                  isSelected ? 'ring-2 ring-[#2d81e0] ring-offset-1 z-10' : '',
                  isFocusPeriodDay && !isSelected ? 'ring-2 ring-[#2d81e0]/70 ring-offset-1' : '',
                  day.isToday && !isSelected && !isFocusPeriodDay
                    ? 'outline outline-1 outline-[#2d81e0]/50'
                    : '',
                ].join(' ')}
              >
                <span className="text-[12px] font-bold tabular-nums leading-none">{dayNum}</span>
                {minimal && hasEvents ? (
                  <span
                    className={[
                      'mt-0.5 block h-1 w-1 rounded-full',
                      hasCoachEvent ? 'bg-teal-500' : 'bg-slate-300',
                    ].join(' ')}
                    aria-hidden
                  />
                ) : null}
                {!minimal && hasEvents && chips.length > 1 ? (
                  <span className="absolute right-0.5 top-0.5 text-[8px] font-semibold text-slate-400">
                    {chips.length}
                  </span>
                ) : null}
              </button>
            )
          }),
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#818c99]">
        <span className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-sm ${COACH_EVENT_KIND_STYLES.practice.bar}`} />
          Боевая практика
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-sm ${COACH_EVENT_KIND_STYLES.competition.bar}`} />
          Соревнования
        </span>
        {minimal ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            Ориентир Минспорта
          </span>
        ) : null}
        <span>
          <span className="font-semibold text-sky-600">Голубой пунктир</span> — выбор периода
        </span>
        {pickingEnd ? (
          <span className="font-semibold text-[#2d81e0]">Выберите конец периода</span>
        ) : null}
        {minimal ? (
          <span>Клик по старту внизу — подсветка дат</span>
        ) : null}
      </div>
    </div>
  )
}

export default PrepSeasonCalendar
