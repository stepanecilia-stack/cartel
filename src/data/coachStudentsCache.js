import { subscribeCoachStudents } from '../services/firebaseService.js'

/** @type {string | null} */
let activeCoachId = null
/** @type {Array<Record<string, unknown>>} */
let students = []
let ready = false
let loadError = ''
/** @type {(() => void) | null} */
let unsubFirestore = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      console.error('[coachStudentsCache] listener', e)
    }
  })
}

export function getCoachStudentsCache() {
  return students
}

export function getActiveCoachStudentsCoachId() {
  return activeCoachId
}

export function isCoachStudentsCacheReady() {
  return ready
}

export function getCoachStudentsCacheError() {
  return loadError
}

/** @param {() => void} listener */
export function subscribeCoachStudentsCache(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function stopCoachStudentsSync() {
  if (unsubFirestore) {
    unsubFirestore()
    unsubFirestore = null
  }
  activeCoachId = null
  students = []
  ready = false
  loadError = ''
  notify()
}

/**
 * Одна realtime-подписка на учеников тренера за сессию.
 * @param {string | undefined | null} coachId
 */
export function startCoachStudentsSync(coachId) {
  if (!coachId) {
    stopCoachStudentsSync()
    return
  }
  if (activeCoachId === coachId && unsubFirestore) return

  stopCoachStudentsSync()
  activeCoachId = coachId
  ready = false
  loadError = ''

  unsubFirestore = subscribeCoachStudents(
    coachId,
    (list) => {
      students = list
      ready = true
      loadError = ''
      notify()
    },
    (err) => {
      console.error('[coachStudentsCache]', err)
      students = []
      ready = true
      loadError = 'Не удалось подписаться на список учеников.'
      notify()
    },
  )
}

/**
 * Список учеников: из кэша подписки или разовый запрос (fallback).
 * @param {string} coachId
 */
export async function getCoachStudentsForCoach(coachId) {
  if (!coachId) return []
  if (activeCoachId === coachId && ready) {
    return [...students]
  }
  const { getCoachStudents } = await import('../services/firebaseService.js')
  return getCoachStudents(coachId)
}
