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
      <span className={`text-[10px] text-slate-400 ${className}`}>нет выполнений</span>
    )
  }

  const shown = squares.slice(-MAX_SQUARES)
  const hidden = squares.length - shown.length

  return (
    <div className={`flex flex-wrap gap-0.5 ${className}`} title={`Всего ${squares.length} выполнений`}>
      {shown.map((sq) => (
        <span
          key={sq.key}
          className={`h-3 w-3 rounded-sm sm:h-2.5 sm:w-2.5 ${
            sq.sensitive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
          aria-hidden
        />
      ))}
      {hidden > 0 ? (
        <span className="self-center text-[9px] tabular-nums text-slate-400">+{hidden}</span>
      ) : null}
    </div>
  )
}
