import { memo, useEffect, useMemo, useState } from 'react'
import {
  JUNIOR_PREP_PHASE_LEGEND,
  JUNIOR_PREP_PHASE_STYLES,
} from '../../data/juniorPrepTracks.js'
import { vk } from '../../utils/vkUi.js'
import PrepCalendarGrid from './PrepCalendarGrid.jsx'
import PrepMethodologyBlock from './PrepMethodologyBlock.jsx'
import PrepPhaseTasks from './PrepPhaseTasks.jsx'

function phaseStyle(phaseId) {
  return JUNIOR_PREP_PHASE_STYLES[phaseId] ?? JUNIOR_PREP_PHASE_STYLES.none
}

/**
 * @param {{
 *   calendarDays: Array<{
 *     dateISO: string,
 *     dayLabel: string,
 *     isToday: boolean,
 *     isFightDay: boolean,
 *     isTransitionDay?: boolean,
 *     daysUntilOnDay: number,
 *     phase: { id: string, label: string, short: string, rangeLabel?: string, tasks?: Array<{ task: string, via: string }>, metrics?: string },
 *     slots: Array<{ id: string, label: string, items: string[] }>,
 *   }>,
 *   currentPhase: { id: string, label: string, rangeLabel?: string, tasks?: Array<{ task: string, via: string }>, metrics?: string },
 *   daysUntil: number,
 *   ageBandLabel: string,
 *   priorities: string[],
 *   competitionDate?: string,
 * }} props
 */
function StudentPrepTimeline({
  calendarDays,
  currentPhase,
  daysUntil,
  ageBandLabel,
  priorities,
  competitionDate,
}) {
  const defaultISO = calendarDays.find((d) => d.isToday)?.dateISO ?? calendarDays[0]?.dateISO ?? ''
  const [selectedISO, setSelectedISO] = useState(defaultISO)

  useEffect(() => {
    if (!calendarDays.some((d) => d.dateISO === selectedISO)) {
      setSelectedISO(defaultISO)
    }
  }, [calendarDays, defaultISO, selectedISO])

  const selected = useMemo(
    () => calendarDays.find((d) => d.dateISO === selectedISO) ?? calendarDays[0],
    [calendarDays, selectedISO],
  )

  const visibleLegend = useMemo(() => {
    const ids = new Set(calendarDays.map((d) => d.phase.id))
    const hasTransition = calendarDays.some((d) => d.isTransitionDay)
    const legend = JUNIOR_PREP_PHASE_LEGEND.filter((p) => ids.has(p.id))
    if (hasTransition) legend.push({ id: 'transition', label: 'Переход' })
    return legend
  }, [calendarDays])

  if (!calendarDays.length || !selected) return null

  const selStyle = selected.isTransitionDay
    ? phaseStyle('transition')
    : phaseStyle(selected.phase.id)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[#818c99]">
          <span className="font-medium text-[#2c2d2e]">{ageBandLabel}</span>
          <span className="mx-1.5">·</span>
          раунд 2:15
        </p>
        <span className="rounded-lg bg-[#f0f2f5] px-2.5 py-1 text-[12px] font-semibold text-[#2c2d2e]">
          {daysUntil === 0
            ? 'Сегодня бой'
            : `−${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}`}
        </span>
      </div>

      {visibleLegend.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {visibleLegend.map((p) => {
            const s = phaseStyle(p.id)
            return (
              <span key={p.id} className="inline-flex items-center gap-1.5 text-[11px] text-[#818c99]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.legend}`} />
                {p.label}
              </span>
            )
          })}
        </div>
      ) : null}

      <PrepCalendarGrid
        calendarDays={calendarDays}
        selectedISO={selectedISO}
        onSelect={setSelectedISO}
      />

      {competitionDate ? (
        <p className={`text-center ${vk.mutedXs}`}>
          Старт {competitionDate} · в календаре все дни до турнира
        </p>
      ) : null}

      <div className={`rounded-[10px] border px-3 py-2.5 ${selStyle.chip}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[14px] font-semibold text-[#2c2d2e]">
            {selected.dayLabel}
            {selected.isFightDay ? (
              <span className="ml-1.5 text-[12px] font-medium text-rose-700">· старт</span>
            ) : null}
            {selected.isTransitionDay ? (
              <span className="ml-1.5 text-[12px] font-medium text-slate-600">· переход</span>
            ) : null}
          </p>
          <span className="text-[12px] font-medium">
            {selected.isTransitionDay ? 'Переход' : selected.phase.label}
            {!selected.isTransitionDay && selected.phase.rangeLabel ? (
              <span className="text-[#818c99]"> · {selected.phase.rangeLabel}</span>
            ) : null}
          </span>
        </div>
        {!selected.isFightDay && selected.daysUntilOnDay > 0 ? (
          <p className="mt-0.5 text-[11px] text-[#818c99]">−{selected.daysUntilOnDay} дн. до боя</p>
        ) : null}
        {!selected.isTransitionDay && selected.phase.tasks?.length > 0 ? (
          <PrepPhaseTasks tasks={selected.phase.tasks} />
        ) : null}
        {!selected.isTransitionDay && selected.phase.metrics ? (
          <p className="mt-1 text-[11px] font-medium text-[#818c99]">{selected.phase.metrics}</p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {selected.slots.map((slot) => (
          <div
            key={slot.id}
            className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2d81e0]">
              {slot.label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {slot.items.map((item, idx) => (
                <li key={idx} className="text-[12px] leading-snug text-[#2c2d2e]">
                  <span className="text-[#818c99]">· </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {priorities.length > 0 ? (
        <p className={`${vk.mutedXs} border-t border-[#e7e8ec] pt-2`}>{priorities.join(' · ')}</p>
      ) : null}

      <details className="rounded-[10px] border border-[#e7e8ec] bg-white">
        <summary className="cursor-pointer px-2.5 py-2 text-[12px] font-medium text-[#2c2d2e]">
          Методика этапов
        </summary>
        <div className="border-t border-[#e7e8ec] px-1 pb-2 pt-1">
          <PrepMethodologyBlock activePhaseId={currentPhase.id} />
        </div>
      </details>
    </div>
  )
}

export default memo(StudentPrepTimeline)
