import { useCallback, useEffect, useState } from 'react'
import { getCoachStudents } from '../services/firebaseService.js'
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

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!coachId || !qualityTitle) {
        setStudents([])
        setOtherStudents([])
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')
      try {
        const all = await getCoachStudents(coachId)
        if (cancelled) return
        const sensitive = pickStudentsInSensitivePeriodForQuality(all, qualityTitle)
        const withAge = pickCoachStudentsWithAge(all)
        setStudents(sensitive)
        setOtherStudents(
          pickStudentsNotInIdList(
            withAge,
            sensitive.map((s) => s.id),
          ),
        )
      } catch (err) {
        console.error('useStudentsInSensitivePeriodForQuality', err)
        if (!cancelled) {
          setStudents([])
          setOtherStudents([])
          setError('Не удалось загрузить список спортсменов.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [coachId, qualityTitle, refreshKey])

  return { students, otherStudents, loading, error, reload, patchStudent }
}
