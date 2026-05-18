import {
  groupSensitiveAgeRanges,
  sensitiveRangePositionPercent,
  SENSITIVE_AGE_SCALE_MAX,
  SENSITIVE_AGE_SCALE_MIN,
} from '../utils/sensitiveAgeScale.js'

const SEGMENTS = Array.from(
  { length: SENSITIVE_AGE_SCALE_MAX - SENSITIVE_AGE_SCALE_MIN + 1 },
  (_, i) => SENSITIVE_AGE_SCALE_MIN + i,
)

/**
 * Шкала 7–18 лет: сенситивные возрасты — зелёные сегменты с подписью, остальное — серое.
 * @param {{ sensitiveAges: Set<number> | number[], className?: string, showCaption?: boolean, compact?: boolean }} props
 */
export default function SensitiveAgeScale({
  sensitiveAges,
  className = '',
  showCaption = true,
  compact = false,
}) {
  const active = sensitiveAges instanceof Set ? sensitiveAges : new Set(sensitiveAges ?? [])
  const ranges = groupSensitiveAgeRanges(active)

  return (
    <div className={className}>
      {showCaption ? (
        <p
          className={`font-medium text-slate-500 dark:text-slate-400 ${
            compact ? 'mb-1 text-[10px]' : 'mb-1.5 text-[11px]'
          }`}
        >
          Сенситивные периоды ({SENSITIVE_AGE_SCALE_MIN}–{SENSITIVE_AGE_SCALE_MAX} лет)
        </p>
      ) : null}

      <div className="relative">
        {ranges.length > 0 ? (
          <div className={`relative w-full ${compact ? 'mb-0.5 h-3.5' : 'mb-1 h-5'}`}>
            {ranges.map(({ start, end, label }) => {
              const { leftPct, widthPct } = sensitiveRangePositionPercent(start, end)
              return (
                <span
                  key={`${start}-${end}`}
                  className={`absolute top-0 flex items-end justify-center font-semibold leading-none tabular-nums text-emerald-700 dark:text-emerald-400 ${
                    compact ? 'text-[8px] sm:text-[9px]' : 'text-[10px]'
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {label}
                </span>
              )
            })}
          </div>
        ) : (
          <div className={compact ? 'mb-0.5 h-3.5' : 'mb-1 h-5'} aria-hidden />
        )}

        <div
          className={`flex w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${
            compact ? 'h-2 sm:h-2.5' : 'h-3'
          }`}
          role="img"
          aria-label={`Шкала возраста ${SENSITIVE_AGE_SCALE_MIN}–${SENSITIVE_AGE_SCALE_MAX} лет, сенситивные годы: ${ranges.map((r) => r.label).join(', ') || 'нет'}`}
        >
          {SEGMENTS.map((age) => (
            <div
              key={age}
              title={`${age} лет${active.has(age) ? ' — сенситивный' : ''}`}
              className={`min-w-0 flex-1 border-r border-white/25 last:border-r-0 dark:border-slate-900/30 ${
                active.has(age)
                  ? 'bg-emerald-500 dark:bg-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      <div
        className={`mt-0.5 flex justify-between tabular-nums text-slate-400 dark:text-slate-500 ${
          compact ? 'text-[8px] sm:text-[9px]' : 'text-[10px]'
        }`}
      >
        <span>{SENSITIVE_AGE_SCALE_MIN}</span>
        <span>{SENSITIVE_AGE_SCALE_MAX}</span>
      </div>
    </div>
  )
}
