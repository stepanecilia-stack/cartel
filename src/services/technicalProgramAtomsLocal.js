const STORAGE_KEY = 'cartel_technical_program_atoms_v1'

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

/** @returns {import('firebase/firestore').QueryDocumentSnapshot[]} */
export function loadLocalAtomDocs() {
  return readRaw().map((row) => ({
    id: row.atomId || row.id,
    data: () => row,
  }))
}

/** @param {object} record */
export function upsertLocalAtom(record) {
  const atomId = record.atomId
  if (!atomId) throw new Error('atomId обязателен')
  const list = readRaw()
  const idx = list.findIndex((r) => r.atomId === atomId)
  const row = { ...record, atomId, updatedAtLocal: Date.now() }
  if (idx >= 0) list[idx] = { ...list[idx], ...row }
  else list.push(row)
  writeRaw(list)
  return atomId
}
