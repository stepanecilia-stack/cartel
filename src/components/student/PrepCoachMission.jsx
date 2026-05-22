import { memo } from 'react'
import { getMacroGlance } from '../../data/coachGlance.js'
import { getSeasonGoalOptionLabel } from '../../data/seasonGoals.js'
import PrepCoachGlance from './PrepCoachGlance.jsx'

/**
 * @param {{
 *   title: string,
 *   brief: { mission: string, teach: string[], results: string[], check: string },
 *   farFromStart?: string | null,
 *   compact?: boolean,
 *   phaseId?: string,
 * }} props
 */
function PrepCoachMission({ title, brief, farFromStart = null, compact = true, phaseId = 'open' }) {
  if (compact) {
    const g = getMacroGlance(phaseId)
    return (
      <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
        <p className="text-[11px] font-medium text-[#818c99]">{title}</p>
        <PrepCoachGlance
          phaseId={phaseId}
          phaseLabel={title.replace(/^.*·\s*/, '')}
          glance={g}
          blockReason={farFromStart}
        />
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-[#2d81e0]/25 bg-[#f5f9ff] px-2.5 py-2">
      <p className="text-[12px] font-semibold text-[#2d81e0]">{title}</p>
      <p className="mt-1 text-[13px] font-medium leading-snug text-[#2c2d2e]">{brief.mission}</p>
      {farFromStart ? (
        <p className="mt-1.5 text-[11px] text-amber-950">{farFromStart}</p>
      ) : null}
    </div>
  )
}

/**
 * @param {{ resolved: ReturnType<import('../../data/prepCoachBriefs.js').resolveCoachBriefForDay> }} props
 */
export function PrepCoachMissionFromResolved({ resolved }) {
  if (!resolved?.brief) return null

  const phaseId = resolved.phaseId ?? 'open'

  if (resolved.kind === 'micro') {
    const label = resolved.stageLabel ?? resolved.phaseId
    return (
      <PrepCoachMission
        title={`К старту · ${label}`}
        brief={resolved.brief}
        phaseId={phaseId}
        compact
      />
    )
  }

  const mode = resolved.seasonMode ?? 'advance'
  const goal = getSeasonGoalOptionLabel(mode, { ladderClosed: Boolean(resolved.ladderClosed) })
  const title = goal.short

  return (
    <PrepCoachMission
      title={title}
      brief={resolved.brief}
      farFromStart={resolved.farFromStart}
      phaseId={phaseId}
      compact
    />
  )
}

export default memo(PrepCoachMission)
