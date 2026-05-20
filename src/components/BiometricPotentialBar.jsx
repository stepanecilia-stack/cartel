/**
 * Полоса КБП и реализованный базовый КСР.
 * @param {{ kspPercent: number, basePercent: number, className?: string, compact?: boolean, embedded?: boolean }} props
 * embedded — без своей рамки, для вложения в карточку «Эталон» (VK).
 */
export default function BiometricPotentialBar({
  kspPercent,
  basePercent,
  className = '',
  compact = false,
  embedded = false,
}) {
  const k = Math.max(0, Math.min(100, Number(kspPercent) || 0))
  const b = Math.max(0, Math.min(100, Number(basePercent) || 0))
  const realized = Math.min(b, k)

  const isVk = embedded || compact
  const box = embedded
    ? className
    : compact
      ? `rounded-md border border-slate-200 bg-white px-2 py-2 ${className}`
      : `rounded-lg border border-slate-200 bg-white px-3 py-3 ${className}`

  const titleCls = isVk
    ? 'flex items-center justify-between gap-2 text-[13px] font-medium text-[#2c2d2e]'
    : 'flex items-center justify-between mb-3 text-sm font-medium text-slate-800'

  const barH = isVk ? 'h-2' : compact ? 'h-2.5' : 'h-11 sm:h-12'
  const legendCls = isVk
    ? 'mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#818c99]'
    : 'mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-900'

  return (
    <div className={box}>
      {!embedded ? (
        <div className={isVk ? titleCls : `${titleCls} ${compact ? 'mb-1 text-[10px]' : ''}`}>
          <span className={isVk ? 'text-[#818c99]' : compact ? 'pr-1 text-slate-600' : ''}>
            {isVk ? 'КБП' : 'Коэффициент биометрического потенциала (КБП)'}
          </span>
          <span className={`shrink-0 font-semibold tabular-nums ${isVk ? 'text-[#2d81e0]' : 'text-slate-900'}`}>
            {k}%
          </span>
        </div>
      ) : null}
      <div className={`relative w-full overflow-hidden rounded-full ${isVk ? 'bg-[#f0f2f5]' : 'bg-slate-300'} ${barH}`}>
        <div
          className={`absolute inset-y-0 left-0 ${isVk ? 'bg-[#d3d9de]' : 'bg-slate-200/90'}`}
          style={{ width: `${k}%` }}
          title="Предел тела (КБП)"
        />
        {!isVk ? (
          <div
            className="absolute inset-y-0 left-0 opacity-40"
            style={{
              width: `${k}%`,
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(71,85,105,0.25) 0px, rgba(71,85,105,0.25) 6px, rgba(148,163,184,0.08) 6px, rgba(148,163,184,0.08) 12px)',
            }}
            aria-hidden
          />
        ) : null}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${isVk ? 'bg-[#2d81e0]' : 'bg-blue-600'}`}
          style={{ width: `${realized}%` }}
          title="Реализовано"
        />
        <div
          className={`absolute ${isVk ? 'inset-y-[-1px] w-px bg-[#818c99]' : 'inset-y-0 w-1 bg-slate-600/80'}`}
          style={{ left: `${k}%` }}
          aria-hidden
        />
      </div>
      <div className={isVk ? legendCls : `${legendCls} ${compact ? 'mt-1.5 gap-2 text-[9px] text-slate-600' : ''}`}>
        <span className="inline-flex items-center gap-1">
          <span
            className={`rounded-full ${isVk ? 'h-1.5 w-1.5 bg-[#2d81e0]' : `bg-blue-600 ${compact ? 'h-2 w-2' : 'h-3 w-3'}`}`}
            aria-hidden
          />
          Реализовано {realized}%
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className={`rounded-full ${isVk ? 'h-1.5 w-1.5 bg-[#aeb7c2]' : `bg-slate-400 ${compact ? 'h-2 w-2' : 'h-3 w-3'}`}`}
            aria-hidden
          />
          {isVk ? `Потолок ${k}%` : `Предел тела (КБП): ${k}%`}
        </span>
      </div>
    </div>
  )
}
