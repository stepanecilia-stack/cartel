import { memo } from 'react'

/**
 * @param {{
 *   tech?: { kdPercent?: number, studiedCount?: number, totalAtoms?: number },
 *   medals?: { gold: number, silver: number, bronze: number },
 *   motor?: { total?: number },
 *   overall?: {
 *     kdPercent?: number,
 *     studiedLabel?: string,
 *     motorTotal?: number,
 *     medals?: { gold: number, silver: number, bronze: number },
 *   },
 *   compact?: boolean,
 * }} props
 */
function LeaderboardOverallMetrics({ tech, medals, motor, overall, compact = true }) {
  const kdPercent = overall?.kdPercent ?? tech?.kdPercent ?? 0
  const studiedLabel =
    overall?.studiedLabel ??
    (tech?.totalAtoms != null ? `${tech.studiedCount ?? 0}/${tech.totalAtoms}` : '—')
  const motorTotal = overall?.motorTotal ?? motor?.total ?? 0
  const medalData = overall?.medals ?? medals

  return (
    <div className={`space-y-0.5 ${compact ? 'text-[11px] leading-snug' : 'text-[12px] leading-relaxed'}`}>
      <p className="text-[#2c2d2e]">
        <span className="font-medium text-[#818c99]">Техника:</span>{' '}
        <span className="font-semibold tabular-nums text-[#2d81e0]">КД {kdPercent}%</span>
        <span className="text-[#818c99]"> · {studiedLabel} приёмов</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[#2c2d2e]">
        <span className="font-medium text-[#818c99]">Физика:</span>
        {medalData ? (
          <span className="tabular-nums text-[#818c99]">
            🥇{medalData.gold} · 🥈{medalData.silver} · 🥉{medalData.bronze}
          </span>
        ) : (
          <span className="text-[#818c99]">нет зачётов</span>
        )}
      </p>
      <p className="text-[#2c2d2e]">
        <span className="font-medium text-[#818c99]">Качества:</span>{' '}
        <span className="font-semibold tabular-nums">{motorTotal}</span>
        <span className="text-[#818c99]">
          {' '}
          {motorTotal === 1 ? 'зачёт' : motorTotal < 5 ? 'зачёта' : 'зачётов'}
        </span>
      </p>
    </div>
  )
}

export default memo(LeaderboardOverallMetrics)
