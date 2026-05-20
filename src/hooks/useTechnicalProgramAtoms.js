import { useEffect, useState } from 'react'
import {
  getTechnicalProgramAtomsCache,
  subscribeTechnicalProgramAtomsCache,
} from '../data/technicalProgramAtomsCache.js'
import { loadTechnicalProgramAtomsOnce } from '../services/technicalProgramAtomsService.js'

export function useTechnicalProgramAtoms() {
  const [bundle, setBundle] = useState(() => getTechnicalProgramAtomsCache())

  useEffect(() => {
    let cancelled = false
    loadTechnicalProgramAtomsOnce().then(() => {
      if (!cancelled) setBundle(getTechnicalProgramAtomsCache())
    })
    const unsub = subscribeTechnicalProgramAtomsCache(() => {
      setBundle(getTechnicalProgramAtomsCache())
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return bundle
}
