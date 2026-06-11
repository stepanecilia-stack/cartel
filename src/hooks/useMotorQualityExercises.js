import { useEffect, useState } from 'react'
import {
  getMotorQualityExercisesBySlug,
  subscribeMotorQualityExercisesCache,
} from '../data/motorQualityExercises.js'

/**
 * @param {string | undefined} slug
 */
export function useMotorQualityExercisesForSlug(slug) {
  const [exercises, setExercises] = useState(() =>
    slug ? getMotorQualityExercisesBySlug(slug) : [],
  )

  useEffect(() => {
    if (!slug) {
      setExercises([])
      return
    }
    let cancelled = false
    import('../data/coachCatalogSync.js').then(({ ensureCoachCatalogSync }) => {
      if (!cancelled) ensureCoachCatalogSync()
    })
    const sync = () => setExercises(getMotorQualityExercisesBySlug(slug))
    sync()
    const unsub = subscribeMotorQualityExercisesCache(sync)
    return () => {
      cancelled = true
      unsub()
    }
  }, [slug])

  return exercises
}
