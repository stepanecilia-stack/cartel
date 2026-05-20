import { Link } from 'react-router-dom'
import {
  formatWorkLogEntryDate,
  groupMotorQualityWorkLogForDisplay,
} from '../utils/motorQualityWorkLog.js'
import { vk } from '../utils/vkUi.js'

function formatCount(n) {
  if (n === 1) return '1 упр.'
  if (n >= 2 && n <= 4) return `${n} упр.`
  return `${n} упр.`
}

/**
 * @param {{ workLog?: unknown, className?: string }} props
 */
export default function MotorQualityWorkLogPanel({ workLog, className = '' }) {
  const groups = groupMotorQualityWorkLogForDisplay(workLog)
  if (groups.length === 0) return null

  return (
    <section className={`${vk.cardPadded} py-2.5 sm:py-3 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h2 className={vk.h2}>Объём работы по качествам</h2>
        <p className={`${vk.mutedXs} flex flex-wrap items-center gap-x-2 gap-y-0`}>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#4bb34b]" aria-hidden />
            в окне
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#aeb7c2]" aria-hidden />
            вне окна
          </span>
        </p>
      </div>

      <ul className={`${vk.list} mt-1.5`}>
        {groups.map((group) => (
          <li key={group.slug} className="border-t border-[#e7e8ec] px-2.5 py-1.5 first:border-t-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/qualities/${group.slug}`}
                className={`min-w-0 flex-1 truncate ${vk.link} text-[14px] font-medium`}
              >
                {group.title}
              </Link>
              <span className={`shrink-0 tabular-nums ${vk.mutedXs}`}>{formatCount(group.entries.length)}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {group.entries.map((entry) => {
                const label = [
                  entry.exerciseTitle || 'Упражнение',
                  formatWorkLogEntryDate(entry),
                  entry.doseText,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <span
                    key={entry.id}
                    title={label}
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] ${
                      entry.inSensitivePeriod ? 'bg-[#4bb34b]' : 'bg-[#aeb7c2]'
                    }`}
                    role="img"
                    aria-label={label}
                  />
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
