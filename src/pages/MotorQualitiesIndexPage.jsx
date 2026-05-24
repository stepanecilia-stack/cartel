import { useEffect, useMemo, useState } from 'react'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import MotorQualityListRow from '../components/motor/MotorQualityListRow.jsx'
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

        <ul className="space-y-2">
          {items.map(({ title, slug, sensitiveAgeSet }) => {
            const count = countBySlug[slug] ?? 0
            return (
              <MotorQualityListRow
                key={slug}
                title={title}
                slug={slug}
                exerciseCount={count}
                exerciseCountLabel={exercisesCountLabel(count)}
                sensitiveAgeSet={sensitiveAgeSet}
              />
            )
          })}
        </ul>
      </div>
    </main>
  )
}

export default MotorQualitiesIndexPage
