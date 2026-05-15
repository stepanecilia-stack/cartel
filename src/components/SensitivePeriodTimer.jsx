import { useMemo } from 'react'
import { buildSensitivePeriodTimer } from '../utils/sensitivePeriodTimer.js'

/** @typedef {'missed' | 'comfort' | 'warn' | 'critical'} UrgencyTone */

const URGENCY_META = {
  missed: {
    badge: 'Пропущено',
    row: 'border-slate-200 bg-slate-50 opacity-90',
    badgeClass: 'bg-slate-200 text-slate-600',
    bar: 'bg-slate-300',
    dot: 'bg-slate-400',
    counter: 'text-slate-600',
    track: 'bg-slate-200',
    progressHint: 'text-slate-500',
  },
  comfort: {
    badge: 'Ковать сейчас',
    row: 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200',
    badgeClass: 'bg-emerald-600 text-white',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    counter: 'text-emerald-900',
    track: 'bg-emerald-100',
    progressHint: 'text-emerald-800',
  },
  warn: {
    badge: 'Ковать сейчас',
    row: 'border-amber-300 bg-amber-50 ring-1 ring-amber-200',
    badgeClass: 'bg-amber-500 text-white',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    counter: 'text-amber-900',
    track: 'bg-amber-100',
    progressHint: 'text-amber-800',
  },
  critical: {
    badge: 'Срочно!',
    row: 'border-red-400 bg-red-50 ring-2 ring-red-300 shadow-sm shadow-red-100',
    badgeClass: 'bg-red-600 text-white',
    bar: 'bg-red-600',
    dot: 'bg-red-600 animate-pulse',
    counter: 'font-bold text-red-900',
    track: 'bg-red-100',
    progressHint: 'font-medium text-red-800',
  },
}

const SUMMARY_META = {
  missed: 'border-slate-200 bg-slate-50 text-slate-600',
  comfort: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-red-300 bg-red-50 text-red-900',
}

const ELAPSED_BAR = 'bg-slate-400'
const WINDOW_TRACK = 'bg-slate-200'

/** @param {import('../utils/sensitivePeriodTimer.js').SensitivePeriodTimerItem} item */
function badgeForItem(item) {
  if (item.status === 'missed') return URGENCY_META.missed.badge
  if (item.status === 'future') {
    if (item.urgencyTone === 'critical') return 'Скоро откроется'
    if (item.urgencyTone === 'comfort') return 'Будущее'
    return 'Готовиться'
  }
  if (item.urgencyTone === 'critical') return 'Горит!'
  return URGENCY_META[item.urgencyTone]?.badge ?? 'Ковать сейчас'
}

/**
 * @param {import('../utils/sensitivePeriodTimer.js').SensitivePeriodTimerItem[]} items
 * @returns {UrgencyTone}
 */
function worstActiveUrgency(items) {
  const order = /** @type {const} */ (['critical', 'warn', 'comfort', 'missed'])
  for (const tone of order) {
    if (items.some((i) => i.status === 'active' && i.urgencyTone === tone)) return tone
  }
  return 'missed'
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
      <p
        className={`rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 ${className}`}
      >
        Укажите год рождения в «Карте спортсмена». Для точных окон можно дополнительно указать полную дату рождения.
      </p>
    )
  }

  const activeUrgency = worstActiveUrgency(timer.items ?? [])

  return (
    <div className={`space-y-3 ${className}`}>
      {timer.activeCount > 0 ? (
        <p
          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${SUMMARY_META[activeUrgency]}`}
        >
          {activeUrgency === 'critical'
            ? `Срочно: ${timer.activeCount} активных окон — времени мало, окно скоро закроется`
            : activeUrgency === 'warn'
              ? `Внимание: ${timer.activeCount} активных окон — пора усилить нагрузку`
              : `Активных окон: ${timer.activeCount} — время в запасе, куйте потенциал`}
        </p>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Сейчас нет активного окна
        </p>
      )}

      <ul className="space-y-2">
        {(timer.items ?? []).map((item) => {
          const tone = item.urgencyTone ?? 'missed'
          const meta = URGENCY_META[tone] ?? URGENCY_META.missed
          const badge = badgeForItem(item)

          return (
            <li key={item.id} className={`rounded-lg border px-3 py-2.5 ${meta.row}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                    <p className="text-sm font-semibold leading-snug text-slate-900">{item.title}</p>
                  </div>
                  <p className="mt-1 pl-4 text-[11px] text-slate-500">{item.windowLabel}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClass}`}
                >
                  {badge}
                </span>
              </div>

              <p className={`mt-2 pl-4 text-xs font-medium ${meta.counter}`}>{item.counterLabel}</p>

              {item.status === 'active' ? (
                <div className="mt-2 pl-4">
                  <div className="mb-1 flex justify-between text-[9px] font-medium uppercase tracking-wide text-slate-400">
                    <span>Начало окна</span>
                    <span>Конец окна</span>
                  </div>
                  <div
                    className={`flex h-2 overflow-hidden rounded-full ${WINDOW_TRACK}`}
                    role="progressbar"
                    aria-valuenow={item.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Пройдено ${item.progressPercent}%, осталось ${item.remainingPercent}%`}
                  >
                    <div
                      className={`h-full shrink-0 ${ELAPSED_BAR} transition-[width] duration-500`}
                      style={{ width: `${item.progressPercent}%` }}
                      title={`Пройдено: ${item.progressPercent}% — время уже не вернуть`}
                    />
                    <div
                      className={`h-full shrink-0 transition-[width] duration-500 ${meta.bar}`}
                      style={{ width: `${item.remainingPercent}%` }}
                      title={`Осталось: ${item.remainingPercent}%`}
                    />
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-[10px] tabular-nums">
                    <span className="text-slate-500">Пройдено: {item.progressPercent}%</span>
                    <span className={meta.progressHint}>Осталось: {item.remainingPercent}%</span>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
