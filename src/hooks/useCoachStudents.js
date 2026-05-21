import { useEffect, useState } from 'react'
import {
  getActiveCoachStudentsCoachId,
  getCoachStudentsCache,
  getCoachStudentsCacheError,
  isCoachStudentsCacheReady,
  startCoachStudentsSync,
  subscribeCoachStudentsCache,
} from '../data/coachStudentsCache.js'

/**
 * Список учеников тренера из общего кэша (одна подписка Firestore на сессию).
 * @param {string | undefined | null} coachId
 */
export function useCoachStudents(coachId) {
  const [students, setStudents] = useState(() =>
    coachId && coachId === getActiveCoachStudentsCoachId() ? getCoachStudentsCache() : [],
  )
  const [isLoading, setIsLoading] = useState(
    () => !(coachId && coachId === getActiveCoachStudentsCoachId() && isCoachStudentsCacheReady()),
  )
  const [loadError, setLoadError] = useState(() =>
    coachId && coachId === getActiveCoachStudentsCoachId() ? getCoachStudentsCacheError() : '',
  )
  const [isLive, setIsLive] = useState(
    () => coachId != null && coachId === getActiveCoachStudentsCoachId() && isCoachStudentsCacheReady(),
  )

  useEffect(() => {
    if (!coachId) {
      setStudents([])
      setIsLoading(false)
      setLoadError('')
      setIsLive(false)
      return undefined
    }

    startCoachStudentsSync(coachId)

    const sync = () => {
      if (getActiveCoachStudentsCoachId() !== coachId) return
      setStudents(getCoachStudentsCache())
      setIsLoading(!isCoachStudentsCacheReady())
      setLoadError(getCoachStudentsCacheError())
      setIsLive(isCoachStudentsCacheReady())
    }

    sync()
    return subscribeCoachStudentsCache(sync)
  }, [coachId])

  return { students, isLoading, loadError, isLive }
}
