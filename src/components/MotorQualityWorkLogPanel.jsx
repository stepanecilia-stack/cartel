import { Link } from 'react-router-dom'
import {
  formatWorkLogEntryDate,
  groupMotorQualityWorkLogForDisplay,
} from '../utils/motorQualityWorkLog.js'

/**
 * @param {{ workLog?: unknown, className?: string }} props
 */
export default function MotorQualityWorkLogPanel({ workLog, className = '' }) {
  const groups = groupMotorQualityWorkLogForDisplay(workLog)
  if (groups.length === 0) return null

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5 ${className}`}
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
        Объём работы по качествам
      </h2>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Каждый квадрат — одно выполненное упражнение из базы качеств. Зелёный — в сенситивном периоде, серый — вне
        окна.
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" aria-hidden />
          сенситивный период
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-600" aria-hidden />
          вне сенситивного окна
        </span>
      </div>
      <ul className="mt-4 space-y-4">
        {groups.map((group) => (
          <li key={group.slug}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to={`/qualities/${group.slug}`}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {group.title}
              </Link>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {group.entries.length}{' '}
                {group.entries.length === 1
                  ? 'выполнение'
                  : group.entries.length < 5
                    ? 'выполнения'
                    : 'выполнений'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
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
                    className={`inline-block h-3.5 w-3.5 shrink-0 rounded-sm ${
                      entry.inSensitivePeriod
                        ? 'bg-emerald-500 ring-1 ring-emerald-600/30'
                        : 'bg-slate-300 ring-1 ring-slate-400/40 dark:bg-slate-600 dark:ring-slate-500/50'
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
