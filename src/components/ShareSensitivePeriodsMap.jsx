import { useMemo } from 'react'
import SensitiveAgeScale from './SensitiveAgeScale'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'
import { computeAthleteAgeYears } from '../utils/studentModel'
import { getSensitiveMotorQualities } from '../utils/sensitivePeriods'

export default function ShareSensitivePeriodsMap({ birthYear }) {
  const catalog = useMemo(() => getMotorQualitiesCatalog(), [])
  const ageYears = useMemo(() => computeAthleteAgeYears(birthYear), [birthYear])
  const sensitiveNow = useMemo(() => {
    if (ageYears == null) return null
    return getSensitiveMotorQualities(ageYears)
  }, [ageYears])

  const activeNowSet = useMemo(() => {
    if (ageYears == null) return new Set()
    return new Set(sensitiveNow?.qualities ?? [])
  }, [ageYears, sensitiveNow])

  return (
    <section className="rounded-xl bg-white p-2.5 shadow-sm dark:bg-slate-900 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
        Карта сенситивных периодов
      </h2>
      <p className="mt-1 text-[11px] leading-snug text-slate-600 sm:text-xs dark:text-slate-400">
        Зелёным отмечены возраста, когда качество развивается особенно эффективно (7–18 лет).
      </p>

      {ageYears != null ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] leading-snug text-emerald-900 sm:text-xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <span className="font-semibold">Сейчас {ageYears} лет.</span>
          {activeNowSet.size > 0 ? (
            <>
              {' '}
              В сенситивном окне:{' '}
              {[...(sensitiveNow?.qualities ?? [])].slice(0, 4).join(', ')}
              {activeNowSet.size > 4 ? ` и ещё ${activeNowSet.size - 4}` : ''}.
            </>
          ) : (
            ' Сейчас нет качеств в активном сенситивном окне по таблице.'
          )}
        </p>
      ) : (
        <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-800/85 dark:text-slate-400">
          Укажите тренеру год рождения в карте спортсмена — тогда здесь появится возраст и подсветка «Сейчас».
        </p>
      )}

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:mt-4 sm:grid-cols-2 sm:gap-2">
        {catalog.map(({ title, sensitiveAgeSet }) => {
          const activeNow = activeNowSet.has(title)
          return (
            <li
              key={title}
              className={`rounded-lg border px-2 py-2 sm:px-2.5 sm:py-2.5 ${
                activeNow
                  ? 'border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/30 dark:ring-emerald-800/50'
                  : 'border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-[11px] font-semibold leading-snug text-slate-900 sm:text-xs dark:text-slate-100">
                  {title}
                </span>
                {activeNow ? (
                  <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Сейчас
                  </span>
                ) : null}
              </div>
              {sensitiveAgeSet?.size > 0 ? (
                <SensitiveAgeScale
                  sensitiveAges={sensitiveAgeSet}
                  compact
                  showCaption={false}
                  className="mt-1.5"
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
