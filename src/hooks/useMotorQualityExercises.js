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
    const sync = () => setExercises(getMotorQualityExercisesBySlug(slug))
    sync()
    return subscribeMotorQualityExercisesCache(sync)
  }, [slug])

  return exercises
}
