const STORAGE_KEY = 'cartel_motor_quality_exercises_v1'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/**
 * @returns {import('firebase/firestore').QueryDocumentSnapshot[]}
 */
export function loadLocalExerciseDocs() {
  return readRaw().map((row) => ({
    id: row.id,
    data: () => row,
  }))
}

/** @param {object} record */
export function addLocalExercise(record) {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const list = readRaw()
  list.push({ id, ...record })
  writeRaw(list)
  return id
}

/** @param {string} id @param {object} patch */
export function updateLocalExercise(id, patch) {
  const list = readRaw()
  const idx = list.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Упражнение не найдено')
  list[idx] = { ...list[idx], ...patch, id }
  writeRaw(list)
}

/** @param {string} id */
export function deleteLocalExercise(id) {
  writeRaw(readRaw().filter((r) => r.id !== id))
}
