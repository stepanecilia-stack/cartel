import { useMemo } from 'react'
import { annualMacroStyle, resolveAnnualMacroPeriodForDate } from '../../data/annualPrepCycle.js'
import { COACH_EVENT_KIND_STYLES, getCalendarItemStyle } from '../../data/coachEventKinds.js'
import { getExternalCampStyle } from '../../data/externalCampKinds.js'
import { getSeasonPlanStyle } from '../../data/seasonPlanKinds.js'
import { orientirDisplayTitle } from '../../utils/orientirDisplay.js'
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
 *     isStudentTrainingDay?: boolean,
 *   }>,
 *   selectedISO: string,
 *   onSelect: (iso: string) => void,
 *   onDayHover?: (iso: string) => void,
 *   onDayHoverEnd?: () => void,
 *   monthLabel?: string,
 *   focusId?: string | null,
 *   visualMode?: 'default' | 'minimal',
 *   emphasizeCoachDays?: boolean,
 *   showMacroPeriod?: boolean,
 *   trainingScheduleOnly?: boolean,
 *   emptyCalendarMode?: boolean,
 * }} props
 */
function PrepSeasonCalendar({
  monthDays,
  selectedISO,
  onSelect,
  onDayHover,
  onDayHoverEnd,
  monthLabel,
  focusId = null,
  visualMode = 'default',
  emphasizeCoachDays = false,
  showMacroPeriod = true,
  trainingScheduleOnly = false,
  emptyCalendarMode = false,
}) {
  const minimal = visualMode === 'minimal'
  const { weekHeaders, weeks } = useMemo(() => buildSeasonMonthWeeks(monthDays), [monthDays])

  const resolveChipStyle = (item) =>
    getExternalCampStyle(item) ?? getSeasonPlanStyle(item) ?? getCalendarItemStyle(item)

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
            const isFocusPeriodDay = Boolean(
              focusId && (day.isFocusDay || day.isFocusFightDay),
            )
            const coachEvent = chips.find((c) => !isOrientirStart(c) && !c.planKind)
            const planBlock = chips.find((c) => c.planKind === 'block')
            const externalCamp = chips.find((c) => c.planKind === 'external_camp')
            const planCheckpoint = chips.find((c) => c.planKind === 'checkpoint')
            const primaryChip =
              coachEvent ?? externalCamp ?? planBlock ?? planCheckpoint ?? chips[0] ?? null
            const primaryStyle = primaryChip ? resolveChipStyle(primaryChip) : null
            const macro = showMacroPeriod ? resolveAnnualMacroPeriodForDate(day.dateISO) : null
            const macroStyle = macro ? annualMacroStyle(macro.id) : null
            const isTrainingDay = Boolean(day.isStudentTrainingDay)
            const coachDayStyle =
              emphasizeCoachDays && hasCoachEvent && coachEvent && !isFocusPeriodDay
                ? getCalendarItemStyle(coachEvent)
                : null

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
                  isTrainingDay
                    ? `${day.dateISO} · тренировка по графику ученика`
                    : hasEvents
                      ? chips
                          .map((x) => {
                            if (isOrientirStart(x)) return `${orientirDisplayTitle(x)} (ориентир Минспорта)`
                            const s = resolveChipStyle(x)
                            return `${s.label}: ${x.title || s.label}`
                          })
                          .join('\n')
                      : day.dateISO
                }
                className={[
                  'relative flex touch-manipulation flex-col items-center justify-center rounded-lg border-2 p-0.5 transition select-none',
                  cellMinH,
                  isFocusPeriodDay
                      ? 'border-[#2d81e0] bg-sky-50 text-[#2c2d2e] shadow-sm z-[1]'
                      : isTrainingDay
                        ? trainingScheduleOnly
                          ? 'border-[#2d81e0] bg-[#2d81e0] text-white shadow-md'
                          : 'border-[#2d81e0] bg-[#ecf3fc] text-[#2d81e0] shadow-sm'
                        : coachDayStyle
                          ? `${coachDayStyle.chip} border-solid shadow-sm`
                          : hasEvents
                            ? 'border-[#e7e8ec] bg-white text-[#2c2d2e]'
                          : macroStyle && !trainingScheduleOnly
                            ? `${macroStyle.chip} border-transparent opacity-90`
                            : 'border-transparent bg-[#f4f5f7] text-[#818c99]',
                  isSelected ? 'ring-2 ring-[#2d81e0] ring-offset-1 z-10' : '',
                  isFocusPeriodDay && !isSelected ? 'ring-2 ring-[#2d81e0]/70 ring-offset-1' : '',
                  day.isToday && !isSelected && !isFocusPeriodDay
                    ? 'outline outline-1 outline-[#2d81e0]/50'
                    : '',
                ].join(' ')}
              >
                <span className="text-[12px] font-bold tabular-nums leading-none">{dayNum}</span>
                {minimal && (hasEvents || isTrainingDay) ? (
                  <span className="mt-0.5 flex gap-0.5" aria-hidden>
                    {isTrainingDay ? (
                      <span
                        className={`block h-1.5 w-1.5 rounded-full ${
                          trainingScheduleOnly ? 'bg-white' : 'bg-[#2d81e0]'
                        }`}
                      />
                    ) : null}
                    {coachEvent ? (
                      <span
                        className={[
                          'block h-1.5 w-1.5 rounded-full',
                          getCalendarItemStyle(coachEvent).bar,
                        ].join(' ')}
                      />
                    ) : null}
                    {externalCamp ? (
                      <span
                        className={[
                          'block h-1 w-3 rounded-full',
                          getExternalCampStyle(externalCamp)?.bar ?? 'bg-violet-500',
                        ].join(' ')}
                      />
                    ) : null}
                    {planBlock ? (
                      <span
                        className={[
                          'block h-1.5 w-1.5 rounded-full',
                          getSeasonPlanStyle(planBlock)?.bar ?? 'bg-emerald-500',
                        ].join(' ')}
                      />
                    ) : null}
                    {planCheckpoint ? (
                      <span
                        className={[
                          'block h-1 w-1 rotate-45 rounded-sm',
                          getSeasonPlanStyle(planCheckpoint)?.bar ?? 'bg-rose-500',
                        ].join(' ')}
                      />
                    ) : null}
                    {!coachEvent && !planBlock && !planCheckpoint && primaryStyle ? (
                      <span className={['block h-1.5 w-1.5 rounded-full', primaryStyle.bar].join(' ')} />
                    ) : null}
                  </span>
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
      {minimal ? (
        <p className="mt-2 text-[10px] text-[#818c99]">
          {emptyCalendarMode
            ? 'Нажмите на день, чтобы добавить событие. Точка — ваш старт или тренировка.'
            : trainingScheduleOnly
              ? 'Синяя заливка — тренировка по графику ученика'
              : 'Синяя заливка — тренировка по графику ученика · точка — старт · зелёная — подготовка клуба · фиолетовая — сборы · ромб — контрольная точка'}
        </p>
      ) : null}
    </div>
  )
}

export default PrepSeasonCalendar
