import { useEffect, useState } from 'react'
import {
  getTechnicalProgramAtomsCache,
  subscribeTechnicalProgramAtomsCache,
} from '../data/technicalProgramAtomsCache.js'
import {
  getTechnicalProgramAtomsSyncError,
  loadTechnicalProgramAtomsOnce,
} from '../services/technicalProgramAtomsService.js'

export function useTechnicalProgramAtoms() {
  const [bundle, setBundle] = useState(() => getTechnicalProgramAtomsCache())
  const [syncError, setSyncError] = useState(() => getTechnicalProgramAtomsSyncError())

  const refresh = () => {
    setBundle(getTechnicalProgramAtomsCache())
    setSyncError(getTechnicalProgramAtomsSyncError())
  }

  useEffect(() => {
    let cancelled = false
    loadTechnicalProgramAtomsOnce().then(() => {
      if (!cancelled) refresh()
    })
    const unsub = subscribeTechnicalProgramAtomsCache(() => {
      if (!cancelled) refresh()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return { level1: bundle.level1, level2: bundle.level2, syncError }
}
