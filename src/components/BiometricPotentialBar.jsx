/**
 * Полоса «потенциал тела» (КСП) и реализованный базовый КСР — как на карточке ученика.
 */
export default function BiometricPotentialBar({ kspPercent, basePercent, className = '' }) {
  const k = Math.max(0, Math.min(100, Number(kspPercent) || 0))
  const b = Math.max(0, Math.min(100, Number(basePercent) || 0))
  const realized = Math.min(b, k)

  return (
    <div className={`rounded-lg border border-amber-200 bg-white/90 px-3 py-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
        <span>Коэффициент спортивного потенциала (КСП)</span>
        <span className="font-semibold text-amber-900">{k}%</span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-300">
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
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
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
