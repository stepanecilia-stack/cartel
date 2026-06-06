import {
  DEFAULT_TECHNICAL_LEVEL1,
  DEFAULT_TECHNICAL_LEVEL2,
} from '../data/technicalProgramAtomsDefaults.js'
import { REQUIRED_LEVEL3_COMBO_TEMPLATES } from '../data/requiredLevel3Combos.js'
import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { orderTechnicalAtomsForProgram } from './technicalProgramProgress.js'

/** Ур.1 в каноническом порядке (кэш Firestore или дефолт программы). */
export function resolveProgramLevel1Atoms(source) {
  const raw = source ?? getTechnicalProgramAtomsCache().level1
  const list = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_TECHNICAL_LEVEL1
  return orderTechnicalAtomsForProgram(list)
}

/** Ур.2 с медиа из Firestore или дефолт. */
export function resolveProgramLevel2Atoms(source) {
  const raw = source ?? getTechnicalProgramAtomsCache().level2
  return Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_TECHNICAL_LEVEL2
}

/** Ур.3 — обязательные комбо программы (медиа из Firestore). */
export function getDefaultTechnicalLevel3Atoms(level1Atoms) {
  const l1 = resolveProgramLevel1Atoms(level1Atoms)
  const byId = new Map()
  for (const a of l1) {
    if (a?.id) byId.set(a.id, a)
  }
  for (const a of resolveProgramLevel2Atoms()) {
    if (a?.id) byId.set(a.id, a)
  }
  return REQUIRED_LEVEL3_COMBO_TEMPLATES.map((t, index) => ({
    id: t.id,
    number: index + 1,
    name: t.name,
    kind: 'combo',
    techniqueTier: 3,
    steps: [...t.steps],
    chainPreview: (t.steps || [])
      .map((sid) => {
        const a = byId.get(sid)
        if (!a) return '?'
        if (a.number != null && String(a.number).trim() !== '') return `#${a.number}`
        return String(a.name || '').slice(0, 14)
      })
      .join(' → '),
    howTo: '',
    whyHowTo: '',
    mistakes: '',
    whyMistakes: '',
    videoLink: '',
    embedUrl: '',
    media: { posterSrc: null, webmSrc: null, detailPosterSrc: null, detailWebmSrc: null, detailEmbedUrl: null, detailVideoLink: null },
  }))
}

export function resolveProgramLevel3Atoms(source, level1Atoms) {
  const raw = source ?? getTechnicalProgramAtomsCache().level3
  if (Array.isArray(raw) && raw.length > 0) return raw
  return getDefaultTechnicalLevel3Atoms(level1Atoms)
}

/** @param {{ level1?: object[]; level2?: object[]; level3?: object[] } | null | undefined} [bundle] */
export function resolveProgramAtomsBundle(bundle) {
  const level1 = resolveProgramLevel1Atoms(bundle?.level1)
  const level2 = resolveProgramLevel2Atoms(bundle?.level2)
  const level3 = resolveProgramLevel3Atoms(bundle?.level3, bundle?.level1)
  return { level1, level2, level3, all: [...level1, ...level2, ...level3] }
}
