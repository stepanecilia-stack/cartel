/** @type {object[] | null} */
let norms = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error('[normsCache] listener', e)
    }
  })
}

/** @returns {object[]} */
export function getNormsCache() {
  return norms ?? []
}

/** @param {object[]} rows */
export function setNormsCache(rows) {
  norms = Array.isArray(rows) ? rows : []
  notify()
}

/** @param {() => void} listener */
export function subscribeNormsCache(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export { loadNormsOnce } from '../services/legacyNormsService.js'
