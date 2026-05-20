import { useMemo } from 'react'
import SensitiveAgeScale from './SensitiveAgeScale'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'
import { computeAthleteAgeYears } from '../utils/studentModel'
import { getSensitiveMotorQualities } from '../utils/sensitivePeriods'
import { vk } from '../utils/vkUi.js'

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
    <section className={`${vk.cardPadded} py-2.5`}>
      <h2 className={vk.h2}>Сенситивные периоды</h2>
      <p className={`mt-0.5 ${vk.mutedXs}`}>Зелёным — возраста, когда качество развивается особенно эффективно.</p>

      {ageYears != null ? (
        <p className={`${vk.noticeInfo} mt-2`}>
          <span className="font-medium text-[#2c2d2e]">Сейчас {ageYears} лет.</span>
          {activeNowSet.size > 0 ? (
            <>
              {' '}
              В окне: {[...(sensitiveNow?.qualities ?? [])].slice(0, 4).join(', ')}
              {activeNowSet.size > 4 ? ` и ещё ${activeNowSet.size - 4}` : ''}.
            </>
          ) : (
            ' Сейчас нет качеств в активном окне по таблице.'
          )}
        </p>
      ) : (
        <p className={`${vk.notice} mt-2`}>Укажите тренеру год рождения — появится возраст и подсветка «Сейчас».</p>
      )}

      <ul className="mt-2 space-y-1">
        {catalog.map(({ title, sensitiveAgeSet }) => {
          const activeNow = activeNowSet.has(title)
          return (
            <li
              key={title}
              className={`rounded-lg border px-2.5 py-2 ${
                activeNow ? 'border-[#b8d4a8] bg-[#e8f7e8]' : 'border-[#e7e8ec] bg-[#f0f2f5]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium leading-4 text-[#2c2d2e]">{title}</span>
                {activeNow ? (
                  <span className="shrink-0 rounded bg-[#4bb34b] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Сейчас
                  </span>
                ) : null}
              </div>
              {sensitiveAgeSet?.size > 0 ? (
                <SensitiveAgeScale
                  sensitiveAges={sensitiveAgeSet}
                  compact
                  showCaption={false}
                  className="mt-1"
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
