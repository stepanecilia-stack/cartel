import { memo, useMemo } from 'react'
import { athleteStageStyle } from '../../data/athletePrepStages.js'
import { getCompetitionMeta } from '../../utils/plannedCompetitions.js'
import { JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'
import { GlossaryAbbr } from '../GlossaryText.jsx'
import { glossaryTip } from '../../data/boxingGlossary.js'
import { buildPrepCalendarWeeks } from '../../utils/prepCalendarGrid.js'

function cellStyle(day) {
  if (day.primaryCompetition) {
    return getCompetitionMeta(day.primaryCompetition)
  }
  if (day.isTransitionDay) return JUNIOR_PREP_PHASE_STYLES.transition
  if (day.useMicroPhase && day.phase?.id) {
    if (day.isTransitionDay && JUNIOR_PREP_PHASE_STYLES.transition) {
      return JUNIOR_PREP_PHASE_STYLES.transition
    }
    if (JUNIOR_PREP_PHASE_STYLES[day.phase.id]) {
      return JUNIOR_PREP_PHASE_STYLES[day.phase.id]
    }
  }
  return athleteStageStyle(day.athleteStageId ?? day.phase?.id)
}

/**
 * @param {{
 *   monthDays: Array<object>,
 *   selectedISO: string,
 *   onSelect: (iso: string) => void,
 *   monthLabel: string,
 * }} props
 */
function PrepMonthCalendar({ monthDays, selectedISO, onSelect, monthLabel }) {
  const cells = useMemo(
    () =>
      monthDays.map((d) => ({
        dateISO: d.dateISO,
        isToday: d.isToday,
        isTournamentDay: d.isTournamentDay,
        isTransitionDay: d.isTransitionDay,
        useMicroPhase: Boolean(d.useMicroPhase ?? (d.inFocusPrep && d.microPhase)),
        athleteStageId: d.athleteStageId,
        primaryCompetition: d.primaryCompetition,
        phase:
          d.inFocusPrep && d.microPhase
            ? d.microPhase
            : {
                id: d.annualPeriod?.id ?? d.athleteStageId ?? 'open',
                short: d.annualPeriod?.short ?? '—',
              },
      })),
    [monthDays],
  )

  const { weekHeaders, weeks } = useMemo(() => {
    if (!cells.length) return { weekHeaders: [], weeks: [] }
    return buildPrepCalendarWeeks(cells)
  }, [cells])

  if (!cells.length) {
    return <p className="text-center text-[12px] text-[#818c99]">Нет данных за {monthLabel}</p>
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-[#818c99]">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {weekHeaders.map((h) => (
          <div key={h} className="py-0.5 text-center text-[8px] font-semibold uppercase text-[#818c99]">
            {h}
          </div>
        ))}
        {weeks.flatMap((week, wi) =>
          week.map((cell, ci) => {
            if (cell.kind === 'pad') {
              return <div key={`${wi}-${ci}`} className="aspect-square min-h-0" />
            }
            const day = cell.day
            const s = cellStyle(day)
            const isSelected = day.dateISO === selectedISO
            const dayNum = new Date(day.dateISO + 'T12:00:00').getDate()
            const tourTag = day.primaryCompetition ? getCompetitionMeta(day.primaryCompetition).short : null
            const tag = day.isTransitionDay ? '·' : tourTag
            const tip = !tag && day.phase.short ? glossaryTip(day.phase.short) : null

            return (
              <button
                key={day.dateISO}
                type="button"
                onClick={() => onSelect(day.dateISO)}
                title={
                  day.primaryCompetition
                    ? `${getCompetitionMeta(day.primaryCompetition).label}: ${day.primaryCompetition.title || ''}`
                    : tip
                      ? `${day.phase.short}: ${tip}`
                      : day.dateISO
                }
                className={[
                  'relative flex aspect-square flex-col items-center justify-center rounded-[5px] border text-center transition',
                  s.chip,
                  isSelected ? 'z-10 ring-2 ring-[#2d81e0] ring-offset-1' : '',
                  day.isToday && !isSelected ? 'border-[#2d81e0]/50' : 'border-transparent',
                ].join(' ')}
              >
                <span className="text-[11px] font-semibold leading-none tabular-nums">{dayNum}</span>
                {tag ? (
                  <span className="text-[7px] font-bold uppercase leading-none">{tag}</span>
                ) : tip ? (
                  <span className="max-w-full truncate text-[6px] leading-none">
                    <GlossaryAbbr>{day.phase.short}</GlossaryAbbr>
                  </span>
                ) : null}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

export default memo(PrepMonthCalendar)
