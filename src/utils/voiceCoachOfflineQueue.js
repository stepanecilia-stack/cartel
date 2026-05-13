const STORAGE_KEY = 'cartel_voice_action_queue_v1'
const MAX = 80

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX)))
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {{ studentId: string, technicalData: Record<string, unknown>, createdAt: string }} item
 */
export function enqueueTechnicalPatch(item) {
  if (!item?.studentId || !item?.technicalData) return
  const q = readQueue()
  q.push({
    kind: 'technical_patch',
    studentId: item.studentId,
    technicalData: item.technicalData,
    createdAt: item.createdAt || new Date().toISOString(),
  })
  writeQueue(q)
}

export function getOfflineQueueLength() {
  return readQueue().length
}

export function peekOfflineQueue() {
  return readQueue()
}

/**
 * @param {(id: string, data: { technicalData: Record<string, unknown> }) => Promise<void>} updateStudentData
 * @returns {{ processed: number, remaining: number, lastError?: string }}
 */
export async function flushTechnicalPatchQueue(updateStudentData) {
  let items = readQueue()
  let processed = 0
  let lastError = ''
  const remaining = []

  for (const item of items) {
    if (item.kind !== 'technical_patch') continue
    try {
      await updateStudentData(item.studentId, { technicalData: item.technicalData })
      processed += 1
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      remaining.push(item)
    }
  }

  writeQueue(remaining)
  return { processed, remaining: remaining.length, lastError: lastError || undefined }
}
