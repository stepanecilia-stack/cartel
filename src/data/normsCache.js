import { loadLegacyNorms as fetchNormsFromNetwork } from '../utils/ksrUtils.js'

/** @type {object[] | null} */
let norms = null
/** @type {Promise<object[]> | null} */
let loadPromise = null
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

/** @param {() => void} listener */
export function subscribeNormsCache(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Одна загрузка CSV нормативов за сессию. */
export function loadNormsOnce() {
  if (norms) return Promise.resolve(norms)
  if (!loadPromise) {
    loadPromise = fetchNormsFromNetwork()
      .then((rows) => {
        norms = Array.isArray(rows) ? rows : []
        notify()
        return norms
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}
