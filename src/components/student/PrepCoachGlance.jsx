import { memo } from 'react'
import { JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'
import { getMicroGlance, summarizeDaySlots } from '../../data/coachGlance.js'
import { GlossaryAbbr } from '../GlossaryText.jsx'

function phaseStyle(phaseId) {
  return JUNIOR_PREP_PHASE_STYLES[phaseId] ?? JUNIOR_PREP_PHASE_STYLES.none
}

/**
 * @param {{
 *   phaseId: string,
 *   phaseLabel: string,
 *   daysUntil?: number | null,
 *   competitionLine?: string | null,
 *   glance?: import('../../data/coachGlance.js').CoachGlanceLine | null,
 *   metrics?: string | null,
 *   slots?: Array<{ id: string, label: string, items: string[] }>,
 *   segments?: Array<{ id: string, label: string, short?: string, isCurrent?: boolean, status?: string }>,
 *   blockReason?: string | null,
 *   isTransition?: boolean,
 *   studentName?: string | null,
 * }} props
 */
function PrepCoachGlance({
  phaseId,
  phaseLabel,
  daysUntil = null,
  competitionLine = null,
  glance = null,
  metrics = null,
  slots = [],
  segments = [],
  blockReason = null,
  isTransition = false,
  studentName = null,
}) {
  const g = glance ?? getMicroGlance(phaseId, isTransition)
  const daySlots = summarizeDaySlots(slots)
  const style = phaseStyle(isTransition ? 'transition' : phaseId)

  return (
    <div className={`rounded-[10px] border-2 border-[#2d81e0]/35 px-2.5 py-2 ${style.chip}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-[#2c2d2e]">
          {studentName ? `${studentName} · ` : ''}
          <span className="text-[#2d81e0]">План</span>
        </p>
        {daysUntil != null && daysUntil >= 0 ? (
          <span className="rounded-md bg-[#2d81e0] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
            {daysUntil === 0 ? 'Бой' : `−${daysUntil} дн`}
          </span>
        ) : null}
      </div>

      {competitionLine ? (
        <p className="mt-0.5 truncate text-[11px] font-medium text-[#2c2d2e]">{competitionLine}</p>
      ) : null}

      {blockReason ? (
        <p className="mt-1.5 text-[11px] font-medium text-amber-950">{blockReason}</p>
      ) : null}

      {segments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-0.5">
          {segments.map((seg) => {
            const s = phaseStyle(seg.id)
            const on = seg.isCurrent
            return (
              <span
                key={seg.id}
                title={seg.label}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  on ? `${s.chip} ring-1 ring-[#2d81e0]/50` : 'bg-white/50 text-[#818c99] opacity-70'
                }`}
              >
                <GlossaryAbbr>{seg.short ?? seg.label}</GlossaryAbbr>
              </span>
            )
          })}
        </div>
      ) : null}

      {!blockReason ? (
        <div className="mt-2 space-y-1 rounded-md bg-white/70 px-2 py-1.5">
          <p className="text-[15px] font-bold leading-tight text-[#2c2d2e]">
            <GlossaryAbbr>{phaseLabel}</GlossaryAbbr>
            {isTransition ? <span className="text-[12px] font-medium text-[#818c99]"> · переход</span> : null}
          </p>
          <p className="text-[12px] leading-snug text-[#2c2d2e]">
            <span className="font-semibold text-[#818c99]">Сегодня:</span> {g.doing}
          </p>
          <p className="text-[12px] leading-snug text-[#2c2d2e]">
            <span className="font-semibold text-[#818c99]">К:</span> {g.leading}
            {g.check ? (
              <span className="text-[#818c99]">
                {' '}
                · <span className="font-semibold">✓</span> {g.check}
              </span>
            ) : null}
          </p>
          {metrics ? (
            <p className="text-[11px] font-medium tabular-nums text-[#2d81e0]">{metrics}</p>
          ) : null}
        </div>
      ) : null}

      {daySlots.length > 0 ? (
        <div className="mt-2 space-y-0.5 border-t border-current/10 pt-1.5">
          {daySlots.map((slot) => (
            <p key={slot.id} className="text-[12px] leading-snug text-[#2c2d2e]">
              <span className="font-bold text-[#2d81e0]">{slot.label}:</span> {slot.line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default memo(PrepCoachGlance)
