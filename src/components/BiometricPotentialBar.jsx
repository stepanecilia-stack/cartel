/**
 * Полоса «потенциал тела» (КСП) и реализованный базовый КСР — как на карточке ученика.
 * @param {{ compact?: boolean }} props — compact: плотнее для карточек списка.
 */
export default function BiometricPotentialBar({ kspPercent, basePercent, className = '', compact = false }) {
  const k = Math.max(0, Math.min(100, Number(kspPercent) || 0))
  const b = Math.max(0, Math.min(100, Number(basePercent) || 0))
  const realized = Math.min(b, k)

  const box = compact
    ? `rounded-md border border-amber-200 bg-white/90 px-2 py-2 ${className}`
    : `rounded-lg border border-amber-200 bg-white/90 px-3 py-3 ${className}`

  return (
    <div className={box}>
      <div
        className={`flex items-center justify-between text-slate-600 ${compact ? 'mb-1 text-[10px] leading-tight' : 'mb-2 text-xs'}`}
      >
        <span className={compact ? 'pr-1' : ''}>Коэффициент спортивного потенциала (КСП)</span>
        <span className="shrink-0 font-semibold text-amber-900">{k}%</span>
      </div>
      <div className={`relative w-full overflow-hidden rounded-full bg-slate-300 ${compact ? 'h-2.5' : 'h-4'}`}>
        <div
          className="absolute inset-y-0 left-0 bg-slate-200/90"
          style={{ width: `${k}%` }}
          title="Предел тела (КСП)"
        />
        <div
          className="absolute inset-y-0 left-0 opacity-40"
          style={{
            width: `${k}%`,
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(71,85,105,0.25) 0px, rgba(71,85,105,0.25) 6px, rgba(148,163,184,0.08) 6px, rgba(148,163,184,0.08) 12px)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-500"
          style={{ width: `${realized}%` }}
          title="Реализовано из доступного потенциала"
        />
        <div
          className="absolute inset-y-[-2px] w-[3px] bg-amber-700/70"
          style={{ left: `${k}%` }}
          aria-hidden
        />
      </div>
      <div
        className={`flex flex-wrap items-center text-slate-600 ${compact ? 'mt-1.5 gap-2 text-[9px] leading-tight' : 'mt-2 gap-3 text-[10px]'}`}
      >
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden />
          Реализовано: {realized}%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />
          Предел тела (КСП): {k}%
        </span>
      </div>
    </div>
  )
}
