import { useEffect, useState } from 'react'
import { getCoachStudents } from '../services/firebaseService.js'
import { pickStudentsInSensitivePeriodForQuality } from '../utils/qualitySensitiveStudents.js'

/**
 * @param {string | undefined} coachId
 * @param {string | undefined} qualityTitle
 */
export function useStudentsInSensitivePeriodForQuality(coachId, qualityTitle) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(Boolean(coachId && qualityTitle))
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!coachId || !qualityTitle) {
        setStudents([])
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')
      try {
        const all = await getCoachStudents(coachId)
        if (cancelled) return
        setStudents(pickStudentsInSensitivePeriodForQuality(all, qualityTitle))
      } catch (err) {
        console.error('useStudentsInSensitivePeriodForQuality', err)
        if (!cancelled) {
          setStudents([])
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
  }, [coachId, qualityTitle])

  return { students, loading, error }
}
