import { useMemo } from 'react'
import {
  CALENDAR_RANGE_PICK_STYLE,
  COACH_EVENT_KIND_STYLES,
  getCalendarItemStyle,
} from '../../data/coachEventKinds.js'
import { ORIENTIR_COHORT_STYLES } from '../../data/orientirCohortColors.js'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import { orientirDayChipLabel, orientirDisplayTitle } from '../../utils/orientirDisplay.js'
import { isOrientirStart } from '../../utils/plannedCompetitions.js'
import { buildSeasonMonthWeeks, isIsoInInclusiveRange } from '../../utils/prepSeasonCalendar.js'
import { monthYearLabelRu } from '../../utils/prepCalendarGrid.js'

const MAX_DAY_CHIPS = 4

/**
 * @param {import('../../utils/plannedCompetitions.js').PlannedCompetition} c
 */
function dayChipLabel(c) {
  const style = getCalendarItemStyle(c)
  if (isOrientirStart(c)) {
    const meta = getCompetitionMeta(c)
    return orientirDayChipLabel(c, meta.short)
  }
  if (c.title?.trim()) {
    const t = c.title.trim()
    return t.length > 9 ? `${t.slice(0, 8)}…` : t
  }
  return style.short
}

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
 *   showOrientirLegend?: boolean,
 *   focusId?: string | null,
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
  showOrientirLegend = false,
  focusId = null,
}) {
  const { weekHeaders, weeks } = useMemo(() => buildSeasonMonthWeeks(monthDays), [monthDays])

  const label =
    monthLabel ?? (monthDays[0] ? monthYearLabelRu(monthDays[0].dateISO) : '')

  const cohortIdsInMonth = useMemo(() => {
    const ids = new Set()
    for (const day of monthDays) {
      for (const c of day.competitions) {
        if (isOrientirStart(c) && c.orientirCohortId) ids.add(c.orientirCohortId)
      }
    }
    return [...ids].sort()
  }, [monthDays])

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
              return <div key={`${wi}-${ci}`} className="min-h-[4.25rem]" />
            }
            const day = cell.day
            const chips = day.competitions
            const hasEvents = chips.length > 0
            const isSelected = day.dateISO === selectedISO
            const dayNum = new Date(day.dateISO + 'T12:00:00').getDate()
            const inDraftRange =
              rangeDraft &&
              isIsoInInclusiveRange(day.dateISO, rangeDraft.startISO, rangeDraft.endISO)
            const visible = chips.slice(0, MAX_DAY_CHIPS)
            const hiddenCount = chips.length - visible.length
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
                  'relative flex min-h-[4.25rem] touch-manipulation flex-col rounded-lg border-2 p-0.5 transition select-none',
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
                <span className="shrink-0 text-center text-[11px] font-bold tabular-nums leading-none">
                  {dayNum}
                </span>
                {hasEvents ? (
                  <div className="mt-0.5 flex w-full flex-1 flex-col gap-px overflow-hidden">
                    {visible.map((c) => {
                      const style = getCalendarItemStyle(c)
                      const orientir = isOrientirStart(c)
                      const chipText = dayChipLabel(c)
                      const isActiveChip = focusId === c.id
                      const dimChip = isFocusPeriodDay && focusId && !isActiveChip
                      return (
                        <div
                          key={c.id}
                          className={[
                            'flex min-h-[11px] items-center gap-0.5 rounded border px-0.5',
                            style.chip,
                            orientir ? 'border-dashed' : 'border-solid',
                            isActiveChip ? 'ring-1 ring-[#2d81e0] shadow-sm' : '',
                            dimChip ? 'opacity-35' : '',
                          ].join(' ')}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.bar}`} />
                          <span className="min-w-0 flex-1 truncate text-[6px] font-bold leading-tight">
                            {chipText}
                          </span>
                        </div>
                      )
                    })}
                    {hiddenCount > 0 ? (
                      <span className="text-center text-[6px] font-semibold text-[#818c99]">
                        +{hiddenCount}
                      </span>
                    ) : null}
                  </div>
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
        <span>
          <span className="font-semibold text-sky-600">Голубой пунктир</span> — выбор периода
        </span>
        {pickingEnd ? (
          <span className="font-semibold text-[#2d81e0]">Выберите конец периода</span>
        ) : null}
      </div>
      {showOrientirLegend && cohortIdsInMonth.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 border-t border-[#e7e8ec] pt-2 text-[9px] text-[#818c99]">
          <span className="w-full font-semibold text-slate-600">Ориентиры Минспорта (цвет = группа):</span>
          {cohortIdsInMonth.map((id) => {
            const s = ORIENTIR_COHORT_STYLES[id]
            if (!s) return null
            return (
              <span key={id} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm border border-dashed border-slate-300 ${s.bar}`} />
                {s.short}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="mt-1 text-[9px] text-[#818c99]">
          Накладки: в дне — несколько цветных полос с подписью возраста и уровня (ПМО, ЧМО…).
        </p>
      )}
    </div>
  )
}

export default PrepSeasonCalendar
