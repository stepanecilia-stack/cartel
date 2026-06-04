import { subscribeAllStudents, subscribeCoachStudents, getCoachStudents } from '../services/firebaseService.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'

/** @type {string | null} */
let activeCoachId = null
let viewAllStudentsMode = false
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

export function isCoachStudentsViewAllMode() {
  return viewAllStudentsMode
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
  viewAllStudentsMode = false
  students = []
  ready = false
  loadError = ''
  notify()
}

/**
 * Одна realtime-подписка на учеников за сессию (свои или вся база для админа).
 * @param {string | undefined | null} coachId
 * @param {{ viewAllStudents?: boolean }} [options]
 */
export function startCoachStudentsSync(coachId, options = {}) {
  if (!coachId) {
    stopCoachStudentsSync()
    return
  }
  const viewAll = Boolean(options.viewAllStudents)
  if (activeCoachId === coachId && unsubFirestore && viewAllStudentsMode === viewAll) return

  stopCoachStudentsSync()
  activeCoachId = coachId
  viewAllStudentsMode = viewAll
  ready = false
  loadError = ''

  const onList = (list) => {
    students = list
    ready = true
    loadError = ''
    notify()
  }
  const onErr = (err) => {
    console.error('[coachStudentsCache] subscribe failed', err)
    void (async () => {
      try {
        const list = viewAll ? [] : await getCoachStudents(coachId)
        if (list.length > 0) {
          students = list
          ready = true
          loadError = ''
          notify()
          return
        }
      } catch (fallbackErr) {
        console.error('[coachStudentsCache] fallback getCoachStudents', fallbackErr)
      }
      students = []
      ready = true
      loadError = viewAll
        ? formatFirestoreErrorMessage(err) || 'Не удалось загрузить всех учеников базы.'
        : formatFirestoreErrorMessage(err) ||
          'Не удалось загрузить список учеников. Опубликуйте правила Firestore (npm run deploy:firestore-rules).'
      notify()
    })()
  }

  unsubFirestore = viewAll
    ? subscribeAllStudents(onList, onErr)
    : subscribeCoachStudents(coachId, onList, onErr)
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
