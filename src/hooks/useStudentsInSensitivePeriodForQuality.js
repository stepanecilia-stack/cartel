import { useCallback, useEffect, useState } from 'react'
import {
  getActiveCoachStudentsCoachId,
  getCoachStudentsCache,
  getCoachStudentsCacheError,
  isCoachStudentsCacheReady,
  startCoachStudentsSync,
  subscribeCoachStudentsCache,
} from '../data/coachStudentsCache.js'
import {
  pickCoachStudentsWithAge,
  pickStudentsInSensitivePeriodForQuality,
  pickStudentsNotInIdList,
} from '../utils/qualitySensitiveStudents.js'

/**
 * @param {string | undefined} coachId
 * @param {string | undefined} qualityTitle
 */
export function useStudentsInSensitivePeriodForQuality(coachId, qualityTitle) {
  const [students, setStudents] = useState([])
  const [otherStudents, setOtherStudents] = useState([])
  const [loading, setLoading] = useState(Boolean(coachId && qualityTitle))
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(() => setRefreshKey((k) => k + 1), [])

  const patchStudent = useCallback((studentId, patch) => {
    const merge = (s) => (s.id === studentId ? { ...s, ...patch } : s)
    setStudents((prev) => prev.map(merge))
    setOtherStudents((prev) => prev.map(merge))
  }, [])

  const applyFromCache = useCallback(() => {
    if (!coachId || !qualityTitle) {
      setStudents([])
      setOtherStudents([])
      setLoading(false)
      setError('')
      return
    }
    if (getActiveCoachStudentsCoachId() !== coachId) return

    if (!isCoachStudentsCacheReady()) {
      setLoading(true)
      setError(getCoachStudentsCacheError())
      return
    }

    const all = getCoachStudentsCache()
    const sensitive = pickStudentsInSensitivePeriodForQuality(all, qualityTitle)
    const withAge = pickCoachStudentsWithAge(all)
    setStudents(sensitive)
    setOtherStudents(
      pickStudentsNotInIdList(
        withAge,
        sensitive.map((s) => s.id),
      ),
    )
    setLoading(false)
    setError(getCoachStudentsCacheError())
  }, [coachId, qualityTitle])

  useEffect(() => {
    if (!coachId || !qualityTitle) {
      setStudents([])
      setOtherStudents([])
      setLoading(false)
      setError('')
      return undefined
    }

    startCoachStudentsSync(coachId)
    applyFromCache()
    return subscribeCoachStudentsCache(applyFromCache)
  }, [coachId, qualityTitle, refreshKey, applyFromCache])

  return { students, otherStudents, loading, error, reload, patchStudent }
}
