const ROSTER_KEY = 'cartel_group_training_last_roster_v1'

/**
 * @param {string} coachId
 * @returns {string[]}
 */
export function getLastTrainingRoster(coachId) {
  if (!coachId) return []
  try {
    const raw = localStorage.getItem(ROSTER_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return []
    const ids = data[coachId]
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id) : []
  } catch {
    return []
  }
}

/**
 * @param {string} coachId
 * @param {Iterable<string>} selectedIds
 */
export function saveLastTrainingRoster(coachId, selectedIds) {
  if (!coachId) return
  try {
    const raw = localStorage.getItem(ROSTER_KEY)
    const data = raw ? JSON.parse(raw) : {}
    const store = data && typeof data === 'object' ? data : {}
    store[coachId] = [...new Set(selectedIds)]
    localStorage.setItem(ROSTER_KEY, JSON.stringify(store))
  } catch (err) {
    console.warn('groupTrainingPreferences: не удалось сохранить состав', err)
  }
}
