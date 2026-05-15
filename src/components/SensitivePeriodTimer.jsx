import { useMemo } from 'react'
import { buildSensitivePeriodTimer } from '../utils/sensitivePeriodTimer.js'

const STATUS_META = {
  active: {
    badge: 'Ковать сейчас',
    row: 'border-amber-300 bg-amber-50 ring-1 ring-amber-200 dark:border-amber-600 dark:bg-amber-950/40 dark:ring-amber-800',
    badgeClass: 'bg-amber-500 text-white',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  future: {
    badge: 'Будущее',
    row: 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    bar: 'bg-slate-300 dark:bg-slate-600',
    dot: 'bg-slate-400',
  },
  missed: {
    badge: 'Пропущено',
    row: 'border-slate-200 bg-white opacity-80 dark:border-slate-700 dark:bg-slate-900/60',
    badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    bar: 'bg-slate-200 dark:bg-slate-700',
    dot: 'bg-slate-300 dark:bg-slate-600',
  },
}

/**
 * @param {{ birthYear?: number | string | null, birthDate?: Date | string | null, className?: string }} props
 */
export default function SensitivePeriodTimer({ birthYear, birthDate, className = '' }) {
  const timer = useMemo(
    () => buildSensitivePeriodTimer({ birthYear, birthDate }),
    [birthYear, birthDate],
  )

  if (!timer.ready) {
    return (
      <p className={`rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 ${className}`}>
        Укажите год рождения в разделе «Антропометрия». Для точных окон можно дополнительно указать полную дату рождения.
      </p>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {timer.activeCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Активных окон: {timer.activeCount}
        </p>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800/60">
          Сейчас нет активного окна
        </p>
      )}

      <ul className="space-y-2">
        {timer.items.map((item) => {
          const meta = STATUS_META[item.status]
          return (
            <li
              key={item.id}
              className={`rounded-lg border px-3 py-2.5 ${meta.row}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                    <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-1 pl-4 text-[11px] text-slate-500 dark:text-slate-400">{item.windowLabel}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClass}`}
                >
                  {meta.badge}
                </span>
              </div>

              <p
                className={`mt-2 pl-4 text-xs font-medium ${
                  item.status === 'active'
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.counterLabel}
              </p>

              {item.status === 'active' ? (
                <div className="mt-2 pl-4">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/60"
                    role="progressbar"
                    aria-valuenow={item.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Прогресс окна: ${item.progressPercent}%`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] ${meta.bar}`}
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] tabular-nums text-amber-800/80 dark:text-amber-300/80">
                    Пройдено окна: {item.progressPercent}%
                  </p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
