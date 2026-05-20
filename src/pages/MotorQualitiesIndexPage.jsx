import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import SensitiveAgeScale from '../components/SensitiveAgeScale'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'
import {
  getMotorQualityExercisesBySlug,
  subscribeMotorQualityExercisesCache,
} from '../data/motorQualityExercises.js'
import { vk } from '../utils/vkUi.js'

function exercisesCountLabel(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'упражнение'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'упражнения'
  return 'упражнений'
}

function MotorQualitiesIndexPage() {
  const items = getMotorQualitiesCatalog()
  const [, cacheTick] = useState(0)

  useEffect(() => subscribeMotorQualityExercisesCache(() => setCacheTick((t) => t + 1)), [])

  const countBySlug = useMemo(() => {
    const map = {}
    for (const { slug } of items) {
      map[slug] = getMotorQualityExercisesBySlug(slug).length
    }
    return map
  }, [items, cacheTick])

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-4xl`}>
        <BackToHomeBar />
        <header>
          <h1 className={vk.h1Lg}>База упражнений</h1>
          <p className={`mt-1 ${vk.muted}`}>Двигательные качества — банк упражнений и объёмов.</p>
        </header>

        <ul className={vk.list}>
          {items.map(({ title, slug, sensitiveAgeSet }) => {
            const count = countBySlug[slug] ?? 0
            return (
            <li key={slug} className="border-t border-[#e7e8ec] first:border-t-0">
              <Link
                to={`/qualities/${slug}`}
                className="block touch-manipulation px-3 py-2.5 active:bg-[#f5f6f8]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`min-w-0 ${vk.listItemTitle}`}>{title}</span>
                  <span
                    className={`shrink-0 text-[12px] tabular-nums leading-4 ${
                      count > 0 ? 'font-medium text-[#818c99]' : 'text-[#aeb7c2]'
                    }`}
                  >
                    {count} {exercisesCountLabel(count)}
                  </span>
                </div>
                {sensitiveAgeSet?.size > 0 ? (
                  <SensitiveAgeScale
                    sensitiveAges={sensitiveAgeSet}
                    compact
                    showCaption={false}
                    className="mt-1.5"
                  />
                ) : null}
              </Link>
            </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}

export default MotorQualitiesIndexPage
