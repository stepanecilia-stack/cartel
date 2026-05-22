import { memo, useMemo } from 'react'
import {
  buildMicroCycleSegments,
  MICRO_PREP_DAILY_HORIZON_DAYS,
} from '../../data/juniorPrepTracks.js'
import { formatCompetitionRange, getCompetitionMeta } from '../../utils/plannedCompetitions.js'
import PrepCoachGlance from './PrepCoachGlance.jsx'
import StudentPrepTimeline from './StudentPrepTimeline.jsx'

/**
 * @param {{
 *   mode: 'active' | 'preview' | 'blocked',
 *   blockReason?: string | null,
 *   focusCompetition?: import('../../utils/plannedCompetitions.js').PlannedCompetition | null,
 *   focusPrepPlan?: object | null,
 *   fightDateISO?: string | null,
 *   todayIso?: string,
 *   studentName?: string | null,
 * }} props
 */
function PrepMicroCycleRoadmap({
  mode,
  blockReason = null,
  focusCompetition = null,
  focusPrepPlan = null,
  fightDateISO = null,
  todayIso = '',
  studentName = null,
}) {
  const fightISO = fightDateISO ?? focusCompetition?.dateISO ?? null

  const segments = useMemo(
    () => (fightISO ? buildMicroCycleSegments(fightISO, todayIso) : []),
    [fightISO, todayIso],
  )

  const todayPlan =
    focusPrepPlan?.todayPlan ??
    focusPrepPlan?.calendarDays?.find((d) => d.isToday) ??
    null

  const phaseId =
    todayPlan?.phase?.id ??
    focusPrepPlan?.phase?.id ??
    segments.find((s) => s.isCurrent)?.id ??
    'ofp'
  const phaseLabel = todayPlan?.phase?.label ?? focusPrepPlan?.phase?.label ?? '—'
  const isTransition = Boolean(todayPlan?.isTransitionDay)
  const daysUntil = focusPrepPlan?.daysUntil ?? null

  const competitionLine = useMemo(() => {
    if (!focusCompetition) return null
    const meta = getCompetitionMeta(focusCompetition)
    const range = formatCompetitionRange(focusCompetition)
    return `${meta.short} · ${range}${focusCompetition.title ? ` · ${focusCompetition.title}` : ''}`
  }, [focusCompetition])

  const showDailyDetails =
    mode === 'active' &&
    focusPrepPlan &&
    !focusPrepPlan.unsupported &&
    daysUntil != null &&
    daysUntil >= 0 &&
    daysUntil <= MICRO_PREP_DAILY_HORIZON_DAYS &&
    focusPrepPlan.calendarDays?.length

  const shortBlock =
    blockReason && blockReason.length > 90 ? `${blockReason.slice(0, 87)}…` : blockReason

  return (
    <div className="space-y-1">
      <PrepCoachGlance
        studentName={studentName}
        phaseId={phaseId}
        phaseLabel={phaseLabel}
        daysUntil={daysUntil}
        competitionLine={competitionLine}
        metrics={focusPrepPlan?.phase?.metrics ?? todayPlan?.phase?.metrics ?? null}
        slots={todayPlan?.slots ?? []}
        segments={segments.map((s) => ({
          id: s.id,
          label: s.label,
          short: s.short,
          isCurrent: s.isCurrent,
          status: s.status,
        }))}
        blockReason={mode === 'blocked' ? shortBlock : null}
        isTransition={isTransition}
      />

      {mode === 'preview' && !shortBlock ? (
        <p className="px-1 text-[10px] text-[#818c99]">Подтвердите дату · задача «Лестница» или «Пик»</p>
      ) : null}

      {mode === 'active' && daysUntil != null && daysUntil > MICRO_PREP_DAILY_HORIZON_DAYS ? (
        <p className="px-1 text-[10px] text-[#818c99]">
          Расписание по дням — за {MICRO_PREP_DAILY_HORIZON_DAYS} дн до боя. Сейчас — этап выше.
        </p>
      ) : null}

      {showDailyDetails ? (
        <details className="rounded-[10px] border border-[#e7e8ec] bg-white">
          <summary className="cursor-pointer px-2.5 py-1.5 text-[11px] font-medium text-[#818c99]">
            Другой день · полный текст
          </summary>
          <div className="border-t border-[#e7e8ec] px-2 pb-2 pt-1">
            <StudentPrepTimeline
              calendarDays={focusPrepPlan.calendarDays}
              currentPhase={focusPrepPlan.phase}
              daysUntil={focusPrepPlan.daysUntil}
              ageBandLabel={focusPrepPlan.ageBandLabel}
              priorities={focusPrepPlan.priorities ?? []}
              competitionDate={focusPrepPlan.competitionDate}
              hideMethodology
              hideCalendar
            />
          </div>
        </details>
      ) : null}
    </div>
  )
}

export default memo(PrepMicroCycleRoadmap)
