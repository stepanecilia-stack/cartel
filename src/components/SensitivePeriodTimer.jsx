import { useMemo } from 'react'
import { buildSensitivePeriodTimer } from '../utils/sensitivePeriodTimer.js'
import { vk } from '../utils/vkUi.js'

/** @typedef {'missed' | 'comfort' | 'warn' | 'critical'} UrgencyTone */

const TONE = {
  missed: {
    badge: 'Пропущено',
    accent: 'border-l-[#aeb7c2]',
    dot: 'bg-[#aeb7c2]',
    badgeCls: 'bg-[#f0f2f5] text-[#818c99]',
    bar: 'bg-[#aeb7c2]',
    hint: 'text-[#818c99]',
  },
  comfort: {
    badge: 'Сейчас',
    accent: 'border-l-[#4bb34b]',
    dot: 'bg-[#4bb34b]',
    badgeCls: 'bg-[#e8f9ed] text-[#4bb34b]',
    bar: 'bg-[#4bb34b]',
    hint: 'text-[#4bb34b]',
  },
  warn: {
    badge: 'Сейчас',
    accent: 'border-l-[#e6a817]',
    dot: 'bg-[#e6a817]',
    badgeCls: 'bg-[#fff8e6] text-[#e6a817]',
    bar: 'bg-[#e6a817]',
    hint: 'text-[#e6a817]',
  },
  critical: {
    badge: 'Срочно',
    accent: 'border-l-[#e64646]',
    dot: 'bg-[#e64646]',
    badgeCls: 'bg-[#fff0f0] text-[#e64646]',
    bar: 'bg-[#e64646]',
    hint: 'text-[#e64646] font-medium',
  },
}

const SUMMARY = {
  missed: 'bg-[#f0f2f5] text-[#818c99]',
  comfort: 'bg-[#e8f9ed] text-[#2c2d2e]',
  warn: 'bg-[#fff8e6] text-[#2c2d2e]',
  critical: 'bg-[#fff0f0] text-[#e64646]',
}

/** @param {import('../utils/sensitivePeriodTimer.js').SensitivePeriodTimerItem} item */
function badgeForItem(item) {
  if (item.status === 'missed') return TONE.missed.badge
  if (item.status === 'future') {
    if (item.urgencyTone === 'critical') return 'Скоро'
    return 'Позже'
  }
  if (item.urgencyTone === 'critical') return TONE.critical.badge
  return TONE[item.urgencyTone]?.badge ?? 'Сейчас'
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
      <p className={`${vk.mutedXs} rounded-[10px] bg-[#f0f2f5] px-2.5 py-2 ${className}`}>
        Укажите год рождения в «Карте спортсмена».
      </p>
    )
  }

  const activeUrgency = worstActiveUrgency(timer.items ?? [])

  return (
    <div className={`space-y-1.5 ${className}`}>
      {timer.activeCount > 0 ? (
        <p className={`rounded-[10px] px-2.5 py-1.5 text-[12px] leading-4 ${SUMMARY[activeUrgency]}`}>
          {activeUrgency === 'critical'
            ? `Срочно: ${timer.activeCount} активных окон`
            : activeUrgency === 'warn'
              ? `Внимание: ${timer.activeCount} активных окон`
              : `Активно окон: ${timer.activeCount}`}
        </p>
      ) : (
        <p className={`${vk.mutedXs} px-0.5`}>Сейчас нет активного окна</p>
      )}

      <ul className={vk.list}>
        {(timer.items ?? []).map((item) => {
          const tone = item.urgencyTone ?? 'missed'
          const meta = TONE[tone] ?? TONE.missed
          const badge = badgeForItem(item)
          const isActive = item.status === 'active'

          return (
            <li
              key={item.id}
              className={`border-l-2 border-t border-[#e7e8ec] first:border-t-0 ${meta.accent} bg-white px-2.5 py-1.5`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[14px] font-medium leading-4 text-[#2c2d2e]">
                  {item.title}
                </p>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-3 ${meta.badgeCls}`}
                >
                  {badge}
                </span>
              </div>

              <p className={`mt-0.5 pl-3 text-[12px] leading-4 ${meta.hint}`}>{item.counterLabel}</p>

              {isActive ? (
                <div
                  className="mt-1 flex h-1 overflow-hidden rounded-full bg-[#f0f2f5] pl-3"
                  role="progressbar"
                  aria-valuenow={item.remainingPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Осталось ${item.remainingPercent}% окна`}
                >
                  <div
                    className="h-full shrink-0 bg-[#d3d9de]"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                  <div
                    className={`h-full shrink-0 ${meta.bar}`}
                    style={{ width: `${item.remainingPercent}%` }}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
