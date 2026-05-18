const MAX_SQUARES = 48

/**
 * @param {{ squares?: { sensitive: boolean }[], className?: string }} props
 */
export default function ShareLeaderboardMotorPreview({ squares = [], className = '' }) {
  if (!squares.length) {
    return <span className={`text-[10px] text-slate-400 ${className}`}>нет выполнений</span>
  }

  const shown = squares.slice(-MAX_SQUARES)
  const hidden = squares.length - shown.length

  return (
    <div className={`flex flex-wrap gap-0.5 ${className}`} title={`Всего ${squares.length} выполнений`}>
      {shown.map((sq, i) => (
        <span
          key={i}
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
