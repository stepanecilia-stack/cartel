/**
 * Полоса «потенциал тела» (КБП) и реализованный базовый КСР — как на карточке ученика.
 * @param {{ compact?: boolean }} props — compact: плотнее для карточек списка.
 */
export default function BiometricPotentialBar({ kspPercent, basePercent, className = '', compact = false }) {
  const k = Math.max(0, Math.min(100, Number(kspPercent) || 0))
  const b = Math.max(0, Math.min(100, Number(basePercent) || 0))
  const realized = Math.min(b, k)

  const box = compact
    ? `rounded-md border border-slate-200 bg-white px-2 py-2 ${className}`
    : `rounded-lg border border-slate-200 bg-white px-3 py-3 ${className}`

  return (
    <div className={box}>
      <div
        className={`flex items-center justify-between ${compact ? 'mb-1 text-[10px] leading-tight text-slate-600' : 'mb-3 text-sm font-medium text-slate-800'}`}
      >
        <span className={compact ? 'pr-1' : ''}>Коэффициент биометрического потенциала (КБП)</span>
        <span className="shrink-0 font-bold tabular-nums text-slate-900">{k}%</span>
      </div>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-slate-300 ${compact ? 'h-2.5' : 'h-11 sm:h-12'}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-slate-200/90"
          style={{ width: `${k}%` }}
          title="Предел тела (КБП)"
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
          className={`absolute bg-slate-600/80 ${compact ? 'inset-y-[-2px] w-[3px]' : 'inset-y-0 w-1'}`}
          style={{ left: `${k}%` }}
          aria-hidden
        />
      </div>
      <div
        className={`flex flex-wrap items-center ${compact ? 'mt-1.5 gap-2 text-[9px] leading-tight text-slate-600' : 'mt-4 gap-4 text-sm font-semibold text-slate-900'}`}
      >
        <span className="inline-flex items-center gap-2">
          <span className={`rounded-full bg-blue-600 ${compact ? 'h-2 w-2' : 'h-3 w-3'}`} aria-hidden />
          Реализовано: {realized}%
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`rounded-full bg-slate-400 ${compact ? 'h-2 w-2' : 'h-3 w-3'}`} aria-hidden />
          Предел тела (КБП): {k}%
        </span>
      </div>
    </div>
  )
}
