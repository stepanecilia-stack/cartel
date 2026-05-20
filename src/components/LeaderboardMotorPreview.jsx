import { groupMotorQualityWorkLogForDisplay } from '../utils/motorQualityWorkLog.js'

const MAX_SQUARES = 48

/**
 * @param {{ workLog?: unknown, className?: string }} props
 */
export default function LeaderboardMotorPreview({ workLog, className = '' }) {
  const groups = groupMotorQualityWorkLogForDisplay(workLog)
  const squares = groups.flatMap((g) =>
    g.entries.map((e) => ({
      key: `${g.slug}-${e.id}`,
      sensitive: Boolean(e.inSensitivePeriod),
    })),
  )

  if (squares.length === 0) {
    return (
      <span className={`text-[11px] text-[#aeb7c2] ${className}`}>нет выполнений</span>
    )
  }

  const shown = squares.slice(-MAX_SQUARES)
  const hidden = squares.length - shown.length

  return (
    <div className={`flex flex-wrap gap-0.5 ${className}`} title={`Всего ${squares.length} выполнений`}>
      {shown.map((sq) => (
        <span
          key={sq.key}
          className={`h-2 w-2 rounded-[2px] ${
            sq.sensitive ? 'bg-[#4bb34b]' : 'bg-[#aeb7c2]'
          }`}
          aria-hidden
        />
      ))}
      {hidden > 0 ? (
        <span className="self-center text-[10px] tabular-nums text-[#818c99]">+{hidden}</span>
      ) : null}
    </div>
  )
}
