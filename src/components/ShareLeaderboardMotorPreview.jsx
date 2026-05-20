const MAX_SQUARES = 48

/**
 * @param {{ squares?: { sensitive: boolean }[], className?: string }} props
 */
export default function ShareLeaderboardMotorPreview({ squares = [], className = '' }) {
  if (!squares.length) {
    return <span className={`text-[11px] text-[#aeb7c2] ${className}`}>нет выполнений</span>
  }

  const shown = squares.slice(-MAX_SQUARES)
  const hidden = squares.length - shown.length

  return (
    <div className={`flex flex-wrap gap-0.5 ${className}`} title={`Всего ${squares.length} выполнений`}>
      {shown.map((sq, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-[2px] ${
            sq.sensitive ? 'bg-[#4bb34b]' : 'bg-[#aeb7c2]'
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
