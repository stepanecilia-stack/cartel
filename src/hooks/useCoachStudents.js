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
 * Список учеников из общего кэша (одна подписка Firestore на сессию).
 * @param {string | undefined | null} coachId
 * @param {{ viewAllStudents?: boolean }} [options] — для админа: вся коллекция students
 */
export function useCoachStudents(coachId, options = {}) {
  const viewAllStudents = Boolean(options.viewAllStudents)
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

    startCoachStudentsSync(coachId, { viewAllStudents: viewAllStudents })

    const sync = () => {
      if (getActiveCoachStudentsCoachId() !== coachId) return
      setStudents(getCoachStudentsCache())
      setIsLoading(!isCoachStudentsCacheReady())
      setLoadError(getCoachStudentsCacheError())
      setIsLive(isCoachStudentsCacheReady())
    }

    sync()
    return subscribeCoachStudentsCache(sync)
  }, [coachId, viewAllStudents])

  return { students, isLoading, loadError, isLive, viewAllStudents }
}
