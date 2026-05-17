/**
 * Упражнение для страницы качества. Медиа: GIF или WebM (одно на выбор UI).
 * @typedef {{
 *   id: string,
 *   title: string,
 *   intent: string,
 *   cues?: string,
 *   avoid?: string,
 *   minAge?: number,
 *   maxAge?: number,
 *   doseUnder12?: string,
 *   dose13to15?: string,
 *   dose16Plus?: string,
 *   media: { gifSrc: string | null; webmSrc: string | null },
 *   sortOrder?: number,
 * }} MotorQualityExercise
 */

/** @type {Record<string, MotorQualityExercise[]>} */
let cacheBySlug = {}

const cacheListeners = new Set()

/** @param {Record<string, MotorQualityExercise[]>} bySlug */
export function setMotorQualityExercisesCache(bySlug) {
  cacheBySlug = bySlug && typeof bySlug === 'object' ? bySlug : {}
  cacheListeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error('[motorQualityExercises] cache listener', e)
    }
  })
}

/** @param {() => void} listener */
export function subscribeMotorQualityExercisesCache(listener) {
  cacheListeners.add(listener)
  return () => cacheListeners.delete(listener)
}

/**
 * @param {string} slug
 * @returns {MotorQualityExercise[]}
 */
export function getMotorQualityExercisesBySlug(slug) {
  if (!slug || typeof slug !== 'string') return []
  return cacheBySlug[slug] ?? []
}
