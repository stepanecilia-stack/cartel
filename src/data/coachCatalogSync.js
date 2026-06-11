import { subscribeLegacyNorms } from '../services/legacyNormsService.js'
import { subscribeMotorQualityExercises } from '../services/motorQualityExercisesService.js'
import { subscribeTechnicalProgramAtoms } from '../services/technicalProgramAtomsService.js'

/** @type {(() => void)[]} */
let stopFns = []
let active = false

/** Realtime-подписки на каталоги — только при первом обращении, не при логине. */
export function ensureCoachCatalogSync() {
  if (active) return
  active = true
  stopFns = [
    subscribeLegacyNorms(),
    subscribeMotorQualityExercises(),
    subscribeTechnicalProgramAtoms(),
  ]
}

export function stopCoachCatalogSync() {
  for (const stop of stopFns) {
    try {
      stop()
    } catch {
      /* ignore */
    }
  }
  stopFns = []
  active = false
}
