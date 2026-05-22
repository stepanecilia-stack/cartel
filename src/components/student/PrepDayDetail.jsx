import { memo } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getCompetitionMeta } from '../../utils/plannedCompetitions.js'
import { JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'
import { athleteStageStyle } from '../../data/athletePrepStages.js'
import { getMacroGlance, getMicroGlance } from '../../data/coachGlance.js'
import { GlossaryAbbr } from '../GlossaryText.jsx'
import PrepCoachGlance from './PrepCoachGlance.jsx'

function headerStyle(day) {
  if (day.isTransitionDay) return JUNIOR_PREP_PHASE_STYLES.transition
  if (day.inFocusPrep && day.microPhase?.id && JUNIOR_PREP_PHASE_STYLES[day.microPhase.id]) {
    return JUNIOR_PREP_PHASE_STYLES[day.microPhase.id]
  }
  return athleteStageStyle(day.athleteStageId ?? day.annualPeriod?.id)
}

const WEEKDAY_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/**
 * @param {{
 *   day: object,
 *   focusLabel?: string | null,
 *   daysUntilFocus?: number | null,
 *   hideCoachMission?: boolean,
 *   phaseMetrics?: string | null,
 * }} props
 */
function PrepDayDetail({ day, focusLabel = null, daysUntilFocus = null, phaseMetrics = null }) {
  if (!day) return null

  const style = headerStyle(day)
  const inMicro = Boolean(day.inFocusPrep && day.slots?.length)
  const phase = inMicro && day.microPhase ? day.microPhase : day.annualPeriod
  const d = new Date(day.dateISO + 'T12:00:00')
  const wd = WEEKDAY_RU[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')

  const phaseTitle = day.isTransitionDay ? 'Переход' : phase?.label ?? '—'
  const phaseId = day.isTransitionDay ? 'transition' : inMicro ? day.microPhase?.id : day.athleteStageId
  const glance = inMicro
    ? getMicroGlance(phaseId, day.isTransitionDay)
    : getMacroGlance(day.athleteStageId ?? phase?.id)

  const daysUntil = inMicro ? day.daysUntilOnDay : daysUntilFocus

  return (
    <div className={`rounded-[10px] border px-2 py-1.5 ${style.chip}`}>
      <p className="text-[12px] font-semibold tabular-nums text-[#2c2d2e]">
        {dd}.{mm} <span className="text-[#818c99]">{wd}</span>
        {daysUntil != null && daysUntil > 0 ? (
          <span className="font-normal text-[#818c99]"> · −{daysUntil}</span>
        ) : null}
      </p>

      {day.isTournamentDay && day.competitions?.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {day.competitions.map((c) => {
            const meta = getCompetitionMeta(c)
            return (
              <li key={c.id} className={`rounded border px-1.5 py-0.5 text-[11px] ${meta.chip}`}>
                <span className="font-bold">{meta.short}</span> · {formatCompetitionRange(c)}
              </li>
            )
          })}
        </ul>
      ) : null}

      {inMicro ? (
        <div className="mt-1">
          <PrepCoachGlance
            phaseId={phaseId ?? 'ofp'}
            phaseLabel={phaseTitle}
            daysUntil={daysUntil}
            glance={glance}
            metrics={phaseMetrics ?? day.microPhase?.metrics ?? null}
            slots={day.slots}
            isTransition={day.isTransitionDay}
          />
          {focusLabel ? (
            <p className="mt-1 truncate text-[10px] text-[#818c99]">→ {focusLabel}</p>
          ) : null}
          <details className="mt-1">
            <summary className="cursor-pointer text-[10px] text-[#818c99]">Пункты по слотам</summary>
            <div className="mt-1 space-y-1 text-[11px] text-[#2c2d2e]">
              {day.slots.map((slot) => (
                <div key={slot.id}>
                  <span className="font-semibold text-[#2d81e0]">{slot.label}:</span>
                  <ul className="list-inside list-disc">
                    {slot.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="mt-1 rounded-md bg-white/60 px-2 py-1">
          <p className="text-[13px] font-bold text-[#2c2d2e]">
            <GlossaryAbbr>{phaseTitle}</GlossaryAbbr>
          </p>
          <p className="text-[12px] text-[#2c2d2e]">
            <span className="text-[#818c99]">Сегодня:</span> {glance.doing}
          </p>
          <p className="text-[12px] text-[#2c2d2e]">
            <span className="text-[#818c99]">К:</span> {glance.leading}
          </p>
        </div>
      )}
    </div>
  )
}

export default memo(PrepDayDetail)
