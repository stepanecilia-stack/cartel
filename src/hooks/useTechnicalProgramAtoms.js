import { useEffect, useMemo, useState } from 'react'
import {
  getTechnicalProgramAtomsCache,
  subscribeTechnicalProgramAtomsCache,
} from '../data/technicalProgramAtomsCache.js'
import { getTechnicalProgramAtomsSyncError } from '../services/technicalProgramAtomsService.js'
import { resolveProgramAtomsBundle } from '../utils/technicalProgramAtomsResolved.js'

export function useTechnicalProgramAtoms() {
  const [bundle, setBundle] = useState(() => getTechnicalProgramAtomsCache())
  const [syncError, setSyncError] = useState(() => getTechnicalProgramAtomsSyncError())

  const refresh = () => {
    setBundle(getTechnicalProgramAtomsCache())
    setSyncError(getTechnicalProgramAtomsSyncError())
  }

  useEffect(() => {
    let cancelled = false
    import('../data/coachCatalogSync.js').then(({ ensureCoachCatalogSync }) => {
      if (!cancelled) ensureCoachCatalogSync()
    })
    refresh()
    const unsub = subscribeTechnicalProgramAtomsCache(() => {
      if (!cancelled) refresh()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const resolved = useMemo(() => resolveProgramAtomsBundle(bundle), [bundle])

  return {
    level1: bundle.level1,
    level2: bundle.level2,
    level3: bundle.level3,
    tierCovers: bundle.tierCovers ?? { 1: null, 2: null, 3: null },
    orderedLevel1: resolved.level1,
    orderedLevel2: resolved.level2,
    orderedLevel3: resolved.level3,
    allProgramAtoms: resolved.all,
    syncError,
  }
}
